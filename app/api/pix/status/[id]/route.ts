import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpClient } from "@/lib/mercadopago/server";

export const dynamic = "force-dynamic";

/**
 * Consulta o status de um pagamento PIX no Mercado Pago.
 * Usada pela página /premium/pagar/[id] em polling — quando o status
 * vira "approved", a página redireciona para /premium/sucesso.
 *
 * Também sincroniza o status na tabela payments — útil caso o webhook
 * MP não chegue (rede instável, dev sem ngrok, etc).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: "payment id obrigatório" }, { status: 400 });
  }

  let mp;
  try {
    mp = getMpClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mercado Pago não configurado" },
      { status: 500 }
    );
  }

  try {
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id });

    const status = payment.status ?? "pending";
    const externalReference = payment.external_reference ?? "";
    const ownerId = externalReference.split(":")[0] ?? null;

    if (ownerId && ownerId !== user.id) {
      return NextResponse.json(
        { error: "Pagamento não pertence ao usuário" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const mappedStatus =
      status === "approved"
        ? "paid"
        : status === "rejected" || status === "cancelled"
        ? "failed"
        : status === "refunded"
        ? "refunded"
        : "pending";

    // Sincroniza payments.status caso o webhook nao tenha chegado.
    await admin
      .from("payments" as never)
      .update({
        mercadopago_status: status,
        status: mappedStatus,
        ...(status === "approved" ? { paid_at: new Date().toISOString() } : {}),
      } as never)
      .eq("mercadopago_payment_id" as never, String(payment.id));

    // DEFESA EM PROFUNDIDADE: se o status do MP virou "approved" mas o usuario
    // ainda nao foi marcado como Premium, concede aqui. Idempotente — chamar
    // varias vezes nao prejudica (grant_premium soma ao expires_at, mas como
    // checamos is_premium antes, so chama na primeira aprovacao).
    if (status === "approved") {
      const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
      const planId =
        (typeof metadata.plan_id === "string" && metadata.plan_id) ||
        externalReference.split(":")[1] ||
        null;

      let durationDays = Number(
        typeof metadata.duration_days === "number"
          ? metadata.duration_days
          : metadata.duration_days ?? NaN
      );

      if ((!Number.isFinite(durationDays) || durationDays <= 0) && planId) {
        const { data: planRow } = await admin
          .from("plans" as never)
          .select("duration_days")
          .eq("id" as never, planId)
          .single();
        const planTyped = planRow as unknown as { duration_days?: number } | null;
        if (planTyped?.duration_days && planTyped.duration_days > 0) {
          durationDays = planTyped.duration_days;
        }
      }

      if (planId && Number.isFinite(durationDays) && durationDays > 0) {
        const { data: profile } = await admin
          .from("profiles")
          .select("is_premium, premium_expires_at")
          .eq("id", user.id)
          .single();

        const alreadyHasActivePremium =
          profile?.is_premium &&
          profile.premium_expires_at &&
          new Date(profile.premium_expires_at) > new Date();

        // Checa se ja foi concedido para este payment especifico (evita
        // duplicar tempo caso o usuario abra a pagina varias vezes).
        const { data: paymentRow } = await admin
          .from("payments" as never)
          .select("paid_at")
          .eq("mercadopago_payment_id" as never, String(payment.id))
          .single();
        const paymentTyped = paymentRow as unknown as { paid_at?: string | null } | null;
        const grantedRecently =
          paymentTyped?.paid_at &&
          Date.now() - new Date(paymentTyped.paid_at).getTime() < 60_000;

        if (!alreadyHasActivePremium || !grantedRecently) {
          const { error: grantErr } = await admin.rpc("grant_premium" as never, {
            p_user_id: user.id,
            p_duration_days: durationDays,
          } as never);
          if (grantErr) {
            console.error("[pix/status] grant_premium falhou:", grantErr);
          }
        }
      }
    }

    return NextResponse.json({
      payment_id: String(payment.id),
      status,
      is_paid: status === "approved",
      is_pending: status === "pending" || status === "in_process",
      is_failed: status === "rejected" || status === "cancelled",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao consultar pagamento";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

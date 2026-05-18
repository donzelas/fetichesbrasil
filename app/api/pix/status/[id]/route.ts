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

    // Mantém o status local sincronizado caso o webhook tenha atrasado.
    const admin = createAdminClient();
    const mappedStatus =
      status === "approved"
        ? "paid"
        : status === "rejected" || status === "cancelled"
        ? "failed"
        : status === "refunded"
        ? "refunded"
        : "pending";

    await admin
      .from("payments" as never)
      .update({
        mercadopago_status: status,
        status: mappedStatus,
      } as never)
      .eq("mercadopago_payment_id" as never, String(payment.id));

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

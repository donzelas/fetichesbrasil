import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpClient, MP_WEBHOOK_SECRET } from "@/lib/mercadopago/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MpWebhookBody {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
  user_id?: string | number;
  api_version?: string;
  date_created?: string;
  live_mode?: boolean;
}

/**
 * Valida a assinatura `x-signature` enviada pelo Mercado Pago.
 * Formato: "ts=<timestamp>,v1=<hash>"
 * Hash: HMAC-SHA256 do template "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * com a chave secreta configurada em MP_WEBHOOK_SECRET.
 *
 * Se MP_WEBHOOK_SECRET não estiver setada, validação é pulada (modo dev).
 */
function verifySignature(request: Request, dataId: string | null): boolean {
  if (!MP_WEBHOOK_SECRET) return true;
  const sig = request.headers.get("x-signature");
  const reqId = request.headers.get("x-request-id") ?? "";
  if (!sig) return false;

  const parts = Object.fromEntries(
    sig.split(",").map((kv) => {
      const [k, ...rest] = kv.split("=");
      return [k.trim(), rest.join("=").trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const template = `id:${dataId ?? ""};request-id:${reqId};ts:${ts};`;
  const expected = createHmac("sha256", MP_WEBHOOK_SECRET)
    .update(template)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function grantPremium(
  userId: string,
  planId: string,
  durationDays: number,
  paymentInfo: {
    mercadopago_preference_id?: string | null;
    mercadopago_payment_id?: string | null;
    mercadopago_status?: string | null;
  }
) {
  const admin = createAdminClient();

  let updated = false;

  if (paymentInfo.mercadopago_preference_id) {
    const { data } = await admin
      .from("payments" as never)
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + durationDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        mercadopago_payment_id: paymentInfo.mercadopago_payment_id ?? null,
        mercadopago_status: paymentInfo.mercadopago_status ?? null,
      } as never)
      .eq("mercadopago_preference_id" as never, paymentInfo.mercadopago_preference_id)
      .select("id")
      .maybeSingle();
    updated = !!data;
  }

  if (!updated) {
    const { data: planRaw } = await admin
      .from("plans" as never)
      .select("price_cents")
      .eq("id" as never, planId)
      .single();
    const plan = planRaw as unknown as { price_cents: number } | null;

    await admin.from("payments" as never).insert({
      user_id: userId,
      plan_id: planId,
      amount_cents: plan?.price_cents ?? 0,
      payment_method: "pix",
      status: "paid",
      mercadopago_preference_id: paymentInfo.mercadopago_preference_id ?? null,
      mercadopago_payment_id: paymentInfo.mercadopago_payment_id ?? null,
      mercadopago_status: paymentInfo.mercadopago_status ?? null,
      paid_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000
      ).toISOString(),
    } as never);
  }

  await admin.rpc("grant_premium", {
    p_user_id: userId,
    p_duration_days: durationDays,
  });
}

export async function POST(request: Request) {
  let rawBody: MpWebhookBody = {};
  try {
    rawBody = (await request.json()) as MpWebhookBody;
  } catch {
    rawBody = {};
  }

  const url = new URL(request.url);
  const queryType = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const queryId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  const eventType = rawBody.type ?? queryType ?? "";
  const dataId =
    rawBody.data?.id != null
      ? String(rawBody.data.id)
      : queryId
      ? String(queryId)
      : null;

  if (!verifySignature(request, dataId)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // Só nos importam notificações de pagamento. As de merchant_order, plan,
  // subscription etc. são ignoradas sem ruído.
  if (eventType !== "payment" || !dataId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const mp = getMpClient();
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: dataId });

    const status = payment.status ?? null;
    const preferenceId =
      // o campo retornado costuma ser `preference_id` em alguns endpoints, mas
      // o SDK retorna apenas o `additional_info` / metadata. Usamos external_reference
      // e metadata como fonte de verdade.
      (payment as { preference_id?: string }).preference_id ?? null;
    const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
    const externalReference = payment.external_reference ?? null;

    const userId =
      (typeof metadata.user_id === "string" && metadata.user_id) ||
      externalReference?.split(":")[0] ||
      null;
    const planId =
      (typeof metadata.plan_id === "string" && metadata.plan_id) ||
      externalReference?.split(":")[1] ||
      null;

    let durationDays = Number(
      typeof metadata.duration_days === "number"
        ? metadata.duration_days
        : metadata.duration_days ?? NaN
    );

    // Fallback: o Mercado Pago nem sempre propaga metadata da Preference
    // para o Payment. Quando duration_days vier ausente, buscamos da tabela
    // plans usando o planId obtido do metadata OU do external_reference.
    if ((!Number.isFinite(durationDays) || durationDays <= 0) && planId) {
      const adminLookup = createAdminClient();
      const { data: planRow } = await adminLookup
        .from("plans" as never)
        .select("duration_days")
        .eq("id" as never, planId)
        .single();
      const planTyped = planRow as unknown as { duration_days?: number } | null;
      if (planTyped?.duration_days && planTyped.duration_days > 0) {
        durationDays = planTyped.duration_days;
      }
    }

    if (!userId || !planId || !Number.isFinite(durationDays) || durationDays <= 0) {
      // Sem como creditar — registramos só status no payments correspondente.
      if (preferenceId) {
        const admin = createAdminClient();
        await admin
          .from("payments" as never)
          .update({
            mercadopago_payment_id: String(payment.id),
            mercadopago_status: status,
            status: status === "approved" ? "paid" : "pending",
          } as never)
          .eq("mercadopago_preference_id" as never, preferenceId);
      }
      return NextResponse.json({ received: true, partial: true });
    }

    if (status === "approved") {
      await grantPremium(userId, planId, durationDays, {
        mercadopago_preference_id: preferenceId,
        mercadopago_payment_id: String(payment.id),
        mercadopago_status: status,
      });
    } else if (status === "rejected" || status === "cancelled") {
      const admin = createAdminClient();
      if (preferenceId) {
        await admin
          .from("payments" as never)
          .update({
            status: "failed",
            mercadopago_payment_id: String(payment.id),
            mercadopago_status: status,
          } as never)
          .eq("mercadopago_preference_id" as never, preferenceId);
      }
    } else {
      // pending, in_process, refunded, charged_back, authorized
      const admin = createAdminClient();
      if (preferenceId) {
        await admin
          .from("payments" as never)
          .update({
            mercadopago_payment_id: String(payment.id),
            mercadopago_status: status,
            status: status === "refunded" ? "refunded" : "pending",
          } as never)
          .eq("mercadopago_preference_id" as never, preferenceId);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro processando webhook";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// GET é usado pelo MP em alguns fluxos de teste — responder 200.
export async function GET() {
  return NextResponse.json({ ok: true });
}

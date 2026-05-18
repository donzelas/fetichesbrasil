import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpClient, webhookUrl } from "@/lib/mercadopago/server";

export const dynamic = "force-dynamic";

interface CreatePixBody {
  plan_id: string;
}

/**
 * Cria um pagamento PIX direto via /v1/payments (sem Checkout Pro).
 * Retorna o QR Code base64 e o codigo copia-e-cola pra renderizar na
 * propria pagina, sem precisar de login no Mercado Pago.
 *
 * REQUISITO: a conta MP do vendedor (dono do MP_ACCESS_TOKEN) precisa
 * ter ao menos uma chave PIX cadastrada em https://www.mercadopago.com.br/my/pix.
 * Sem isso, MP retorna 400 com error 13253 ("Collector user without
 * key enabled for QR render").
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login pra assinar" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Conta sem email — necessário para gerar o PIX." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as Partial<CreatePixBody>;
  if (!body.plan_id) {
    return NextResponse.json({ error: "plan_id obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: planRaw, error: planErr } = await admin
    .from("plans" as never)
    .select("*")
    .eq("id" as never, body.plan_id)
    .eq("is_active" as never, true)
    .single();
  if (planErr || !planRaw) {
    return NextResponse.json({ error: "Plano não encontrado ou inativo" }, { status: 404 });
  }
  const plan = planRaw as unknown as {
    id: string;
    title: string;
    description: string | null;
    price_cents: number;
    duration_days: number;
  };

  let mp;
  try {
    mp = getMpClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mercado Pago não configurado" },
      { status: 500 }
    );
  }

  const amount = Math.round(plan.price_cents) / 100;
  const externalReference = `${user.id}:${plan.id}:${Date.now()}`;

  // PIX expira em 30 minutos por padrão. Aceitamos isso.
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  try {
    const paymentClient = new Payment(mp);
    const created = await paymentClient.create({
      body: {
        transaction_amount: amount,
        description:
          plan.description ?? `Premium ${plan.duration_days} dia(s) — Fetiches Brasil`,
        payment_method_id: "pix",
        external_reference: externalReference,
        notification_url: webhookUrl(),
        date_of_expiration: expiresAt,
        statement_descriptor: "FETICHESBR",
        payer: {
          email: user.email,
        },
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          duration_days: plan.duration_days,
        },
      },
      requestOptions: {
        idempotencyKey: externalReference,
      },
    });

    const paymentId = created.id;
    const status = created.status ?? "pending";
    const poi = created.point_of_interaction?.transaction_data;
    const qrCode = poi?.qr_code ?? null;
    const qrCodeBase64 = poi?.qr_code_base64 ?? null;
    const ticketUrl = poi?.ticket_url ?? null;

    if (!paymentId || !qrCode || !qrCodeBase64) {
      console.error("[pix/create] resposta MP sem QR code:", created);
      return NextResponse.json(
        {
          error: "MP não retornou QR Code",
          status,
          raw: JSON.parse(JSON.stringify(created)),
        },
        { status: 502 }
      );
    }

    const { error: insertErr } = await admin
      .from("payments" as never)
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_cents: plan.price_cents,
        payment_method: "pix",
        status: "pending",
        mercadopago_payment_id: String(paymentId),
        mercadopago_status: status,
      } as never);

    if (insertErr) {
      console.error("[pix/create] insert payments falhou:", insertErr);
      return NextResponse.json(
        {
          error: "Falha ao registrar pagamento",
          details: insertErr.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      payment_id: String(paymentId),
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: ticketUrl,
      amount_cents: plan.price_cents,
      expires_at: expiresAt,
      plan_title: plan.title,
      duration_days: plan.duration_days,
    });
  } catch (e: unknown) {
    console.error("[pix/create] MP payment.create falhou:", e);

    const err = e as {
      message?: string;
      status?: number;
      cause?: Array<{ code?: string | number; description?: string }> | unknown;
      error?: string;
    };

    const message =
      err?.message ??
      err?.error ??
      (e instanceof Error ? e.message : "Erro ao criar PIX");

    const cause = Array.isArray(err?.cause)
      ? err.cause
          .map((c) => `${c.code ?? ""}: ${c.description ?? ""}`.trim())
          .filter(Boolean)
          .join(" | ")
      : null;

    // Mensagem amigavel pro erro mais comum (sem chave PIX cadastrada).
    let friendly = message;
    if (typeof message === "string" && message.includes("without key enabled")) {
      friendly =
        "A conta do vendedor não tem chave PIX cadastrada no Mercado Pago. Cadastre em https://www.mercadopago.com.br/my/pix";
    }

    return NextResponse.json(
      {
        error: friendly,
        cause,
        status: err?.status ?? null,
        raw: typeof e === "object" ? JSON.parse(JSON.stringify(e)) : String(e),
      },
      { status: 502 }
    );
  }
}

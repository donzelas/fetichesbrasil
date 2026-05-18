import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, getMpClient, webhookUrl } from "@/lib/mercadopago/server";

interface CheckoutBody {
  plan_id: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login pra assinar" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CheckoutBody>;
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

  const baseUrl = appUrl();
  const successUrl = `${baseUrl}/premium/sucesso`;
  const failureUrl = `${baseUrl}/premium?cancelado=1`;
  const pendingUrl = `${baseUrl}/premium/sucesso?pendente=1`;

  const amount = Math.round(plan.price_cents) / 100;
  const externalReference = `${user.id}:${plan.id}:${Date.now()}`;

  try {
    const preference = new Preference(mp);
    const created = await preference.create({
      body: {
        items: [
          {
            id: plan.id,
            title: plan.title,
            description:
              plan.description ?? `Premium ${plan.duration_days} dia(s) — Fetiches Brasil`,
            quantity: 1,
            unit_price: amount,
            currency_id: "BRL",
            category_id: "services",
          },
        ],
        payer: user.email ? { email: user.email } : undefined,
        // PIX-only: restringe as formas de pagamento do Checkout Pro
        payment_methods: {
          excluded_payment_types: [
            { id: "credit_card" },
            { id: "debit_card" },
            { id: "ticket" },
            { id: "atm" },
            { id: "bank_transfer" },
            { id: "prepaid_card" },
            { id: "digital_currency" },
          ],
          default_payment_method_id: "pix",
          installments: 1,
        },
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        auto_return: "approved",
        notification_url: webhookUrl(),
        external_reference: externalReference,
        statement_descriptor: "FETICHESBR",
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          duration_days: plan.duration_days,
        },
      },
    });

    const preferenceId = created.id;
    const initPoint = created.init_point ?? created.sandbox_init_point;

    if (!preferenceId || !initPoint) {
      return NextResponse.json(
        { error: "Falha ao gerar preferência Mercado Pago" },
        { status: 502 }
      );
    }

    await admin.from("payments" as never).insert({
      user_id: user.id,
      plan_id: plan.id,
      amount_cents: plan.price_cents,
      payment_method: "pix",
      status: "pending",
      mercadopago_preference_id: preferenceId,
    } as never);

    return NextResponse.json({ url: initPoint, preference_id: preferenceId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar checkout";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, getStripe } from "@/lib/stripe/server";

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
  const { data: plan, error: planErr } = await admin
    .from("plans")
    .select("*")
    .eq("id", body.plan_id)
    .eq("is_active", true)
    .single();
  if (planErr || !plan) {
    return NextResponse.json({ error: "Plano não encontrado ou inativo" }, { status: 404 });
  }
  if (!plan.stripe_price_id) {
    return NextResponse.json(
      { error: "Plano sem preço configurado no Stripe. Recadastre." },
      { status: 500 }
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe não configurado" },
      { status: 500 }
    );
  }

  const successUrl = `${appUrl()}/premium/sucesso?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl()}/premium?cancelado=1`;

  try {
    const isSubscription = plan.payment_method === "credit_card";
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer_email: user.email ?? undefined,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      // Sem `payment_method_types`: o Stripe usa os métodos ATIVADOS na conta
      // (https://dashboard.stripe.com/settings/payment_methods). Pra Pix funcionar,
      // ative-o no dashboard. Pra cartão, "card" já vem ligado por padrão.
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        duration_days: String(plan.duration_days),
        payment_method: plan.payment_method,
      },
      subscription_data: isSubscription
        ? {
            metadata: {
              user_id: user.id,
              plan_id: plan.id,
              duration_days: String(plan.duration_days),
            },
          }
        : undefined,
      payment_intent_data: !isSubscription
        ? {
            metadata: {
              user_id: user.id,
              plan_id: plan.id,
              duration_days: String(plan.duration_days),
            },
          }
        : undefined,
    });

    await admin.from("payments").insert({
      user_id: user.id,
      plan_id: plan.id,
      amount_cents: plan.price_cents,
      payment_method: plan.payment_method,
      status: "pending",
      stripe_session_id: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar checkout";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

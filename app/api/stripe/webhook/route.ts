import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function grantPremium(
  userId: string,
  planId: string,
  durationDays: number,
  paymentInfo: {
    stripe_session_id?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_subscription_id?: string | null;
  }
) {
  const admin = createAdminClient();

  // Atualiza payment se já existir; senão cria.
  let updated = false;
  if (paymentInfo.stripe_session_id) {
    const { data } = await admin
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + durationDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        stripe_payment_intent_id: paymentInfo.stripe_payment_intent_id ?? null,
        stripe_subscription_id: paymentInfo.stripe_subscription_id ?? null,
      })
      .eq("stripe_session_id", paymentInfo.stripe_session_id)
      .select("id")
      .maybeSingle();
    updated = !!data;
  }

  if (!updated) {
    const { data: plan } = await admin
      .from("plans")
      .select("price_cents, payment_method")
      .eq("id", planId)
      .single();

    await admin.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      amount_cents: plan?.price_cents ?? 0,
      payment_method: plan?.payment_method ?? "credit_card",
      status: "paid",
      stripe_session_id: paymentInfo.stripe_session_id ?? null,
      stripe_payment_intent_id: paymentInfo.stripe_payment_intent_id ?? null,
      stripe_subscription_id: paymentInfo.stripe_subscription_id ?? null,
      paid_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  await admin.rpc("grant_premium", {
    p_user_id: userId,
    p_duration_days: durationDays,
  });
}

export async function POST(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado" },
      { status: 500 }
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Sem assinatura" }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Assinatura inválida";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        const userId = meta.user_id;
        const planId = meta.plan_id;
        const durationDays = Number(meta.duration_days);

        if (!userId || !planId || !Number.isFinite(durationDays)) break;

        // Pagamento único (pix ou one-time): payment_status === 'paid'
        // Subscription: status async, mas geralmente já vem 'paid' aqui se cartão aprovou
        if (
          session.payment_status === "paid" ||
          session.mode === "subscription"
        ) {
          await grantPremium(userId, planId, durationDays, {
            stripe_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const meta = sub.metadata ?? {};
        const userId = meta.user_id;
        const planId = meta.plan_id;
        const durationDays = Number(meta.duration_days);
        if (!userId || !planId || !Number.isFinite(durationDays)) break;

        await grantPremium(userId, planId, durationDays, {
          stripe_subscription_id: subscriptionId,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        const admin = createAdminClient();
        await admin
          .from("profiles")
          .update({
            is_premium: false,
            premium_expires_at: null,
            premium_since: null,
          })
          .eq("id", userId);
        await admin
          .from("payments")
          .update({ status: "expired" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const admin = createAdminClient();
        await admin
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro processando webhook";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

interface CreatePlanBody {
  title: string;
  description?: string | null;
  price_cents: number;
  payment_method: "pix" | "credit_card";
  duration_days: number;
  is_active?: boolean;
  sort_order?: number;
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", status: 401 as const };
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return { error: "Sem permissão", status: 403 as const };
  return { user };
}

export async function GET() {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as Partial<CreatePlanBody>;

  const title = (body.title ?? "").trim();
  const price_cents = Number(body.price_cents);
  const payment_method = body.payment_method;
  const duration_days = Number(body.duration_days);

  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  if (!Number.isFinite(price_cents) || price_cents < 0) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }
  if (payment_method !== "pix" && payment_method !== "credit_card") {
    return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
  }
  if (!Number.isFinite(duration_days) || duration_days <= 0) {
    return NextResponse.json({ error: "Dias de duração inválidos" }, { status: 400 });
  }

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  try {
    const stripe = getStripe();
    const product = await stripe.products.create({
      name: title,
      description: body.description ?? undefined,
      metadata: {
        payment_method,
        duration_days: String(duration_days),
      },
    });
    stripeProductId = product.id;

    if (payment_method === "credit_card") {
      const price = await stripe.prices.create({
        product: product.id,
        currency: "brl",
        unit_amount: price_cents,
        recurring: { interval: "day", interval_count: duration_days },
      });
      stripePriceId = price.id;
    } else {
      const price = await stripe.prices.create({
        product: product.id,
        currency: "brl",
        unit_amount: price_cents,
      });
      stripePriceId = price.id;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro Stripe";
    return NextResponse.json({ error: `Stripe: ${msg}` }, { status: 502 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans")
    .insert({
      title,
      description: body.description ?? null,
      price_cents,
      payment_method,
      duration_days,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plan: data }, { status: 201 });
}

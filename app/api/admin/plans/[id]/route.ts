import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    is_active?: boolean;
    sort_order?: number;
    price_cents?: number;
    payment_method?: "pix" | "credit_card";
    duration_days?: number;
  };

  const admin = createAdminClient();
  const { data: existing, error: fetchErr } = await admin
    .from("plans")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (typeof body.sort_order === "number") update.sort_order = body.sort_order;

  const newPrice =
    typeof body.price_cents === "number" && Number.isFinite(body.price_cents)
      ? Math.round(body.price_cents)
      : existing.price_cents;
  const newMethod = body.payment_method ?? existing.payment_method;
  const newDuration =
    typeof body.duration_days === "number" && Number.isFinite(body.duration_days)
      ? Math.round(body.duration_days)
      : existing.duration_days;

  if (newPrice < 0) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }
  if (newMethod !== "pix" && newMethod !== "credit_card") {
    return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
  }
  if (newDuration <= 0) {
    return NextResponse.json({ error: "Dias de duração inválidos" }, { status: 400 });
  }

  const priceChanged = newPrice !== existing.price_cents;
  const methodChanged = newMethod !== existing.payment_method;
  const durationChanged = newDuration !== existing.duration_days;
  const needsNewStripePrice = priceChanged || methodChanged || durationChanged;

  if (needsNewStripePrice) {
    try {
      const stripe = getStripe();

      // Desativa o Price antigo (Stripe não permite deletar Price com histórico)
      if (existing.stripe_price_id) {
        try {
          await stripe.prices.update(existing.stripe_price_id, { active: false });
        } catch {
          // ignora — pode já estar inativo
        }
      }

      // Se mudou a forma de pagamento, criamos um Product novo (mais limpo —
      // Pix one-time x Subscription recorrente são modelos bem diferentes).
      let productId = existing.stripe_product_id;
      const newTitle =
        typeof body.title === "string" ? body.title.trim() : existing.title;
      const newDescription =
        body.description !== undefined ? body.description : existing.description;

      if (methodChanged || !productId) {
        if (productId) {
          try {
            await stripe.products.update(productId, { active: false });
          } catch {
            // ignora
          }
        }
        const product = await stripe.products.create({
          name: newTitle,
          description: newDescription ?? undefined,
          metadata: {
            payment_method: newMethod,
            duration_days: String(newDuration),
          },
        });
        productId = product.id;
      } else {
        // Mesmo Product: só atualiza nome/desc/metadata
        try {
          await stripe.products.update(productId, {
            name: newTitle,
            description: newDescription ?? undefined,
            metadata: {
              payment_method: newMethod,
              duration_days: String(newDuration),
            },
          });
        } catch {
          // ignora
        }
      }

      // Cria Price novo
      const newStripePrice =
        newMethod === "credit_card"
          ? await stripe.prices.create({
              product: productId,
              currency: "brl",
              unit_amount: newPrice,
              recurring: { interval: "day", interval_count: newDuration },
            })
          : await stripe.prices.create({
              product: productId,
              currency: "brl",
              unit_amount: newPrice,
            });

      update.price_cents = newPrice;
      update.payment_method = newMethod;
      update.duration_days = newDuration;
      update.stripe_product_id = productId;
      update.stripe_price_id = newStripePrice.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro Stripe";
      return NextResponse.json({ error: `Stripe: ${msg}` }, { status: 502 });
    }
  }

  // Sincroniza ativo/desativo do Product no Stripe quando só mudou esse campo
  if (
    !needsNewStripePrice &&
    typeof body.is_active === "boolean" &&
    existing.stripe_product_id
  ) {
    try {
      const stripe = getStripe();
      await stripe.products.update(existing.stripe_product_id, {
        active: body.is_active,
      });
    } catch {
      // ignora
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("plans")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plan: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("plans")
    .select("stripe_product_id")
    .eq("id", id)
    .single();

  // Soft-disable no Stripe (não dá pra deletar product com price ativo facilmente)
  if (existing?.stripe_product_id) {
    try {
      const stripe = getStripe();
      await stripe.products.update(existing.stripe_product_id, { active: false });
    } catch {
      // ignora
    }
  }

  const { error } = await admin.from("plans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

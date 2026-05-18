import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CreatePlanBody {
  title: string;
  description?: string | null;
  price_cents: number;
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
    .from("plans" as never)
    .select("*")
    .order("sort_order" as never, { ascending: true })
    .order("created_at" as never, { ascending: false });
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
  const duration_days = Number(body.duration_days);

  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  if (!Number.isFinite(price_cents) || price_cents < 0) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }
  if (!Number.isFinite(duration_days) || duration_days <= 0) {
    return NextResponse.json({ error: "Dias de duração inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans" as never)
    .insert({
      title,
      description: body.description ?? null,
      price_cents,
      payment_method: "pix",
      duration_days,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    } as never)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plan: data }, { status: 201 });
}

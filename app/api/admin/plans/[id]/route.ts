import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    duration_days?: number;
  };

  const admin = createAdminClient();
  const { data: existing, error: fetchErr } = await admin
    .from("plans" as never)
    .select("*")
    .eq("id" as never, id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (typeof body.sort_order === "number") update.sort_order = body.sort_order;

  if (typeof body.price_cents === "number" && Number.isFinite(body.price_cents)) {
    const newPrice = Math.round(body.price_cents);
    if (newPrice < 0) {
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
    }
    update.price_cents = newPrice;
  }

  if (typeof body.duration_days === "number" && Number.isFinite(body.duration_days)) {
    const newDuration = Math.round(body.duration_days);
    if (newDuration <= 0) {
      return NextResponse.json({ error: "Dias de duração inválidos" }, { status: 400 });
    }
    update.duration_days = newDuration;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("plans" as never)
    .update(update as never)
    .eq("id" as never, id)
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
  const { error } = await admin
    .from("plans" as never)
    .delete()
    .eq("id" as never, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

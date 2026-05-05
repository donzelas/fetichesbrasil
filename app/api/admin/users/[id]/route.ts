import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = (await request.json()) as { is_premium?: boolean; is_admin?: boolean };
  const update: {
    is_premium?: boolean;
    premium_since?: string | null;
    is_admin?: boolean;
  } = {};
  if (typeof body.is_premium === "boolean") {
    update.is_premium = body.is_premium;
    update.premium_since = body.is_premium ? new Date().toISOString() : null;
  }
  if (typeof body.is_admin === "boolean") {
    update.is_admin = body.is_admin;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

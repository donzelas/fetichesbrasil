import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "fb_admin_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias

/**
 * Gerencia um cookie persistente que indica "este usuario e admin
 * e quer manter sessao". Quando esse cookie existe, server.ts deixa
 * os cookies de auth do Supabase persistentes (nao vira session cookie).
 *
 * POST: confirma que e admin e seta o cookie
 * DELETE: limpa o cookie (no logout)
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Apenas admins" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "1", {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

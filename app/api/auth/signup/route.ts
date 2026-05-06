import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, password, username } = body;

  if (!email || !password || !username) {
    return NextResponse.json(
      { error: "email, password e username são obrigatórios" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 6 caracteres" },
      { status: 400 }
    );
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json(
      { error: "Username inválido (3-24 caracteres alfanuméricos ou _)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: username },
  });

  if (error) {
    const status = /already|registered|exists/i.test(error.message) ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true, userId: data.user?.id });
}

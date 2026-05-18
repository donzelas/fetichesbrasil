import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Revoga Premium dos usuários cujo premium_expires_at já passou.
 * Idempotente — pode ser chamada várias vezes sem efeito colateral.
 *
 * Em produção, é normalmente acionada por:
 *   - pg_cron rodando dentro do Supabase (ver migration 0018), OU
 *   - Netlify Scheduled Function (ver netlify/functions/expire-premiums.mts).
 *
 * Autenticação: header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor" },
      { status: 500 }
    );
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("expire_premiums" as never);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Falha ao expirar premiums" },
      { status: 500 }
    );
  }

  const revoked = typeof data === "number" ? data : 0;
  return NextResponse.json({
    ok: true,
    revoked,
    timestamp: new Date().toISOString(),
  });
}

// Aceita POST também para flexibilidade com agendadores que não suportam GET.
export const POST = GET;

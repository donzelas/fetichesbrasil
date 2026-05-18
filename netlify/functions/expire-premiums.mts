import type { Config } from "@netlify/functions";

/**
 * Netlify Scheduled Function — roda a cada hora.
 *
 * Dispara /api/cron/expire-premiums no próprio site, que chama a função
 * SQL public.expire_premiums() (revoga Premium dos usuários cujo
 * premium_expires_at já passou).
 *
 * Vars de ambiente necessárias no painel Netlify:
 *   - URL              (automática — URL pública do deploy)
 *   - CRON_SECRET      (mesmo valor de .env.local; protege a rota)
 *
 * Importante: a função SQL também pode estar agendada via pg_cron dentro
 * do Supabase (ver migration 0018). Rodar as duas é idempotente — quem
 * chegar primeiro só atualiza linhas que ainda não estão expiradas; a
 * segunda execução simplesmente não acha nada pra atualizar.
 */
export default async () => {
  const baseUrl =
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET ausente nas vars do Netlify" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = `${baseUrl}/api/cron/expire-premiums`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text();
  return new Response(
    JSON.stringify({
      ok: res.ok,
      status: res.status,
      body: text.slice(0, 500),
      at: new Date().toISOString(),
    }),
    {
      status: res.ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const config: Config = {
  schedule: "@hourly",
};

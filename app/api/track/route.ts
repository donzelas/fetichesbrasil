import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseUserAgent } from "@/lib/analytics/parse-ua";
import { getClientIp, getGeo, hashIp } from "@/lib/analytics/hash-ip";

/**
 * Endpoint de tracking de page views.
 *
 * - Aceita anon ou authenticated
 * - Hash de IP (LGPD: nao armazena IP raw)
 * - Geo via headers Netlify/Cloudflare/Vercel
 * - Ignora rotas admin (admin nao polui propria analytics)
 * - Best-effort: nunca falha pro client mesmo se DB der erro
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      path?: string;
      full_url?: string;
      referrer?: string;
      session_id?: string;
    };

    if (!body.path || typeof body.path !== "string" || body.path.length > 500) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // NAO trackeia rotas admin
    if (body.path.startsWith("/admin") || body.path.startsWith("/api")) {
      return NextResponse.json({ ok: true, skipped: "admin" });
    }

    const headers = request.headers;
    const ua = headers.get("user-agent");
    const parsed = parseUserAgent(ua);

    // Identifica usuario logado (se houver)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      isAdmin = !!profile?.is_admin;
    }

    // Nao salva views de admin (nao polui dashboard)
    if (isAdmin) {
      return NextResponse.json({ ok: true, skipped: "admin_user" });
    }

    const ip = getClientIp(headers);
    const geo = getGeo(headers);

    // Insert via admin client (bypass RLS - sabemos que e seguro)
    const admin = createAdminClient();
    await admin.from("page_views").insert({
      path: body.path,
      full_url: body.full_url ?? null,
      referrer: body.referrer ?? null,
      user_agent: ua?.slice(0, 500) ?? null,
      ip_hash: hashIp(ip),
      country: geo.country,
      region: geo.region,
      city: geo.city,
      device_type: parsed.device_type,
      browser: parsed.browser,
      os: parsed.os,
      user_id: user?.id ?? null,
      session_id: body.session_id?.slice(0, 64) ?? null,
      is_authenticated: !!user,
      is_admin_view: false,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Nunca falha pro client - tracking nao deve quebrar a app
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

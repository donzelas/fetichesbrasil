import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseUserAgent } from "@/lib/analytics/parse-ua";
import { getClientIp, getGeo, hashIp } from "@/lib/analytics/hash-ip";

/**
 * Tracking de cliques em CTAs de ebook + redirect com UTM.
 *
 * Fluxo:
 *   1. Click em /go/ebook/cuckold-5-passos?src=banner
 *   2. Resolve slug -> ebook (busca checkout_url no banco)
 *   3. Registra page_view com path = /go/ebook/<slug>?src=<src>
 *   4. Redirect 302 pro checkout com UTM tags
 *
 * Aparece em /admin/analytics no Top paginas, da pra ver
 * quantos clicaram em cada CTA antes de ir pro Hotmart.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "direct";

  const admin = createAdminClient();
  const { data: ebook } = await admin
    .from("ebooks")
    .select("checkout_url, title")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!ebook?.checkout_url) {
    return NextResponse.redirect(new URL("/ebooks", request.url), 302);
  }

  // Best-effort tracking (nao bloqueia o redirect se falhar)
  try {
    const headers = request.headers;
    const ua = headers.get("user-agent");
    const parsed = parseUserAgent(ua);
    const ip = getClientIp(headers);
    const geo = getGeo(headers);

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

    if (!isAdmin) {
      await admin.from("page_views").insert({
        path: `/go/ebook/${slug}`,
        full_url: `/go/ebook/${slug}?src=${src}`,
        referrer: headers.get("referer") ?? null,
        user_agent: ua?.slice(0, 500) ?? null,
        ip_hash: hashIp(ip),
        country: geo.country,
        region: geo.region,
        city: geo.city,
        device_type: parsed.device_type,
        browser: parsed.browser,
        os: parsed.os,
        user_id: user?.id ?? null,
        is_authenticated: !!user,
        is_admin_view: false,
      });
    }
  } catch {
    // ignore
  }

  // Monta URL final com UTM (Hotmart aceita query strings extras)
  const checkout = new URL(ebook.checkout_url);
  checkout.searchParams.set("utm_source", "fetichesbrasil");
  checkout.searchParams.set("utm_medium", "ebook_page");
  checkout.searchParams.set("utm_campaign", slug);
  checkout.searchParams.set("utm_content", src);

  return NextResponse.redirect(checkout.toString(), 302);
}

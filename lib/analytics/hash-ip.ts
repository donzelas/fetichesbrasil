import { createHash } from "node:crypto";

/**
 * Hash de IP rotativo (sal trocado diariamente) pra LGPD.
 * Permite contar uniques no mesmo dia, mas impossivel
 * descobrir o IP real ou correlacionar entre dias.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // Sal rotativo: muda toda meia-noite UTC
  const today = new Date().toISOString().slice(0, 10);
  const salt =
    process.env.ANALYTICS_IP_SALT ?? "fetichesbrasil-default-salt-troque-em-prod";
  return createHash("sha256")
    .update(`${ip}|${today}|${salt}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Extrai o IP real do request, considerando proxies (Netlify, Cloudflare, Vercel).
 */
export function getClientIp(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const real = headers.get("x-real-ip");
  if (real) return real;
  return null;
}

/**
 * Extrai pais/regiao do request (Netlify, Cloudflare e Vercel mandam headers
 * de geo localizacao gratis).
 */
export interface GeoData {
  country: string | null;
  region: string | null;
  city: string | null;
}

export function getGeo(headers: Headers): GeoData {
  // Netlify Edge
  const country =
    headers.get("x-country") ??
    headers.get("x-nf-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-vercel-ip-country") ??
    null;

  const region =
    headers.get("x-region") ??
    headers.get("x-nf-region") ??
    headers.get("x-vercel-ip-country-region") ??
    null;

  const city =
    headers.get("x-city") ??
    headers.get("x-nf-city") ??
    headers.get("cf-ipcity") ??
    headers.get("x-vercel-ip-city") ??
    null;

  return {
    country: country?.toUpperCase() ?? null,
    region: region ?? null,
    city: city ? decodeURIComponent(city) : null,
  };
}

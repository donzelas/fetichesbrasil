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

/**
 * Decoda o header x-nf-geo do Netlify (base64 -> JSON).
 * Formato:
 *   {
 *     country: { code: "BR", name: "Brazil" },
 *     subdivision: { code: "SP", name: "São Paulo" },
 *     city: "São Paulo",
 *     timezone: "America/Sao_Paulo",
 *     latitude: -23.5505,
 *     longitude: -46.6333
 *   }
 */
function parseNetlifyGeo(headerValue: string | null): {
  country: string | null;
  region: string | null;
  regionName: string | null;
  city: string | null;
} {
  if (!headerValue) return { country: null, region: null, regionName: null, city: null };
  try {
    const decoded =
      typeof Buffer !== "undefined"
        ? Buffer.from(headerValue, "base64").toString("utf-8")
        : atob(headerValue);
    const parsed = JSON.parse(decoded) as {
      country?: { code?: string };
      subdivision?: { code?: string; name?: string };
      city?: string;
    };
    return {
      country: parsed.country?.code?.toUpperCase() ?? null,
      region: parsed.subdivision?.code ?? null,
      regionName: parsed.subdivision?.name ?? null,
      city: parsed.city ?? null,
    };
  } catch {
    return { country: null, region: null, regionName: null, city: null };
  }
}

export function getGeo(headers: Headers): GeoData {
  // Netlify mais recente: header unico em base64 com country/subdivision/city
  const nfGeo = parseNetlifyGeo(headers.get("x-nf-geo"));

  const country =
    nfGeo.country ??
    headers.get("x-country") ??
    headers.get("x-nf-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-vercel-ip-country") ??
    null;

  // region: prioriza nome ("São Paulo") sobre codigo ("SP") pra UX
  const region =
    nfGeo.regionName ??
    nfGeo.region ??
    headers.get("x-region") ??
    headers.get("x-nf-region") ??
    headers.get("x-vercel-ip-country-region") ??
    null;

  const cityRaw =
    nfGeo.city ??
    headers.get("x-city") ??
    headers.get("x-nf-city") ??
    headers.get("cf-ipcity") ??
    headers.get("x-vercel-ip-city") ??
    null;

  let city = cityRaw;
  if (city && city.includes("%")) {
    try {
      city = decodeURIComponent(city);
    } catch {
      // mantem como esta se decode falhar
    }
  }

  return {
    country: country?.toUpperCase() ?? null,
    region: region ?? null,
    city,
  };
}

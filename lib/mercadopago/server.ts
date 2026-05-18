import { MercadoPagoConfig } from "mercadopago";

let cached: MercadoPagoConfig | null = null;

export function getMpClient(): MercadoPagoConfig {
  if (cached) return cached;
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MP_ACCESS_TOKEN não configurado. Defina em .env.local com o Access Token do Mercado Pago."
    );
  }
  cached = new MercadoPagoConfig({
    accessToken: token,
    options: {
      timeout: 10_000,
      // Idempotency é setada por request quando relevante.
    },
  });
  return cached;
}

export const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? "";

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

/**
 * URL pública para receber notificações do Mercado Pago. Em dev, use
 * ngrok/cloudflared expondo a /api/mercadopago/webhook, e configure
 * NEXT_PUBLIC_SITE_URL como a URL do túnel.
 */
export function webhookUrl(): string {
  return `${appUrl()}/api/mercadopago/webhook`;
}

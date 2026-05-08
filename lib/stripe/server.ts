import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurado. Defina a variável em .env.local."
    );
  }
  cached = new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
    appInfo: { name: "Fetiches Brasil", version: "0.1.0" },
  });
  return cached;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

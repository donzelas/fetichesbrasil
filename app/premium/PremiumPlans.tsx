"use client";

import { useState } from "react";
import { CreditCard, Crown, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface PublicPlan {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  payment_method: "pix" | "credit_card";
  duration_days: number;
  sort_order: number;
  is_active: boolean;
  stripe_price_id: string | null;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PremiumPlans({ plans }: { plans: PublicPlan[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSubscribe(plan: PublicPlan) {
    if (!plan.stripe_price_id) {
      toast.error("Plano sem preço Stripe configurado.");
      return;
    }
    setLoadingId(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao iniciar pagamento");
      }
      if (json.url) {
        window.location.href = json.url as string;
        return;
      }
      throw new Error("URL de checkout não retornada");
    } catch (e) {
      toast.error("Falha no checkout", {
        description: e instanceof Error ? e.message : undefined,
      });
      setLoadingId(null);
    }
  }

  if (plans.length === 0) {
    return (
      <Card className="mx-auto mt-10 max-w-md border-premium/30 shadow-2xl shadow-premium/10">
        <CardContent className="p-8 text-center">
          <p className="text-sm uppercase tracking-wider text-premium font-bold">
            Em breve
          </p>
          <p className="mt-3 text-muted-foreground">
            Estamos preparando os planos. Volte em instantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => {
        const isSub = p.payment_method === "credit_card";
        const monthly = isSub
          ? Math.round((p.price_cents / p.duration_days) * 30)
          : null;
        return (
          <Card
            key={p.id}
            className="relative overflow-hidden border-premium/30 shadow-xl shadow-premium/5 transition hover:border-premium/60"
          >
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-premium/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-premium">
              {isSub ? <CreditCard className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
              {isSub ? "Cartão" : "Pix"}
            </div>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold">{p.title}</h3>
              {p.description && (
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              )}

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{formatBRL(p.price_cents)}</span>
                <span className="text-sm text-muted-foreground">
                  /{p.duration_days} dia{p.duration_days === 1 ? "" : "s"}
                </span>
              </div>

              {monthly && monthly !== p.price_cents && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ {formatBRL(monthly)} por mês
                </p>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                {isSub
                  ? `Cobrado a cada ${p.duration_days} dia${
                      p.duration_days === 1 ? "" : "s"
                    } automaticamente. Cancele quando quiser.`
                  : `Pagamento único. ${p.duration_days} dia${
                      p.duration_days === 1 ? "" : "s"
                    } de Premium. Expira automaticamente.`}
              </p>

              <Button
                size="lg"
                variant="premium"
                className="mt-5 w-full"
                disabled={loadingId === p.id}
                onClick={() => handleSubscribe(p)}
              >
                {loadingId === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Assinar agora
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Pagamento seguro · Stripe
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

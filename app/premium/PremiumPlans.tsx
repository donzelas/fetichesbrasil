"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface PublicPlan {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  payment_method: "pix";
  duration_days: number;
  sort_order: number;
  is_active: boolean;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PremiumPlans({ plans }: { plans: PublicPlan[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSubscribe(plan: PublicPlan) {
    setLoadingId(plan.id);
    try {
      const res = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao gerar PIX");
      }
      if (!json.payment_id || !json.qr_code_base64) {
        throw new Error("Resposta inválida do servidor");
      }
      // Guardamos os dados do PIX em sessionStorage para a proxima pagina
      // exibir sem ter que gerar de novo.
      sessionStorage.setItem(
        `fb_pix_${json.payment_id}`,
        JSON.stringify(json)
      );
      router.push(`/premium/pagar/${json.payment_id}`);
    } catch (e) {
      toast.error("Falha ao gerar PIX", {
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
        return (
          <Card
            key={p.id}
            className="relative overflow-hidden border-premium/30 shadow-xl shadow-premium/5 transition hover:border-premium/60"
          >
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-premium/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-premium">
              <QrCode className="h-3 w-3" />
              Pix
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

              <p className="mt-2 text-xs text-muted-foreground">
                Pagamento único via Pix. {p.duration_days} dia
                {p.duration_days === 1 ? "" : "s"} de Premium. Expira automaticamente.
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
                    Pagar com Pix
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Pagamento seguro · Mercado Pago
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

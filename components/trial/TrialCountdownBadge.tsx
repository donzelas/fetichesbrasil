"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Clock, Crown } from "lucide-react";
import { toast } from "sonner";
import { useTrialStatus, formatTrialTime } from "@/hooks/useTrialStatus";
import { cn } from "@/lib/utils/cn";

/**
 * Badge compacto no Header mostrando tempo restante do trial.
 *
 * Estados visuais:
 *   - > 10min: verde (calmo)
 *   - 5-10min: amarelo (alerta)
 *   - 1-5min: laranja (urgente)
 *   - < 1min: vermelho pulsante (critico)
 *   - expirado: nao renderiza (modal aparece em outro lugar)
 *
 * Bypass (premium/admin): nao renderiza nada.
 *
 * Toasts dispara aos 10min, 5min, 2min e 30s restantes
 * (uma vez cada por sessao).
 */
export function TrialCountdownBadge() {
  const { loading, bypass, active, expired, secondsLeft } = useTrialStatus();
  const lastToastRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (bypass || expired) return;
    // Dispara toast em marcos especificos
    const marks: Array<{ s: number; msg: string; level: "info" | "warning" | "error" }> = [
      { s: 600, msg: "Faltam 10 minutos do seu trial gratuito", level: "info" },
      { s: 300, msg: "5 minutos restantes — vire Premium pra continuar", level: "warning" },
      { s: 120, msg: "2 minutos! Aproveite e ative o Premium", level: "warning" },
      { s: 30, msg: "30 segundos! Seu acesso vai expirar", level: "error" },
    ];
    for (const m of marks) {
      // Dispara quando secondsLeft cai exatamente naquele valor (com tolerancia +-1s)
      if (
        secondsLeft <= m.s &&
        secondsLeft > m.s - 2 &&
        !lastToastRef.current.has(m.s)
      ) {
        lastToastRef.current.add(m.s);
        const fn =
          m.level === "info" ? toast.info : m.level === "warning" ? toast.warning : toast.error;
        fn(m.msg, {
          duration: 6000,
          action: { label: "Virar Premium", onClick: () => (window.location.href = "/premium") },
        });
      }
    }
  }, [secondsLeft, bypass, expired]);

  if (loading || bypass || expired || !active) return null;

  // Define cor pelo tempo restante
  const min = secondsLeft / 60;
  const colorClass =
    min < 1
      ? "border-rose-500/60 bg-rose-500/15 text-rose-400 animate-pulse"
      : min < 5
      ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
      : min < 10
      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";

  return (
    <Link
      href="/premium"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition hover:scale-105",
        colorClass
      )}
      title={`Trial gratuito: ${formatTrialTime(secondsLeft)} restantes. Clique pra virar Premium.`}
    >
      <Clock className="h-3 w-3" />
      <span className="hidden sm:inline">Trial:</span>
      <span>{formatTrialTime(secondsLeft)}</span>
      <Crown className="hidden h-3 w-3 sm:inline" />
    </Link>
  );
}

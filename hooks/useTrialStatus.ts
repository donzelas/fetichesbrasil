"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/hooks/useUser";

const TRIAL_DURATION = 3600; // 1h em segundos

interface TrialStatus {
  /** Carregando dados (primeira chamada) */
  loading: boolean;
  /** Usuario nao precisa de trial (premium ou admin) */
  bypass: boolean;
  /** Trial ainda valido */
  active: boolean;
  /** Trial expirou */
  expired: boolean;
  /** Segundos restantes (negativo se expirou) */
  secondsLeft: number;
  /** Quando o trial comecou (ISO) */
  startedAt: string | null;
}

/**
 * Calcula trial CLIENT-SIDE puro baseado em `profile.trial_started_at`.
 * Decrementa em tempo real (a cada 1s), sem chamar API.
 *
 * Server faz a checagem de seguranca via RLS — aqui e so UI.
 *
 * Premium/Admin: bypass=true (interface esconde timer)
 */
export function useTrialStatus(): TrialStatus {
  const { profile, isPremium, isAdmin, loading: userLoading } = useUser();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startedAt = profile?.trial_started_at ?? null;
  const bypass = isPremium || isAdmin;

  useEffect(() => {
    if (bypass || !startedAt) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    // Re-sincroniza agora
    setNowMs(Date.now());
    intervalRef.current = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [bypass, startedAt]);

  if (userLoading) {
    return {
      loading: true,
      bypass: false,
      active: false,
      expired: false,
      secondsLeft: TRIAL_DURATION,
      startedAt: null,
    };
  }

  if (bypass) {
    return {
      loading: false,
      bypass: true,
      active: true,
      expired: false,
      secondsLeft: TRIAL_DURATION,
      startedAt: null,
    };
  }

  if (!startedAt) {
    // Edge case: profile chegou no client sem trial_started_at.
    // Pode ser cache antigo (profile carregado antes da migration) OU
    // legacy sem trigger. Trata como ATIVO pra nao bloquear usuario
    // injustamente. A seguranca real esta no RLS do banco:
    //   - mensagens: bloqueia via is_in_trial() do server
    //   - se RLS diz nao, frontend nao consegue ver nada de qualquer jeito
    return {
      loading: false,
      bypass: false,
      active: true,
      expired: false,
      secondsLeft: TRIAL_DURATION,
      startedAt: null,
    };
  }

  const startMs = new Date(startedAt).getTime();
  const elapsedSec = Math.floor((nowMs - startMs) / 1000);
  const secondsLeft = TRIAL_DURATION - elapsedSec;
  const expired = secondsLeft <= 0;

  return {
    loading: false,
    bypass: false,
    active: !expired,
    expired,
    secondsLeft: Math.max(0, secondsLeft),
    startedAt,
  };
}

/**
 * Formata segundos em MM:SS ou HH:MM:SS
 */
export function formatTrialTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

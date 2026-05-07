"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_MS = 5 * 60 * 1000;

/**
 * Faz logout automático após 5 minutos com a página/aba escondida ou sem foco.
 * - Quando a aba some (visibilitychange/blur), começa um timer de 5 min.
 * - Se a aba volta antes de estourar, o timer é cancelado.
 * - Se estoura, faz signOut e redireciona para a landing.
 *
 * Renderiza nada — só efeito colateral.
 */
export function AutoLogout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    function clearTimer() {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    async function performLogout() {
      if (loggedOutRef.current) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      loggedOutRef.current = true;
      await supabase.auth.signOut();
      toast.info("Sessão encerrada por inatividade", {
        description: "Você ficou mais de 5 minutos longe. Faça login novamente.",
      });
      router.push("/");
      router.refresh();
    }

    function startTimerIfHidden() {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "hidden") return;
      clearTimer();
      timerRef.current = setTimeout(performLogout, INACTIVITY_MS);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        startTimerIfHidden();
      } else {
        clearTimer();
      }
    }

    function onBlur() {
      // Em alguns browsers a aba pode estar visível mas sem foco — tratamos igual.
      startTimerIfHidden();
    }

    function onFocus() {
      clearTimer();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    if (document.visibilityState === "hidden") {
      startTimerIfHidden();
    }

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}

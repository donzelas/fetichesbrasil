"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Tracker de pageview client-side.
 *
 * - Roda ao montar + a cada mudanca de rota
 * - Nao usa cookies (session_id em sessionStorage)
 * - sessionStorage zera quando navegador fecha (privacidade)
 * - Ignora rotas /admin
 * - Best-effort: usa sendBeacon ou fetch keepalive pra
 *   nao bloquear navegacao
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // Ignora rotas admin (admin nao polui analytics)
    if (pathname.startsWith("/admin")) return;

    // Evita dispara duplo no mesmo path
    const key = `${pathname}${searchParams ? `?${searchParams.toString()}` : ""}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;

    // Session ID em sessionStorage (zera ao fechar navegador)
    let sessionId: string | null = null;
    try {
      sessionId = sessionStorage.getItem("fb_sid");
      if (!sessionId) {
        sessionId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem("fb_sid", sessionId);
      }
    } catch {
      // sessionStorage pode estar bloqueado (modo anônimo extremo)
    }

    const payload = JSON.stringify({
      path: pathname,
      full_url: typeof window !== "undefined" ? window.location.href : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      session_id: sessionId,
    });

    // sendBeacon e preferido (nao bloqueia navegacao mesmo se usuario sair)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/track", blob);
        return;
      } catch {
        // Fall through pra fetch
      }
    }

    // Fallback: fetch com keepalive
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* silencio: tracking nao pode quebrar a app */
    });
  }, [pathname, searchParams]);

  return null;
}

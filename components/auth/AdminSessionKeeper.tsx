"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/hooks/useUser";

/**
 * Quando detecta que o usuario logado e admin, faz POST em
 * /api/auth/admin-session que seta um cookie persistente
 * (fb_admin_session=1, 30 dias). Esse cookie diz pro server.ts
 * NAO converter os cookies de auth em session-only.
 *
 * Resultado: admin nao perde sessao ao fechar/abrir navegador.
 *
 * Roda 1x ao detectar admin (nao re-dispara).
 */
export function AdminSessionKeeper() {
  const { isAdmin, loading } = useUser();
  const markedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    if (markedRef.current) return;
    markedRef.current = true;

    fetch("/api/auth/admin-session", { method: "POST" }).catch(() => {
      // Silencio: se falhar, no proximo refresh tenta de novo
      markedRef.current = false;
    });
  }, [isAdmin, loading]);

  return null;
}

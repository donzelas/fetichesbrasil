"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Hook que devolve true quando a aba está oculta, sem foco, ou quando
 * heurísticas de DevTools/screen capture disparam. Usado para borrar
 * imagens sensíveis e dificultar print/grab.
 *
 * Também intercepta atalhos comuns (PrintScreen, Cmd+Shift+S, Cmd+S,
 * F12, Cmd/Ctrl+Shift+I/J/C) avisando o usuário via toast e tentando
 * sobrescrever o clipboard.
 */
export function useProtectionState(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const showWarn = () => {
      toast.warning("Capturas de tela são monitoradas e proibidas.", {
        id: "screenshot-warn",
        duration: 2500,
      });
    };

    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    const onVisibility = () =>
      setHidden(document.visibilityState !== "visible");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setHidden(true);
        try {
          navigator.clipboard?.writeText?.(
            "Captura bloqueada — FETICHESBRASIL.COM.BR"
          );
        } catch {
          /* clipboard pode falhar fora de foco — tudo bem */
        }
        showWarn();
        setTimeout(() => setHidden(false), 1800);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        ["s", "S", "3", "4", "5"].includes(e.key)
      ) {
        setHidden(true);
        showWarn();
        setTimeout(() => setHidden(false), 1500);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        showWarn();
      }
      if (
        e.key === "F12" ||
        ((e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          ["i", "I", "j", "J", "c", "C"].includes(e.key))
      ) {
        e.preventDefault();
        setHidden(true);
        showWarn();
      }
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown, { capture: true });

    const devtoolsCheck = setInterval(() => {
      const threshold = 200;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        setHidden(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      } as EventListenerOptions);
      clearInterval(devtoolsCheck);
    };
  }, []);

  return hidden;
}

export const PROTECTED_IMG_STYLE: React.CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitUserDrag: "none",
} as React.CSSProperties;

export function preventImageContext(e: React.MouseEvent | React.SyntheticEvent) {
  e.preventDefault();
  toast.warning("Captura de imagem desabilitada.", {
    id: "ctx-warn",
    duration: 1800,
  });
}

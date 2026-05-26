"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_KEY = "fb_admin_mobile_banner_dismissed";

export function MobileSuggestionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    if (dismissed) return;
    const mq = window.matchMedia("(max-width: 768px)");
    setShow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setShow(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-1">
      <Link
        href="/admin/mobile"
        className="flex items-center justify-between gap-3 rounded-xl p-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Painel mobile otimizado</p>
          <p className="text-xs text-muted-foreground">
            Pagamentos, cadastros e chats em tempo real com som.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          Abrir
        </span>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            window.localStorage.setItem(DISMISSED_KEY, "1");
          } catch {
            // ignore
          }
          setShow(false);
        }}
        className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground/60 transition hover:text-foreground"
        aria-label="Dispensar"
      >
        Fechar
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, X } from "lucide-react";

const DISMISSED_KEY = "fb_admin_mobile_banner_dismissed";

/**
 * Banner clicavel que sugere a versao mobile do admin quando
 * detecta tela pequena (<= 768px). Some apos dismiss (persistido em
 * localStorage) e nao reaparece naquele device.
 */
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
        className="flex items-center gap-3 rounded-xl p-3"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Painel mobile otimizado</p>
          <p className="text-xs text-muted-foreground">
            Veja pagamentos, cadastros e chats em tempo real com som.
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
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
        aria-label="Dispensar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

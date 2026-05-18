"use client";

import { useEffect, useState } from "react";
import { Eye, ImageOff, Loader2, Timer, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PROTECTED_IMG_STYLE,
  preventImageContext,
  useProtectionState,
} from "@/lib/hooks/useProtectionState";
import { cn } from "@/lib/utils/cn";

export const ROOM_IMAGE_BUCKET = "room-images";
/** Tempo até a imagem ser considerada expirada para usuários comuns. */
export const ROOM_IMAGE_TTL_MS = 15 * 1000;

interface RoomImageMessageProps {
  imagePath: string;
  expiresAt: string | null;
  own: boolean;
  isAdmin: boolean;
  /** Username de quem ESTÁ vendo (pra marca d'água no modal). */
  viewerUsername?: string | null;
}

export function RoomImageMessage({
  imagePath,
  expiresAt,
  own,
  isAdmin,
  viewerUsername,
}: RoomImageMessageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const hidden = useProtectionState();

  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const remaining = expiresAtMs ? expiresAtMs - Date.now() : null;
  const expired = remaining !== null && remaining <= 0;

  // Snapchat-style: TODO usuário (incluindo o autor) perde acesso depois
  // do TTL (ROOM_IMAGE_TTL_MS). Apenas admin retém para auditoria.
  const visible = !expired || isAdmin;

  useEffect(() => {
    if (!visible) {
      setUrl(null);
      return;
    }
    let mounted = true;
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.storage
        .from(ROOM_IMAGE_BUCKET)
        .createSignedUrl(imagePath, 60 * 5);
      if (!mounted) return;
      if (error || !data?.signedUrl) {
        setError(true);
        return;
      }
      setUrl(data.signedUrl);
    })();
    return () => {
      mounted = false;
    };
  }, [imagePath, visible]);

  // Tick a cada 250ms para o contador regressivo enquanto não expira
  useEffect(() => {
    if (!expiresAtMs) return;
    if (expired) return;
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [expiresAtMs, expired]);

  // Fecha modal automaticamente quando expira (regra global, menos admin)
  useEffect(() => {
    if (open && expired && !isAdmin) {
      setOpen(false);
    }
  }, [open, expired, isAdmin]);

  // ESC para fechar modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!visible) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-current/40 px-3 py-2 text-xs opacity-80">
        <ImageOff className="h-3.5 w-3.5" />
        Imagem expirada
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg px-3 py-2 text-xs opacity-80">
        Não foi possível carregar a imagem.
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-black/20">
        <Loader2 className="h-4 w-4 animate-spin opacity-70" />
      </div>
    );
  }

  const showCountdown =
    expiresAtMs && !expired && remaining !== null && (isAdmin || own);
  const adminBadge = expired && isAdmin;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block overflow-hidden rounded-lg border border-current/20 bg-black/20 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/60"
        aria-label="Abrir imagem"
        onContextMenu={preventImageContext}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="anexo"
          loading="lazy"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={preventImageContext}
          style={PROTECTED_IMG_STYLE}
          className={cn(
            "block max-h-32 w-auto max-w-[180px] object-cover transition",
            hidden && "blur-2xl scale-110"
          )}
        />
        {hidden && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <span className="rounded-full bg-black/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              protegido
            </span>
          </div>
        )}
        {showCountdown && (
          <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            <Timer className="h-3 w-3" />
            {formatShortRemaining(remaining ?? 0)}
          </span>
        )}
        {adminBadge && (
          <span className="absolute bottom-1 left-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            admin
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 select-none"
          onClick={() => setOpen(false)}
          onContextMenu={preventImageContext}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative max-h-[90vh] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={preventImageContext}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="anexo"
              data-protected="true"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={preventImageContext}
              style={PROTECTED_IMG_STYLE}
              className={cn(
                "max-h-[90vh] max-w-[95vw] rounded-lg object-contain",
                hidden && "blur-3xl"
              )}
            />

            {/* Marca d'água dinâmica — username + timestamp do espectador
                cobrindo a imagem em diagonal. Serve como rastreabilidade:
                qualquer print sai com identificação do usuário que vazou. */}
            <ViewerWatermark username={viewerUsername ?? "anônimo"} />

            {hidden && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-2 rounded-full bg-black/90 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white shadow-2xl">
                  <Eye className="h-4 w-4" />
                  conteúdo protegido
                </span>
              </div>
            )}

            {(showCountdown || adminBadge) && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-3 py-1 text-xs text-white backdrop-blur-sm">
                <Timer className="h-3.5 w-3.5" />
                {adminBadge
                  ? "Expirada (visível como admin)"
                  : `Some em ${formatShortRemaining(remaining ?? 0)}`}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Marca d'água em diagonal cobrindo a imagem com `@username · HH:MM:SS`
 * repetido. Atualiza o relógio a cada segundo. Texto translucido pra
 * não atrapalhar a visualização, mas sempre presente em prints/recordings.
 */
function ViewerWatermark({ username }: { username: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const label = `@${username} · ${now.toLocaleString("pt-BR")}`;
  const rows = 6;
  const cols = 3;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
      aria-hidden
    >
      <div
        className="absolute inset-[-20%] grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          transform: "rotate(-30deg)",
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            <span
              className="select-none whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-white/25"
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatShortRemaining(ms: number): string {
  if (ms <= 0) return "0s";
  const total = Math.ceil(ms / 1000);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

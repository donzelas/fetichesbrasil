"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface BlogImageCarouselProps {
  urls: string[];
  alt?: string;
  className?: string;
}

/**
 * Hook que devolve true quando a aba está oculta, sem foco, ou quando
 * heurísticas de DevTools/screen capture disparam. Usado para borrar
 * imagens sensíveis e dificultar print/grab.
 */
function useProtectionState() {
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
    const onVisibility = () => setHidden(document.visibilityState !== "visible");

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
      // Cmd/Ctrl+Shift+S / Cmd+Shift+3/4 (Mac screenshot)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        ["s", "S", "3", "4", "5"].includes(e.key)
      ) {
        setHidden(true);
        showWarn();
        setTimeout(() => setHidden(false), 1500);
      }
      // Cmd/Ctrl+S → tentativa de "salvar página"
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        showWarn();
      }
      // F12 ou Cmd/Ctrl+Shift+I/J/C (DevTools)
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

    // Heurística: DevTools aberto aumenta diferença entre outerWidth/innerWidth
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
      window.removeEventListener("keydown", onKeyDown, { capture: true } as EventListenerOptions);
      clearInterval(devtoolsCheck);
    };
  }, []);

  return hidden;
}

const PROTECTED_IMG_STYLE: React.CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitUserDrag: "none",
} as React.CSSProperties;

function preventContext(e: React.MouseEvent | React.SyntheticEvent) {
  e.preventDefault();
  toast.warning("Captura de imagem desabilitada.", {
    id: "ctx-warn",
    duration: 1800,
  });
}

const SWIPE_THRESHOLD = 50;

export function BlogImageCarousel({ urls, alt = "Imagem do post", className }: BlogImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const hidden = useProtectionState();

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  const safeIndex = Math.min(index, Math.max(urls.length - 1, 0));

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % urls.length);
  }, [urls.length]);

  // Navegação por teclado quando o lightbox está aberto
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLightbox(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  // Handlers de swipe (touch + mouse) via pointer events
  const onPointerDown = (e: React.PointerEvent) => {
    if (urls.length <= 1) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isSwiping.current = false;
    setDragOffset(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (!isSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }
    if (isSwiping.current) {
      setDragOffset(dx);
    }
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const swiped = isSwiping.current;
    pointerStart.current = null;
    setDragOffset(0);
    if (swiped) {
      // impede que o click bubble (ex.: fechar lightbox / abrir lightbox)
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) next();
        else prev();
      }
      // pequeno delay para evitar disparo do onClick após swipe
      setTimeout(() => {
        isSwiping.current = false;
      }, 0);
    }
  };

  if (!urls.length) return null;

  const current = urls[safeIndex];

  return (
    <>
      <div
        className={cn(
          "group relative aspect-video overflow-hidden rounded-xl border border-border/50 bg-muted select-none touch-pan-y",
          className
        )}
        onContextMenu={preventContext}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          type="button"
          onClick={() => {
            if (isSwiping.current) return;
            setLightbox(true);
          }}
          className="block h-full w-full"
          aria-label="Abrir imagem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            data-protected="true"
            className={cn(
              "h-full w-full object-cover transition",
              !dragOffset && "group-hover:scale-[1.02]",
              hidden && "blur-2xl scale-110"
            )}
            style={{
              ...PROTECTED_IMG_STYLE,
              transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
              transition: dragOffset ? "none" : undefined,
            }}
            draggable={false}
            onContextMenu={preventContext}
            onDragStart={(e) => e.preventDefault()}
          />
        </button>

        {hidden && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <span className="flex items-center gap-2 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white">
              <Eye className="h-3.5 w-3.5" />
              conteúdo protegido
            </span>
          </div>
        )}

        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-80 backdrop-blur-sm transition hover:bg-black/80 hover:opacity-100 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-80 backdrop-blur-sm transition hover:bg-black/80 hover:opacity-100 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
              {urls.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  )}
                />
              ))}
            </div>

            <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {safeIndex + 1}/{urls.length}
            </div>
          </>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 select-none touch-pan-y"
          onClick={() => {
            if (isSwiping.current) return;
            setLightbox(false);
          }}
          onContextMenu={preventContext}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Próxima"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[90vh] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={preventContext}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={alt}
              data-protected="true"
              className={cn(
                "max-h-[90vh] max-w-[95vw] rounded-lg object-contain",
                hidden && "blur-3xl",
                !dragOffset && "transition"
              )}
              draggable={false}
              onContextMenu={preventContext}
              onDragStart={(e) => e.preventDefault()}
              style={{
                ...PROTECTED_IMG_STYLE,
                transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
                transition: dragOffset ? "none" : undefined,
              }}
            />

            {hidden && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-2 rounded-full bg-black/90 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white shadow-2xl">
                  <Eye className="h-4 w-4" />
                  conteúdo protegido
                </span>
              </div>
            )}
          </div>

          {urls.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {safeIndex + 1} de {urls.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

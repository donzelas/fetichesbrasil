"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  PROTECTED_IMG_STYLE,
  preventImageContext as preventContext,
} from "@/lib/hooks/useProtectionState";

interface BlogImageCarouselProps {
  urls: string[];
  alt?: string;
  className?: string;
}

const SWIPE_THRESHOLD = 50;

export function BlogImageCarousel({ urls, alt = "Imagem do post", className }: BlogImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  const safeIndex = Math.min(index, Math.max(urls.length - 1, 0));

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % urls.length);
  }, [urls.length]);

  // Pre-carrega imagens adjacentes pra troca instantanea
  useEffect(() => {
    if (urls.length <= 1) return;
    const toPreload = [
      urls[(safeIndex + 1) % urls.length],
      urls[(safeIndex - 1 + urls.length) % urls.length],
    ];
    toPreload.forEach((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }, [safeIndex, urls]);

  // Navegacao por teclado quando o lightbox esta aberto
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

  // Bloqueia scroll do body quando lightbox aberto
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

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
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) next();
        else prev();
      }
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
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{
              ...PROTECTED_IMG_STYLE,
              transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
              transition: dragOffset ? "none" : "transform 200ms ease-out",
              willChange: "transform",
            }}
            draggable={false}
            onContextMenu={preventContext}
            onDragStart={(e) => e.preventDefault()}
          />
        </button>

        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-90 backdrop-blur-sm transition hover:bg-black/80 hover:opacity-100 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
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
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-90 backdrop-blur-sm transition hover:bg-black/80 hover:opacity-100 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Proxima imagem"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
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

            <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {safeIndex + 1}/{urls.length}
            </div>
          </>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex select-none items-center justify-center bg-black/95 touch-pan-y"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            data-protected="true"
            decoding="async"
            className="max-h-screen max-w-full object-contain"
            draggable={false}
            onContextMenu={preventContext}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...PROTECTED_IMG_STYLE,
              transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
              transition: dragOffset ? "none" : "transform 200ms ease-out",
              willChange: "transform",
            }}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
            className="absolute right-3 top-3 z-20 rounded-full bg-white/15 p-2.5 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>

          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:left-6 sm:p-4"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-7 w-7 sm:h-8 sm:w-8" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:right-6 sm:p-4"
                aria-label="Proxima"
              >
                <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8" />
              </button>

              <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
                {safeIndex + 1} de {urls.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface BlogImageCarouselProps {
  urls: string[];
  alt?: string;
  className?: string;
}

export function BlogImageCarousel({ urls, alt = "Imagem do post", className }: BlogImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!urls.length) return null;

  const safeIndex = Math.min(index, urls.length - 1);
  const current = urls[safeIndex];

  function prev() {
    setIndex((i) => (i - 1 + urls.length) % urls.length);
  }
  function next() {
    setIndex((i) => (i + 1) % urls.length);
  }

  return (
    <>
      <div
        className={cn(
          "group relative aspect-video overflow-hidden rounded-xl border border-border/50 bg-muted",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block h-full w-full"
          aria-label="Abrir imagem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            draggable={false}
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(false)}
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
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={alt}
              className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
            />
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

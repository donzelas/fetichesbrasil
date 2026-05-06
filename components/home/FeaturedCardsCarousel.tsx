"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SLIDE_INTERVAL_MS = 3000;
const FALLBACK_IMAGE = "https://picsum.photos/1280/640?blur=2";

export interface FeaturedCard {
  id: string;
  title: string;
  description: string;
  image_url: string;
}

interface FeaturedCardsCarouselProps {
  cards: FeaturedCard[];
}

export function FeaturedCardsCarousel({ cards }: FeaturedCardsCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const total = cards.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(1, total));
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + Math.max(1, total)) % Math.max(1, total));
  }, [total]);

  useEffect(() => {
    if (total <= 1 || paused || hovering) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setIndex((i) => (i + 1) % total);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, hovering, total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!wrapperRef.current?.contains(document.activeElement)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (total === 0) return null;

  return (
    <section
      ref={wrapperRef}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      tabIndex={0}
      aria-roledescription="carousel"
    >
      <div className="relative h-[260px] sm:h-[340px] md:h-[400px]">
        {cards.map((c, i) => (
          <div
            key={c.id}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.image_url}
              alt={c.title}
              loading={i === 0 ? "eager" : "lazy"}
              onError={(e) => {
                const t = e.currentTarget;
                if (t.src !== FALLBACK_IMAGE) t.src = FALLBACK_IMAGE;
              }}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 md:p-9">
              <div className="max-w-2xl space-y-1.5 sm:space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  Em destaque
                </p>
                <h2 className="text-2xl font-bold leading-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl">
                  {c.title}
                </h2>
                <p className="line-clamp-3 text-sm text-white/85 sm:text-base">
                  {c.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Próximo"
            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:h-10 sm:w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Retomar" : "Pausar"}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {cards.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

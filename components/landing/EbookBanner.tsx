import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

/**
 * Banner do ebook destacado (is_featured=true). Aparece na landing
 * entre o hero e a primeira secao de conteudo. Click leva pra
 * pagina de vendas. Esconde silenciosamente se nao houver ebook ativo.
 */
export async function EbookBanner() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("featured_ebook");
  const ebook = data?.[0];
  if (!ebook) return null;

  const accent = ebook.accent_color ?? "#dc2626";
  const discountPct =
    ebook.original_price_cents && ebook.original_price_cents > ebook.price_cents
      ? Math.round(
          (1 - ebook.price_cents / ebook.original_price_cents) * 100
        )
      : null;

  return (
    <section className="container py-6 md:py-10">
      <Link
        href={`/ebooks/${ebook.slug}`}
        className="group relative mx-auto block max-w-4xl overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-background p-6 transition hover:border-primary/50 md:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl"
          style={{ backgroundColor: `${accent}55` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full blur-3xl"
          style={{ backgroundColor: `${accent}33` }}
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex-1">
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                borderColor: `${accent}66`,
                backgroundColor: `${accent}22`,
                color: accent,
              }}
            >
              Ebook · Lançamento
            </div>
            <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              {ebook.title}
            </h2>
            {ebook.subtitle && (
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {ebook.subtitle}
              </p>
            )}
            <div className="mt-4 flex items-baseline gap-2 text-sm">
              {ebook.original_price_cents && discountPct && (
                <span className="text-muted-foreground line-through">
                  {brl(ebook.original_price_cents)}
                </span>
              )}
              <span className="text-2xl font-black" style={{ color: accent }}>
                {brl(ebook.price_cents)}
              </span>
              {discountPct && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `${accent}22`,
                    color: accent,
                  }}
                >
                  {discountPct}% OFF
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
            <span
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition group-hover:scale-[1.02]"
              style={{ backgroundColor: accent }}
            >
              Quero acessar o método
            </span>
            <p className="text-center text-[10px] text-muted-foreground md:text-right">
              Pagamento seguro · Garantia 7 dias
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface SalesLetter {
  pain_intro?: { title: string; paragraphs: string[] };
  mistake_list?: { title: string; items: string[]; outro?: string };
  method_preview?: {
    title: string;
    subtitle?: string;
    steps: Array<{ n: number; title: string; desc: string }>;
  };
  for_who?: { title: string; items: string[] };
  not_for_who?: { title: string; items: string[] };
  testimonials?: Array<{ initials: string; city: string; text: string }>;
  bonuses?: Array<{ title: string; value_label: string; desc: string }>;
  guarantee?: { title: string; text: string };
  scarcity?: { title: string; text: string };
  faq?: Array<{ q: string; a: string }>;
}

interface EbookRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  hook: string | null;
  price_cents: number;
  original_price_cents: number | null;
  currency: string;
  cover_image_url: string | null;
  accent_color: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  sales_letter: SalesLetter | null;
}

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

async function fetchEbook(slug: string): Promise<EbookRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ebooks")
    .select(
      "id, slug, title, subtitle, hook, price_cents, original_price_cents, currency, cover_image_url, accent_color, seo_title, seo_description, seo_keywords, sales_letter"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data as EbookRow | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ebook = await fetchEbook(slug);
  if (!ebook) return { title: "Ebook não encontrado" };
  return {
    title: ebook.seo_title ?? ebook.title,
    description: ebook.seo_description ?? ebook.subtitle ?? undefined,
    keywords: ebook.seo_keywords ?? undefined,
    openGraph: {
      title: ebook.seo_title ?? ebook.title,
      description: ebook.seo_description ?? ebook.subtitle ?? undefined,
      type: "article",
      images: ebook.cover_image_url ? [ebook.cover_image_url] : undefined,
    },
    robots: { index: true, follow: true },
    alternates: { canonical: `/ebooks/${slug}` },
  };
}

export default async function EbookSalesPage({ params }: PageProps) {
  const { slug } = await params;
  const ebook = await fetchEbook(slug);
  if (!ebook) notFound();

  const sl: SalesLetter = ebook.sales_letter ?? {};
  const discountPct =
    ebook.original_price_cents && ebook.original_price_cents > ebook.price_cents
      ? Math.round(
          (1 - ebook.price_cents / ebook.original_price_cents) * 100
        )
      : null;

  const goUrl = (src: string) =>
    `/go/ebook/${ebook.slug}?src=${encodeURIComponent(src)}`;

  return (
    <div className="relative overflow-hidden bg-background">
      {/* Glow de fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{ backgroundColor: `${ebook.accent_color ?? "#dc2626"}33` }}
        />
        <div
          className="absolute bottom-[20%] -right-40 h-[400px] w-[400px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${ebook.accent_color ?? "#dc2626"}22` }}
        />
      </div>

      {/* HERO */}
      <section className="container relative pb-12 pt-12 md:pb-20 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            Método validado · 100% discreto
          </div>

          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            {ebook.title}
          </h1>

          {ebook.subtitle && (
            <p className="mx-auto mt-5 max-w-2xl text-balance text-xl text-muted-foreground md:text-2xl">
              {ebook.subtitle}
            </p>
          )}

          {ebook.hook && (
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground/90 md:text-lg">
              {ebook.hook}
            </p>
          )}

          <div className="mt-10 flex flex-col items-center gap-3">
            <Button
              asChild
              size="lg"
              variant="gradient"
              className="h-16 w-full max-w-md px-8 text-base font-bold md:text-lg"
            >
              <a href={goUrl("hero")} target="_blank" rel="noopener noreferrer sponsored">
                Quero acessar o método agora — {brl(ebook.price_cents)}
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Pagamento seguro via Hotmart · PIX ou cartão · Garantia de 7 dias
            </p>
            {discountPct && ebook.original_price_cents && (
              <p className="text-sm">
                <span className="text-muted-foreground line-through">
                  {brl(ebook.original_price_cents)}
                </span>{" "}
                <span className="ml-2 font-bold text-primary">
                  por {brl(ebook.price_cents)}
                </span>{" "}
                <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                  {discountPct}% OFF
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* PAIN INTRO */}
      {sl.pain_intro && (
        <section className="container py-12">
          <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-card/50 p-8 backdrop-blur md:p-12">
            <h2 className="text-balance text-2xl font-bold md:text-4xl">
              {sl.pain_intro.title}
            </h2>
            <div className="mt-6 space-y-4 text-base md:text-lg">
              {sl.pain_intro.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === sl.pain_intro!.paragraphs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MISTAKES */}
      {sl.mistake_list && (
        <section className="container py-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-balance text-2xl font-bold md:text-4xl">
              {sl.mistake_list.title}
            </h2>
            <ul className="mt-8 space-y-3">
              {sl.mistake_list.items.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <span className="shrink-0 text-3xl font-bold leading-none text-destructive/70">
                    {i + 1}
                  </span>
                  <p className="text-sm md:text-base">{item}</p>
                </li>
              ))}
            </ul>
            {sl.mistake_list.outro && (
              <p className="mt-6 text-balance text-center text-base font-semibold text-muted-foreground md:text-lg">
                {sl.mistake_list.outro}
              </p>
            )}
          </div>
        </section>
      )}

      {/* METHOD PREVIEW */}
      {sl.method_preview && (
        <section className="container py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="text-balance text-3xl font-bold md:text-5xl">
                {sl.method_preview.title}
              </h2>
              {sl.method_preview.subtitle && (
                <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground md:text-lg">
                  {sl.method_preview.subtitle}
                </p>
              )}
            </div>

            <div className="mt-12 space-y-4">
              {sl.method_preview.steps.map((step) => (
                <div
                  key={step.n}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur transition hover:border-primary/40 md:p-8"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                    <div className="shrink-0">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-2xl font-black text-primary">
                        {step.n}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold md:text-2xl">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground md:text-base">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Button
                asChild
                size="lg"
                variant="gradient"
                className="h-14 w-full max-w-md px-8 text-base font-bold"
              >
                <a href={goUrl("after_method")} target="_blank" rel="noopener noreferrer sponsored">
                  Quero o método completo — {brl(ebook.price_cents)}
                </a>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* FOR WHO / NOT FOR WHO */}
      {(sl.for_who || sl.not_for_who) && (
        <section className="container py-16">
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            {sl.for_who && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
                <h3 className="text-xl font-bold text-primary md:text-2xl">
                  {sl.for_who.title}
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm md:text-base">
                  {sl.for_who.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sl.not_for_who && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 md:p-8">
                <h3 className="text-xl font-bold text-destructive/90 md:text-2xl">
                  {sl.not_for_who.title}
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm md:text-base">
                  {sl.not_for_who.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-destructive/70">−</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {sl.testimonials && sl.testimonials.length > 0 && (
        <section className="container py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-balance text-center text-3xl font-bold md:text-4xl">
              Quem aplicou está vivendo isso
            </h2>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Depoimentos reais. Iniciais e cidade preservadas pela natureza do conteúdo.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {sl.testimonials.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur"
                >
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    &quot;{t.text}&quot;
                  </p>
                  <div className="mt-4 flex items-center gap-3 border-t border-border/30 pt-4">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {t.initials}
                    </div>
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BONUSES */}
      {sl.bonuses && sl.bonuses.length > 0 && (
        <section className="container py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-primary">
                Bônus exclusivos
              </p>
              <h2 className="mt-2 text-balance text-3xl font-bold md:text-4xl">
                E mais 3 materiais que vêm junto
              </h2>
              <p className="mt-3 text-balance text-muted-foreground">
                Tudo incluso no mesmo pagamento. Acesso imediato.
              </p>
            </div>
            <div className="mt-10 space-y-4">
              {sl.bonuses.map((b, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-primary/20 bg-card/50 p-6 backdrop-blur md:p-8"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold md:text-xl">{b.title}</h3>
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                      {b.value_label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground md:text-base">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GUARANTEE */}
      {sl.guarantee && (
        <section className="container py-16">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-8 text-center md:p-12">
              <h2 className="text-balance text-2xl font-bold md:text-3xl">
                {sl.guarantee.title}
              </h2>
              <p className="mt-4 text-base text-muted-foreground md:text-lg">
                {sl.guarantee.text}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SCARCITY / PRICE BLOCK */}
      <section className="container py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/60 to-background p-8 text-center md:p-12">
          {sl.scarcity && (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                {sl.scarcity.title}
              </p>
              <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
                {sl.scarcity.text}
              </p>
            </>
          )}

          <div className="mt-8">
            {discountPct && ebook.original_price_cents && (
              <p className="text-base text-muted-foreground">
                De{" "}
                <span className="line-through">
                  {brl(ebook.original_price_cents)}
                </span>{" "}
                por apenas
              </p>
            )}
            <p className="mt-2 text-6xl font-black tracking-tight text-primary md:text-7xl">
              {brl(ebook.price_cents)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              pagamento único · acesso vitalício
            </p>
          </div>

          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="gradient"
              className="h-16 w-full max-w-md px-8 text-base font-bold md:text-lg"
            >
              <a
                href={goUrl("price_block")}
                target="_blank"
                rel="noopener noreferrer sponsored"
              >
                Quero acessar o método agora
              </a>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Garantia de 7 dias · PIX confirma em segundos · Discreto na cobrança
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {sl.faq && sl.faq.length > 0 && (
        <section className="container py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-balance text-center text-3xl font-bold md:text-4xl">
              Perguntas frequentes
            </h2>
            <div className="mt-8 space-y-3">
              {sl.faq.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-border/50 bg-card/30 p-5 transition open:border-primary/40 open:bg-card/50"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-base font-semibold">{item.q}</span>
                      <span className="shrink-0 rounded-full border border-border/50 px-2 py-0.5 text-xs text-muted-foreground transition group-open:rotate-45">
                        +
                      </span>
                    </div>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="container py-16 md:py-24">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-card to-card p-10 text-center md:p-16">
          <h2 className="text-balance text-3xl font-bold md:text-5xl">
            Você está a 5 passos de viver isso de verdade.
          </h2>
          <p className="mt-5 text-balance text-muted-foreground md:text-lg">
            Ou continua mais 3, 5, 10 anos só pensando. A escolha é literalmente
            um click.
          </p>
          <Button
            asChild
            size="lg"
            variant="gradient"
            className="mt-10 h-16 w-full max-w-md px-8 text-base font-bold md:text-lg"
          >
            <a href={goUrl("final")} target="_blank" rel="noopener noreferrer sponsored">
              Acessar o método agora — {brl(ebook.price_cents)}
            </a>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Pagamento seguro Hotmart · Garantia 7 dias · Acesso imediato
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-xs text-muted-foreground/60 hover:text-foreground"
          >
            Voltar para a home
          </Link>
        </div>
      </section>
    </div>
  );
}

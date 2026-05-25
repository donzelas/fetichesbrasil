import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BreadcrumbJsonLd, CollectionPageJsonLd } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";

export const metadata: Metadata = {
  title: "Todos os fetiches: lista completa brasileira",
  description:
    "Mais de 100 preferências íntimas catalogadas em 8 categorias, com guia educativo entre adultos consensuais brasileiros. Encontre a sua aqui.",
  keywords: [
    "lista de fetiches",
    "fetiches brasil",
    "tipos de fetiches",
    "todos os fetiches",
    "comunidade fetiches BR",
    "kinks lista",
  ],
  alternates: { canonical: "/fetiches" },
  openGraph: {
    title: "Todos os fetiches: lista completa brasileira",
    description:
      "Mais de 100 preferências catalogadas em 8 categorias com guia educativo entre adultos consensuais.",
    url: `${SITE_URL}/fetiches`,
    type: "website",
    siteName: "Fetiches Brasil",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Todos os fetiches: lista brasileira completa",
    description: "100+ preferências em 8 categorias. Comunidade brasileira +18.",
  },
};

interface CategoryWithFetishes {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  sort_order: number;
  fetishes: Array<{ id: string; name: string; slug: string; sort_order: number }>;
}

async function getCategories(): Promise<CategoryWithFetishes[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug, emoji, sort_order, fetishes(id, name, slug, sort_order)")
      .order("sort_order");
    return (data ?? []) as CategoryWithFetishes[];
  } catch {
    return [];
  }
}

export default async function FetichesIndexPage() {
  const categories = await getCategories();
  const totalFetishes = categories.reduce((sum, c) => sum + c.fetishes.length, 0);

  // Para o CollectionPageJsonLd
  const allFetishes = categories.flatMap((c) =>
    c.fetishes.map((f) => ({ name: f.name, url: `/fetiches/${f.slug}` }))
  );

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <CollectionPageJsonLd
        name="Todos os fetiches catalogados"
        description={`Lista completa de ${totalFetishes} preferências íntimas em ${categories.length} categorias entre adultos consensuais brasileiros.`}
        url={`${SITE_URL}/fetiches`}
        items={allFetishes}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Fetiches", url: "/fetiches" },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para home
        </Link>
      </Button>

      <header className="space-y-3 border-b border-border/40 pb-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Todos os fetiches catalogados
        </h1>
        <p className="text-lg text-muted-foreground">
          <strong>{totalFetishes}</strong> preferências em{" "}
          <strong>{categories.length}</strong> categorias, com guia educativo entre
          adultos consensuais brasileiros. Clique em qualquer fetiche pra ver detalhes,
          dicas de segurança e onde encontrar comunidade.
        </p>
      </header>

      {/* Navegacao rapida por categoria */}
      <nav className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`#${cat.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-sm hover:border-primary/50 hover:text-primary"
          >
            <span>{cat.emoji ?? ""}</span>
            <span>{cat.name}</span>
            <span className="text-xs text-muted-foreground">({cat.fetishes.length})</span>
          </a>
        ))}
      </nav>

      {/* Lista por categoria */}
      {categories.map((cat) => (
        <section key={cat.id} id={cat.slug} className="space-y-3 scroll-mt-20">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-2">
            <h2 className="text-2xl font-semibold">
              <Link
                href={`/categorias/${cat.slug}`}
                className="hover:text-primary"
              >
                {cat.emoji ?? ""} {cat.name}
              </Link>
            </h2>
            <Link
              href={`/categorias/${cat.slug}`}
              className="text-xs text-primary hover:underline"
            >
              ver categoria →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {cat.fetishes
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((f) => (
                <Link
                  key={f.id}
                  href={`/fetiches/${f.slug}`}
                  className="rounded-md border border-border/40 bg-card/30 px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-card/60 hover:text-primary"
                >
                  {f.name}
                </Link>
              ))}
          </div>
        </section>
      ))}

      <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-5">
        <h2 className="text-xl font-semibold">
          Entre na comunidade brasileira
        </h2>
        <p className="text-sm text-muted-foreground">
          Cadastro gratuito. Salas temáticas pra cada fetiche. Chat em tempo real com
          gente real do Brasil. Exclusivo +18, sem julgamento.
        </p>
        <div className="flex gap-2 pt-2">
          <Button asChild>
            <Link href="/cadastro">
              <Sparkles className="h-4 w-4" />
              Criar conta grátis
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/salas">
              <MessageCircle className="h-4 w-4" />
              Ver salas ativas
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

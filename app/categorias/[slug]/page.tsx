import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
} from "@/components/seo/JsonLd";

export const revalidate = 86400;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  fetishes: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
}

async function getCategory(slug: string): Promise<CategoryData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, emoji, fetishes(id, name, slug, description)")
    .eq("slug", slug)
    .single();
  return data as CategoryData | null;
}

export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("categories").select("slug");
    return (data ?? []).map((c) => ({ slug: c.slug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) return {};

  const title = `${cat.name}: todas as preferências brasileiras`;
  const description = `Lista completa de preferências íntimas em ${cat.name.toLowerCase()} entre adultos consensuais no Brasil. ${cat.fetishes.length} variações catalogadas com guia educativo.`;

  return {
    title,
    description,
    keywords: [
      cat.name.toLowerCase(),
      `${cat.name.toLowerCase()} brasil`,
      `lista ${cat.name.toLowerCase()}`,
      `comunidade ${cat.name.toLowerCase()}`,
      "fetiches brasil",
    ],
    alternates: { canonical: `/categorias/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/categorias/${slug}`,
      type: "website",
      siteName: "Fetiches Brasil",
      locale: "pt_BR",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const url = `${SITE_URL}/categorias/${slug}`;

  return (
    <div className="container max-w-4xl space-y-8 py-8">
      <CollectionPageJsonLd
        name={cat.name}
        description={`Lista completa de preferências em ${cat.name} entre adultos consensuais brasileiros.`}
        url={url}
        items={cat.fetishes.map((f) => ({
          name: f.name,
          url: `/fetiches/${f.slug}`,
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Categorias", url: "/" },
          { name: cat.name, url: `/categorias/${slug}` },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para home
        </Link>
      </Button>

      <header className="space-y-3 border-b border-border/40 pb-6">
        <p className="text-sm text-muted-foreground">Categoria</p>
        <h1 className="text-4xl font-bold tracking-tight">
          {cat.emoji ?? ""} {cat.name}
        </h1>
        <p className="text-lg text-muted-foreground">
          {cat.fetishes.length} preferências catalogadas dentro de{" "}
          <strong>{cat.name.toLowerCase()}</strong>, entre adultos consensuais brasileiros.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">
          Sobre {cat.name.toLowerCase()}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A categoria <strong>{cat.name}</strong> reúne preferências íntimas que
          compartilham temas comuns dentro do universo adulto consensual. Cada uma das{" "}
          {cat.fetishes.length} variações abaixo tem sua própria página com guia
          educativo, dicas de segurança, mitos comuns e onde encontrar comunidade
          brasileira.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">
          Todas as preferências em {cat.name}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {cat.fetishes.map((f) => (
            <Card
              key={f.id}
              className="transition hover:border-primary/50 hover:bg-card/60"
            >
              <CardContent className="space-y-1.5 py-4">
                <Link
                  href={`/fetiches/${f.slug}`}
                  className="block text-base font-semibold hover:text-primary"
                >
                  {f.name}
                </Link>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {f.description ??
                    `Saiba mais sobre ${f.name.toLowerCase()} entre adultos consensuais no Brasil — significado, dicas e comunidade.`}
                </p>
                <Link
                  href={`/fetiches/${f.slug}`}
                  className="inline-block text-xs text-primary hover:underline"
                >
                  Ler guia completo →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-5">
        <h2 className="text-xl font-semibold">
          Entre na comunidade brasileira
        </h2>
        <p className="text-sm text-muted-foreground">
          Cadastro gratuito. Salas temáticas pra cada uma das preferências acima. Chat
          em tempo real com gente real do Brasil. Exclusivo +18.
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

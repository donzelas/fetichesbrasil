import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
  FAQPageJsonLd,
} from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface SeoContent {
  intro: string;
  sections: Array<{ title: string; body: string }>;
  faqs: Array<{ q: string; a: string }>;
  internal_links_hint?: string[];
}

interface FetishData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  category: {
    name: string;
    slug: string;
    emoji: string | null;
  } | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  seo_content: SeoContent | null;
}

async function getFetish(slug: string): Promise<FetishData | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fetishes")
      .select(
        "id, name, slug, description, category_id, category:categories(name, slug, emoji), seo_title, seo_description, seo_keywords, seo_content"
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("[fetiches/slug] erro Supabase:", error.message);
      return null;
    }
    return data as FetishData | null;
  } catch (e) {
    console.error("[fetiches/slug] erro inesperado:", e);
    return null;
  }
}

async function getRelacionadas(categoryId: string | null, excludeSlug: string) {
  if (!categoryId) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fetishes")
      .select("name, slug")
      .eq("category_id", categoryId)
      .neq("slug", excludeSlug)
      .order("sort_order")
      .limit(8);
    return (data ?? []) as Array<{ name: string; slug: string }>;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fetish = await getFetish(slug);
  if (!fetish) return {};

  // Prefere SEO content gerado pela IA, fallback pro template
  const title =
    fetish.seo_title ||
    `${fetish.name}: o que é, como começar e comunidade brasileira`;
  const description =
    fetish.seo_description ||
    `Tudo sobre ${fetish.name.toLowerCase()} entre adultos consensuais no Brasil. Significado, dicas de segurança, mitos e onde conhecer outras pessoas com a mesma preferência.`;
  const keywords =
    fetish.seo_keywords?.length
      ? fetish.seo_keywords
      : [
          fetish.name.toLowerCase(),
          `o que é ${fetish.name.toLowerCase()}`,
          `${fetish.name.toLowerCase()} brasil`,
          `${fetish.name.toLowerCase()} significado`,
          `comunidade ${fetish.name.toLowerCase()}`,
          `lifestyle ${fetish.name.toLowerCase()}`,
        ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/fetiches/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/fetiches/${slug}`,
      type: "article",
      siteName: "Fetiches Brasil",
      locale: "pt_BR",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FetishPage({ params }: PageProps) {
  const { slug } = await params;
  const fetish = await getFetish(slug);
  if (!fetish) notFound();

  // Busca outras fetiches da mesma categoria (internal linking)
  const relacionadas = await getRelacionadas(fetish.category_id, slug);

  const url = `${SITE_URL}/fetiches/${slug}`;
  const fetishName = fetish.name;
  const categoryName = fetish.category?.name ?? "Lifestyle";

  // Conteudo SEO unico (gerado por IA) OU template default
  const usingAiContent = !!fetish.seo_content;
  const faqs = usingAiContent
    ? (fetish.seo_content?.faqs ?? []).map((f) => ({
        question: f.q,
        answer: f.a,
      }))
    : [
        {
          question: `O que é ${fetishName.toLowerCase()}?`,
          answer: `${fetishName} é uma preferência íntima dentro da categoria ${categoryName} comum entre adultos consensuais. Praticada com comunicação clara e respeito mútuo, é uma forma legítima de explorar a sexualidade entre pessoas maiores de 18 anos.`,
        },
        {
          question: `${fetishName} é normal?`,
          answer: `Sim. Pesquisas de comportamento sexual mostram que preferências específicas como ${fetishName.toLowerCase()} são bastante comuns. O importante é a prática ser consensual, entre adultos e segura.`,
        },
        {
          question: `Como conversar sobre ${fetishName.toLowerCase()} com o parceiro?`,
          answer: `Comunicação aberta é a base. Escolha um momento neutro (não durante intimidade), explique o que te atrai, pergunte como o parceiro se sente e respeite limites. Você não precisa fazer tudo já no primeiro dia — comece com pequenos passos.`,
        },
        {
          question: `Onde conhecer outras pessoas com essa mesma preferência no Brasil?`,
          answer: `Plataformas brasileiras voltadas pra adultos consensuais, como Fetiches Brasil, têm salas temáticas e comunidades específicas onde você pode conversar sem julgamento com pessoas que compartilham os mesmos interesses.`,
        },
        {
          question: `É seguro praticar ${fetishName.toLowerCase()}?`,
          answer: `Sim, quando há consentimento explícito, comunicação prévia sobre limites, palavra de segurança quando aplicável e respeito mútuo. Use o princípio SSC (são, seguro e consensual) ou RACK (risco assumido, consciente e ético).`,
        },
      ];

  return (
    <div className="container max-w-3xl space-y-8 py-8">
      <ArticleJsonLd
        title={`${fetishName}: significado, dicas e comunidade brasileira`}
        description={`Tudo sobre ${fetishName.toLowerCase()} entre adultos consensuais no Brasil.`}
        url={url}
        keywords={[fetishName, categoryName, "lifestyle adulto Brasil"]}
      />
      <FAQPageJsonLd items={faqs} />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Fetiches", url: "/fetiches" },
          { name: categoryName, url: `/categorias/${fetish.category?.slug ?? ""}` },
          { name: fetishName, url: `/fetiches/${slug}` },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <header className="space-y-3 border-b border-border/40 pb-6">
        <p className="text-sm text-muted-foreground">
          {fetish.category?.emoji ?? ""}{" "}
          <Link
            href={`/categorias/${fetish.category?.slug ?? ""}`}
            className="hover:text-foreground hover:underline"
          >
            {categoryName}
          </Link>
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          {fetishName}: o que é, como começar e comunidade brasileira
        </h1>
        <p className="text-lg text-muted-foreground">
          Tudo o que você precisa saber sobre <strong>{fetishName.toLowerCase()}</strong>{" "}
          entre adultos consensuais no Brasil — significado, dicas de segurança, mitos
          comuns e onde encontrar outras pessoas com a mesma preferência.
        </p>
      </header>

      <article className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
        {usingAiContent && fetish.seo_content ? (
          <>
            {/* Intro (gerada por IA) */}
            <section className="space-y-3">
              {fetish.seo_content.intro.split(/\n\n+/).map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </section>

            {/* Sections geradas por IA */}
            {fetish.seo_content.sections.map((s, idx) => (
              <section key={idx} className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  {s.title}
                </h2>
                {s.body.split(/\n\n+/).map((p, j) => (
                  <p key={j}>{p.trim()}</p>
                ))}
              </section>
            ))}
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">
                O que é {fetishName.toLowerCase()}?
              </h2>
              <p>
                <strong>{fetishName}</strong> é uma preferência íntima inserida na categoria{" "}
                <strong>{categoryName}</strong>, praticada entre adultos consensuais maiores
                de 18 anos. Pode ser explorada em diferentes intensidades, desde uma fantasia
                ocasional até uma dinâmica regular dentro do relacionamento.
              </p>
              {fetish.description && <p>{fetish.description}</p>}
              <p>
                Como qualquer prática íntima entre adultos, o essencial é{" "}
                <strong>consentimento mútuo, comunicação clara e respeito aos limites</strong>{" "}
                de cada pessoa envolvida.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">
                Como começar com segurança
              </h2>
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong>Comunique antes</strong>: nunca surpreenda um parceiro com algo
                  novo durante o momento íntimo.
                </li>
                <li>
                  <strong>Defina limites claros</strong>: use uma escala simples como
                  "verde, amarelo, vermelho".
                </li>
                <li>
                  <strong>Palavra de segurança</strong>: combine uma palavra que significa
                  "parar imediatamente, sem discussão".
                </li>
                <li>
                  <strong>Comece devagar</strong>: pequenos passos com check-in entre cada
                  um criam confiança.
                </li>
                <li>
                  <strong>Aftercare</strong>: depois de práticas mais intensas, dedique
                  tempo ao cuidado mútuo.
                </li>
              </ul>
            </section>
          </>
        )}

        <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-5 not-prose">
          <h2 className="text-xl font-semibold text-foreground">
            Entre na comunidade brasileira
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastro gratuito. Mais de 100 preferências catalogadas. Chat em tempo real
            com gente real do Brasil. Exclusivo +18.
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

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border border-border/50 bg-card/40 p-4 not-prose"
              >
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </article>

      {relacionadas.length > 0 && (
        <section className="space-y-3 border-t border-border/40 pt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Mais sobre {categoryName}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {relacionadas.map((r) => (
              <Card key={r.slug} className="transition hover:border-primary/40">
                <CardContent className="py-3">
                  <Link
                    href={`/fetiches/${r.slug}`}
                    className="block text-sm font-medium hover:text-primary"
                  >
                    {r.name}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

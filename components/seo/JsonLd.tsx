/**
 * Componentes de Structured Data (JSON-LD) para SEO.
 *
 * - OrganizationJsonLd: identifica a marca pro Google
 * - WebsiteJsonLd: habilita SearchAction (sitelinks search box)
 * - AdultContentJsonLd: declara hasAdultConsideration (compliance Google 2025+)
 * - ArticleJsonLd: por artigo de blog ou fetiche
 * - FAQPageJsonLd: por seção de perguntas frequentes
 * - BreadcrumbJsonLd: navegação hierárquica
 *
 * Renderizado server-side via <script type="application/ld+json">.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";
const SITE_NAME = "Fetiches Brasil";
const SITE_LOGO = `${SITE_URL}/logo.png`;

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO,
      width: 512,
      height: 512,
    },
    description:
      "Comunidade brasileira de adultos consensuais. Plataforma 18+ de chat, salas temáticas e blog educativo sobre lifestyle e preferências íntimas.",
    sameAs: [
      // Adicionar quando criar contas:
      // "https://twitter.com/fetichesbrasil",
      // "https://www.tiktok.com/@fetichesbrasil",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contato@fetichesbrasil.com.br",
      contactType: "customer service",
      areaServed: "BR",
      availableLanguage: ["Portuguese"],
    },
    audience: {
      "@type": "PeopleAudience",
      suggestedMinAge: 18,
    },
    knowsLanguage: ["pt-BR"],
    areaServed: { "@type": "Country", name: "Brazil" },
  };
  return <JsonLdScript data={data} />;
}

export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description:
      "Comunidade brasileira de adultos consensuais com 94 preferências catalogadas.",
    publisher: { "@id": `${SITE_URL}#organization` },
    inLanguage: "pt-BR",
    // Declaracao oficial pro Google de conteudo adulto
    // https://developers.google.com/search/docs/appearance/structured-data/merchant-listing#hasadultconsideration
    hasAdultConsideration: "https://schema.org/SexualContentConsideration",
    isFamilyFriendly: false,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return <JsonLdScript data={data} />;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
  return <JsonLdScript data={data} />;
}

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  keywords?: string[];
}

export function ArticleJsonLd({
  title,
  description,
  url,
  imageUrl,
  publishedAt,
  updatedAt,
  author = SITE_NAME,
  keywords,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    image: imageUrl
      ? imageUrl.startsWith("http")
        ? imageUrl
        : `${SITE_URL}${imageUrl}`
      : `${SITE_URL}/og-image.png`,
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: { "@type": "Organization", name: author },
    publisher: { "@id": `${SITE_URL}#organization` },
    inLanguage: "pt-BR",
    isFamilyFriendly: false,
    hasAdultConsideration: "https://schema.org/SexualContentConsideration",
    keywords: keywords?.join(", "),
    audience: {
      "@type": "PeopleAudience",
      suggestedMinAge: 18,
    },
  };
  return <JsonLdScript data={data} />;
}

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageJsonLd({ items }: { items: FAQItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return <JsonLdScript data={data} />;
}

interface CollectionPageJsonLdProps {
  name: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
  items,
}: CollectionPageJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    inLanguage: "pt-BR",
    isFamilyFriendly: false,
    hasAdultConsideration: "https://schema.org/SexualContentConsideration",
    hasPart: items.map((item) => ({
      "@type": "WebPage",
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
  return <JsonLdScript data={data} />;
}

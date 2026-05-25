import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";

/**
 * robots.txt dinamico.
 *
 * - Permite Googlebot, Bingbot, DuckDuckBot crawlearem tudo
 * - BLOQUEIA crawlers de IA generativa (OpenAI, Anthropic, Google AI, etc):
 *   eles roubam o conteudo pra treinar modelos sem nos pagar nem citar
 * - Bloqueia areas privadas (admin, api, perfil)
 * - Aponta pro sitemap
 *
 * Disponivel em /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Search engines reais - permitir tudo exceto privado
      {
        userAgent: ["Googlebot", "Bingbot", "DuckDuckBot", "Yandex", "Baiduspider"],
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/perfil",
          "/(auth)/*",
          "/login",
          "/cadastro",
          "/reset-password",
        ],
      },
      // AI crawlers - bloqueio total (protege conteudo de scraping IA)
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "anthropic-ai",
          "Claude-Web",
          "ClaudeBot",
          "Google-Extended",
          "CCBot",
          "PerplexityBot",
          "cohere-ai",
          "Bytespider",
          "Applebot-Extended",
          "Meta-ExternalAgent",
          "Meta-ExternalFetcher",
          "FacebookBot",
          "Diffbot",
          "Omgilibot",
          "ImagesiftBot",
          "Timpibot",
          "Webzio-Extended",
        ],
        disallow: "/",
      },
      // Demais bots - permitir mas com restricoes
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/perfil",
          "/(auth)/*",
          "/login",
          "/cadastro",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";

/**
 * Sitemap dinamico gerado em build (e a cada hora em runtime).
 * Inclui:
 *   - Paginas estaticas (home, blog, premium, legal)
 *   - 1 pagina por fetiche cadastrado (94)
 *   - 1 pagina por categoria (9)
 *   - 1 pagina por post de blog aprovado
 *
 * Disponivel em /sitemap.xml. Submeter no Google Search Console.
 */
export const revalidate = 3600; // 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Paginas estaticas (criticas)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/salas`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/premium`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Tenta buscar dados dinamicos. Se falhar (ex: build sem .env),
  // ainda devolve o sitemap estatico pra Google indexar o basico.
  try {
    const supabase = await createClient();

    const [
      { data: categories },
      { data: fetishes },
      { data: posts },
    ] = await Promise.all([
      supabase.from("categories").select("slug, name").order("sort_order"),
      supabase
        .from("fetishes")
        .select("slug, name, category:categories(slug)")
        .order("sort_order"),
      supabase
        .from("blog_posts")
        .select("id, last_activity_at")
        .eq("status", "approved")
        .is("deleted_at", null)
        .order("last_activity_at", { ascending: false })
        .limit(5000),
    ]);

    const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
      url: `${SITE_URL}/categorias/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const fetishePages: MetadataRoute.Sitemap = (fetishes ?? []).map((f) => ({
      url: `${SITE_URL}/fetiches/${f.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
      url: `${SITE_URL}/blog/${p.id}`,
      lastModified: p.last_activity_at ? new Date(p.last_activity_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    return [...staticPages, ...categoryPages, ...fetishePages, ...blogPages];
  } catch {
    return staticPages;
  }
}

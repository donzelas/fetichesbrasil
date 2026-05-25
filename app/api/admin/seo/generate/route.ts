import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFetishSeoContent } from "@/lib/seo/generate-fetish-content";

/**
 * Gera conteudo SEO unico pra 1 fetiche por chamada.
 *
 * Body:
 *   { slug: "dominacao" }      -> gera esse especifico (mesmo se ja tem)
 *   { mode: "next" }           -> gera o proximo pendente (recomendado pra loop)
 *   { mode: "next", force: true } -> regera o proximo, ignora se ja tem
 *
 * Resposta:
 *   { ok: true, slug, name, words, done: false }
 *   { ok: true, done: true }   -> nao tem mais pendentes
 *
 * O frontend chama em loop ate done:true.
 * Cada chamada leva ~5-10s. Pra 100 fetiches = ~10 min total.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    mode?: "next";
    force?: boolean;
  };

  const admin = createAdminClient();

  // Decide qual fetiche processar
  let fetishQuery = admin
    .from("fetishes")
    .select("id, name, slug, category:categories(name)")
    .order("sort_order");

  if (body.slug) {
    fetishQuery = fetishQuery.eq("slug", body.slug);
  } else if (!body.force) {
    fetishQuery = fetishQuery.is("seo_content", null as never);
  }

  const { data: fetishes, error: queryError } = await fetishQuery.limit(1);
  if (queryError) {
    return NextResponse.json(
      { error: `Erro Supabase: ${queryError.message}` },
      { status: 500 }
    );
  }

  if (!fetishes || fetishes.length === 0) {
    return NextResponse.json({
      ok: true,
      done: true,
      message: "Nenhum fetiche pendente.",
    });
  }

  const fetish = fetishes[0] as {
    id: string;
    name: string;
    slug: string;
    category: { name: string } | null;
  };

  try {
    const result = await generateFetishSeoContent({
      name: fetish.name,
      slug: fetish.slug,
      categoryName: fetish.category?.name ?? "Geral",
    });

    const { error: updateError } = await admin
      .from("fetishes")
      .update({
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        seo_keywords: result.seo_keywords,
        seo_content: result.seo_content as never,
        seo_generated_at: new Date().toISOString(),
        seo_llm_provider: result.llm_provider,
        seo_llm_model: result.llm_model,
      })
      .eq("id", fetish.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Erro ao salvar: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      done: false,
      slug: fetish.slug,
      name: fetish.name,
      words: result.word_count,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Falha ao gerar conteudo: ${msg}`, slug: fetish.slug },
      { status: 500 }
    );
  }
}

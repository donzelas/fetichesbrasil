import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SeoGenerateButtons } from "@/components/admin/SeoGenerateButtons";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface FetishSeoRow {
  id: string;
  name: string;
  slug: string;
  seo_generated_at: string | null;
  seo_llm_provider: string | null;
  seo_llm_model: string | null;
  has_seo: boolean;
  category: { name: string; emoji: string | null } | null;
}

export default async function AdminSeoPage() {
  const supabase = await createClient();

  const { data: fetishesRaw } = await supabase
    .from("fetishes")
    .select(
      "id, name, slug, seo_generated_at, seo_llm_provider, seo_llm_model, seo_content, category:categories(name, emoji)"
    )
    .order("sort_order");

  type Raw = {
    id: string;
    name: string;
    slug: string;
    seo_generated_at: string | null;
    seo_llm_provider: string | null;
    seo_llm_model: string | null;
    seo_content: unknown;
    category: { name: string; emoji: string | null } | null;
  };

  const fetishes: FetishSeoRow[] = (fetishesRaw as Raw[] | null ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    seo_generated_at: f.seo_generated_at,
    seo_llm_provider: f.seo_llm_provider,
    seo_llm_model: f.seo_llm_model,
    has_seo: !!f.seo_content,
    category: f.category,
  }));

  const total = fetishes.length;
  const comSeo = fetishes.filter((f) => f.has_seo).length;
  const semSeo = total - comSeo;
  const pctComplete = total > 0 ? Math.round((comSeo / total) * 100) : 0;

  return (
    <div className="container max-w-5xl space-y-6 py-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO IA — Conteúdo único</h1>
          <p className="text-sm text-muted-foreground">
            Gera artigo único de 800-1500 palavras pra cada página de fetiche, via Groq
            Llama 3.3 70B. Substitui o conteúdo de template por algo que rankeia no
            Google.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/40">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Com conteúdo IA
            </p>
            <p className="text-2xl font-bold text-emerald-500">{comSeo}</p>
          </CardContent>
        </Card>
        <Card className={cn(semSeo > 0 && "border-amber-500/40")}>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Pendentes
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                semSeo > 0 ? "text-amber-500" : "text-muted-foreground"
              )}
            >
              {semSeo}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2 rounded-lg border border-border/50 bg-card/30 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>{pctComplete}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${pctComplete}%` }}
          />
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <h2 className="font-semibold">Gerar conteúdo SEO</h2>
              <p className="text-sm text-muted-foreground">
                Cada artigo gera em ~5 segundos via Groq. Rate limit: 30/minuto.
                Estimativa pra gerar todos os {semSeo} pendentes:{" "}
                <strong>~{Math.ceil(semSeo / 30)} minutos</strong>.
              </p>
            </div>
          </div>
          <SeoGenerateButtons pending={semSeo} total={total} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Status por fetiche ({total})
        </h2>
        <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50 bg-card">
          {fetishes.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-3 py-2 text-sm transition hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{f.category?.emoji ?? ""}</span>
                  <span>{f.category?.name ?? "?"}</span>
                </div>
                <p className="truncate text-sm font-medium">{f.name}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {f.seo_llm_provider && (
                  <span className="font-mono text-[10px]">
                    {f.seo_llm_provider}
                  </span>
                )}
                {f.seo_generated_at && (
                  <span>{formatRelativeTime(f.seo_generated_at)}</span>
                )}
              </div>

              {f.has_seo ? (
                <Badge className="shrink-0 gap-1 bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  pronto
                </Badge>
              ) : (
                <Badge className="shrink-0 gap-1 bg-amber-500/15 text-amber-600">
                  <FileText className="h-3 w-3" />
                  pendente
                </Badge>
              )}

              <Button asChild size="sm" variant="ghost">
                <Link href={`/fetiches/${f.slug}`} target="_blank">
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

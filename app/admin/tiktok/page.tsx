import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Hash,
  Loader2,
  Mic,
  PlayCircle,
  Send,
  Settings,
  Video,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminTiktokActions } from "@/components/admin/AdminTiktokActions";
import { GenerateTiktokModal } from "@/components/admin/GenerateTiktokModal";
import { TiktokProgressTimer } from "@/components/admin/TiktokProgressTimer";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

type Tab = "pending_approval" | "in_progress" | "posted" | "rejected" | "failed";

type DbStatus = NonNullable<
  import("@/types/database").TiktokScript["status"]
>;

interface PageProps {
  searchParams: Promise<{ tab?: Tab }>;
}

interface TiktokScriptRow {
  id: string;
  fetiche_id: string | null;
  titulo: string;
  hook: string;
  corpo: string;
  cta: string;
  hashtags: string[];
  broll_tags: string[];
  voz: string;
  llm_provider: string | null;
  llm_model: string | null;
  audio_path: string | null;
  srt_path: string | null;
  broll_paths: string[] | null;
  video_path: string | null;
  status: string;
  rejection_reason: string | null;
  failure_reason: string | null;
  approved_at: string | null;
  tiktok_share_url: string | null;
  posted_at: string | null;
  progress_message: string | null;
  progress_started_at: string | null;
  created_at: string;
  fetish: { name: string; category: { name: string; emoji: string | null } | null } | null;
}

const TABS: { id: Tab; label: string; statuses: DbStatus[] }[] = [
  { id: "pending_approval", label: "Pendentes", statuses: ["pending_approval"] },
  {
    id: "in_progress",
    label: "Em produção",
    statuses: ["approved", "processing", "audio_done", "broll_done", "srt_done", "ready_to_post"],
  },
  { id: "posted", label: "Publicados", statuses: ["posted", "posted_inbox"] },
  { id: "rejected", label: "Rejeitados", statuses: ["rejected"] },
  { id: "failed", label: "Com erro", statuses: ["failed"] },
];

const STATUS_LABELS: Record<string, { text: string; tone: string; icon: typeof Clock }> = {
  pending_approval: { text: "Aguardando aprovação", tone: "bg-amber-500/15 text-amber-600", icon: Clock },
  approved: { text: "Aprovado", tone: "bg-blue-500/15 text-blue-600", icon: CheckCircle2 },
  processing: { text: "Processando", tone: "bg-blue-500/15 text-blue-600", icon: Loader2 },
  audio_done: { text: "Áudio gerado", tone: "bg-blue-500/15 text-blue-600", icon: Mic },
  broll_done: { text: "B-roll baixado", tone: "bg-blue-500/15 text-blue-600", icon: Video },
  srt_done: { text: "Legendas prontas", tone: "bg-blue-500/15 text-blue-600", icon: Hash },
  ready_to_post: { text: "Pronto pra postar", tone: "bg-cyan-500/15 text-cyan-600", icon: Send },
  posted_inbox: { text: "Postado (inbox)", tone: "bg-emerald-500/15 text-emerald-600", icon: PlayCircle },
  posted: { text: "Publicado", tone: "bg-emerald-500/15 text-emerald-600", icon: PlayCircle },
  rejected: { text: "Rejeitado", tone: "bg-rose-500/15 text-rose-600", icon: XCircle },
  failed: { text: "Falhou", tone: "bg-rose-500/15 text-rose-600", icon: AlertCircle },
};

export default async function AdminTiktokPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab: Tab = (sp.tab as Tab) ?? "pending_approval";
  const supabase = await createClient();

  const tabConfig = TABS.find((t) => t.id === tab) ?? TABS[0];

  const countsPromises = TABS.map((t) =>
    supabase
      .from("tiktok_scripts")
      .select("*", { count: "exact", head: true })
      .in("status", t.statuses)
  );

  const [counts, { data: scriptsRaw }] = await Promise.all([
    Promise.all(countsPromises),
    supabase
      .from("tiktok_scripts")
      .select(
        `id, fetiche_id, titulo, hook, corpo, cta, hashtags, broll_tags, voz,
         llm_provider, llm_model, audio_path, srt_path, broll_paths, video_path,
         status, rejection_reason, failure_reason, approved_at, tiktok_share_url,
         posted_at, progress_message, progress_started_at, created_at,
         fetish:fetishes(name, category:categories(name, emoji))`
      )
      .in("status", tabConfig.statuses)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const scripts = (scriptsRaw ?? []) as unknown as TiktokScriptRow[];

  const countByTab = new Map<Tab, number>();
  TABS.forEach((t, i) => countByTab.set(t.id, counts[i].count ?? 0));

  return (
    <div className="container max-w-5xl space-y-4 py-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">← Voltar</Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">TikTok IA</h1>
          <p className="text-sm text-muted-foreground">
            Roteiros gerados pela IA. Aprove, rejeite ou reprocesse. Pipeline n8n cuida do resto.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/tiktok/config">
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
          </Button>
          <GenerateTiktokModal />
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/tiktok?tab=${t.id}`}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition",
              tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                tab === t.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {countByTab.get(t.id) ?? 0}
            </span>
            {tab === t.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </Link>
        ))}
      </nav>

      {scripts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum roteiro nesta aba.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
          {scripts.map((s) => {
            const statusInfo = STATUS_LABELS[s.status] ?? STATUS_LABELS.pending_approval;
            const StatusIcon = statusInfo.icon;
            const duracaoFalada = (s.hook + s.corpo + s.cta).length;

            return (
              <details key={s.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 transition hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="shrink-0">{formatRelativeTime(s.created_at)}</span>
                      {s.fetish && (
                        <>
                          <span>·</span>
                          <span className="shrink-0">
                            {s.fetish.category?.emoji ?? ""} {s.fetish.name}
                          </span>
                        </>
                      )}
                      {s.llm_provider && (
                        <>
                          <span>·</span>
                          <span className="shrink-0 font-mono text-[10px]">
                            {s.llm_provider}/{s.llm_model ?? "?"}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium">{s.titulo}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{s.hook}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span title={`${duracaoFalada} caracteres`}>~{Math.ceil(duracaoFalada / 15)}s</span>
                    {s.video_path && <Video className="h-3 w-3 text-emerald-500" aria-label="vídeo pronto" />}
                  </div>

                  <Badge className={cn("shrink-0 gap-1 uppercase", statusInfo.tone)}>
                    <StatusIcon className={cn("h-3 w-3", s.status === "processing" && "animate-spin")} />
                    {statusInfo.text}
                  </Badge>

                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                </summary>

                <div className="px-3 pb-2">
                  <TiktokProgressTimer
                    status={s.status}
                    startedAt={s.progress_started_at ?? s.approved_at}
                    message={s.progress_message}
                  />
                </div>

                <div className="space-y-3 border-t border-border/60 bg-muted/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{s.titulo}</h3>
                    <AdminTiktokActions
                      scriptId={s.id}
                      status={s.status}
                      hasVideo={!!s.video_path}
                      videoPath={s.video_path}
                      shareUrl={s.tiktok_share_url}
                      editable={{
                        titulo: s.titulo,
                        hook: s.hook,
                        corpo: s.corpo,
                        cta: s.cta,
                        hashtags: s.hashtags,
                        broll_tags: s.broll_tags,
                        voz: s.voz,
                      }}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Hook (3s)
                        </p>
                        <p className="text-sm">{s.hook}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Corpo
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{s.corpo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          CTA
                        </p>
                        <p className="text-sm">{s.cta}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Hashtags
                        </p>
                        <p className="font-mono text-xs">{s.hashtags.join(" ")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          B-roll tags
                        </p>
                        <p className="text-xs">{s.broll_tags.join(", ")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Voz
                        </p>
                        <p className="font-mono text-xs">{s.voz}</p>
                      </div>
                      {s.posted_at && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Postado
                          </p>
                          <p className="text-xs">
                            {formatRelativeTime(s.posted_at)}
                            {s.tiktok_share_url && (
                              <>
                                {" · "}
                                <a
                                  href={s.tiktok_share_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  Abrir no TikTok
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {s.rejection_reason && (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-600">
                      <strong>Rejeitado:</strong> {s.rejection_reason}
                    </div>
                  )}

                  {s.failure_reason && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700">
                      <strong>Falha no pipeline:</strong> {s.failure_reason}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { ChevronRight, ImageIcon, MessageCircle, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { DeleteDmThreadButton } from "./DeleteDmThreadButton";

export const dynamic = "force-dynamic";

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ThreadRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
  last_message_at: string | null;
  user_a: ProfileLite | null;
  user_b: ProfileLite | null;
}

type RangeKey = "24h" | "7d" | "30d" | "all";

const RANGES: { id: RangeKey; label: string; hours: number | null }[] = [
  { id: "24h", label: "Hoje", hours: 24 },
  { id: "7d", label: "7 dias", hours: 24 * 7 },
  { id: "30d", label: "30 dias", hours: 24 * 30 },
  { id: "all", label: "Tudo", hours: null },
];

function parseRange(input: string | undefined): RangeKey {
  const valid = RANGES.map((r) => r.id);
  return (valid as string[]).includes(input ?? "")
    ? (input as RangeKey)
    : "all";
}

export default async function AdminDmThreadsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const supabase = await createClient();

  // Construcao da query: filtra por last_message_at (ou created_at quando nao houver)
  // dentro da janela escolhida.
  const hours = RANGES.find((r) => r.id === range)?.hours ?? null;
  const sinceIso = hours
    ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    : null;

  let query = supabase
    .from("dm_threads")
    .select(
      `id, user_a_id, user_b_id, created_at, last_message_at,
       user_a:profiles!dm_threads_user_a_id_fkey(id, username, display_name, avatar_url),
       user_b:profiles!dm_threads_user_b_id_fkey(id, username, display_name, avatar_url)`
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (sinceIso) {
    // OR: last_message_at >= sinceIso OU (last_message_at IS NULL AND created_at >= sinceIso)
    query = query.or(
      `last_message_at.gte.${sinceIso},and(last_message_at.is.null,created_at.gte.${sinceIso})`
    );
  }

  const { data: threadsRaw } = await query;
  const threads = (threadsRaw ?? []) as unknown as ThreadRow[];

  // Contagem total de threads (todas, pra mostrar o "X de Y" filtrando)
  const { count: totalThreads } = await supabase
    .from("dm_threads")
    .select("*", { count: "exact", head: true });

  const counts = await Promise.all(
    threads.map(async (t) => {
      const [{ count: total }, { count: images }] = await Promise.all([
        supabase
          .from("dm_messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", t.id),
        supabase
          .from("dm_messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", t.id)
          .not("image_path", "is", null),
      ]);
      return { id: t.id, total: total ?? 0, images: images ?? 0 };
    })
  );

  const countsMap = new Map(counts.map((c) => [c.id, c]));

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chats individuais</h1>
        <p className="text-muted-foreground">
          {threads.length} {threads.length === 1 ? "conversa" : "conversas"}{" "}
          {range !== "all" && `(de ${totalThreads ?? 0} no total)`} · Admin
          enxerga todas as mensagens e imagens, inclusive expiradas.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border/60">
        {RANGES.map((r) => {
          const active = r.id === range;
          return (
            <Link
              key={r.id}
              href={`/admin/mensagens?range=${r.id}`}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {threads.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {range === "all"
                  ? "Nenhuma conversa privada criada ainda."
                  : "Nenhuma conversa nesse intervalo."}
              </div>
            )}

            {threads.map((t) => {
              const c = countsMap.get(t.id) ?? { total: 0, images: 0 };
              const a = t.user_a;
              const b = t.user_b;
              const nameA = a?.display_name ?? a?.username ?? "Usuário removido";
              const nameB = b?.display_name ?? b?.username ?? "Usuário removido";
              const roomName = `${nameA} ↔ ${nameB}`;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-muted/30"
                >
                  <Link
                    href={`/admin/mensagens/${t.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <MessagesSquare className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{roomName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{a?.username ?? "?"} · @{b?.username ?? "?"}
                      </p>
                    </div>
                  </Link>

                  <Link
                    href={`/admin/mensagens/${t.id}`}
                    className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {c.total}
                    </span>
                    <span
                      className={
                        c.images > 0
                          ? "inline-flex items-center gap-1 text-primary"
                          : "inline-flex items-center gap-1"
                      }
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {c.images}
                    </span>
                    <span className="hidden sm:inline">
                      {t.last_message_at
                        ? formatRelativeTime(t.last_message_at)
                        : formatRelativeTime(t.created_at)}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>

                  <DeleteDmThreadButton threadId={t.id} label={roomName} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

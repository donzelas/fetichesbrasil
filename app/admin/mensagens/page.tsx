import Link from "next/link";
import { ChevronRight, ImageIcon, MessageCircle, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils/format";

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

export default async function AdminDmThreadsPage() {
  const supabase = await createClient();

  const { data: threadsRaw } = await supabase
    .from("dm_threads")
    .select(
      `id, user_a_id, user_b_id, created_at, last_message_at,
       user_a:profiles!dm_threads_user_a_id_fkey(id, username, display_name, avatar_url),
       user_b:profiles!dm_threads_user_b_id_fkey(id, username, display_name, avatar_url)`
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const threads = (threadsRaw ?? []) as unknown as ThreadRow[];

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
          {threads.length} {threads.length === 1 ? "conversa" : "conversas"} privadas. Admin
          enxerga todas as mensagens e imagens, inclusive expiradas.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {threads.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma conversa privada criada ainda.
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
                <Link
                  key={t.id}
                  href={`/admin/mensagens/${t.id}`}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <MessagesSquare className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{roomName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{a?.username ?? "?"} · @{b?.username ?? "?"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
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
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

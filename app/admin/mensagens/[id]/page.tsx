import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

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

interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  read_at: string | null;
  image_path: string | null;
  expires_at: string | null;
}

const DM_IMAGE_BUCKET = "dm-images";

export default async function AdminDmThreadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: threadRaw } = await supabase
    .from("dm_threads")
    .select(
      `id, user_a_id, user_b_id, created_at, last_message_at,
       user_a:profiles!dm_threads_user_a_id_fkey(id, username, display_name, avatar_url),
       user_b:profiles!dm_threads_user_b_id_fkey(id, username, display_name, avatar_url)`
    )
    .eq("id", id)
    .single();

  if (!threadRaw) notFound();
  const thread = threadRaw as unknown as ThreadRow;

  const { data: messagesRaw } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .limit(2000);

  const messages = (messagesRaw ?? []) as MessageRow[];

  const admin = createAdminClient();
  const signedUrlByPath = new Map<string, string>();
  const paths = messages.map((m) => m.image_path).filter((p): p is string => !!p);
  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from(DM_IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 30);
    if (signed) {
      for (const s of signed) {
        if (s.path && s.signedUrl) {
          signedUrlByPath.set(s.path, s.signedUrl);
        }
      }
    }
  }

  const profileById = new Map<string, ProfileLite>();
  if (thread.user_a) profileById.set(thread.user_a.id, thread.user_a);
  if (thread.user_b) profileById.set(thread.user_b.id, thread.user_b);

  const totalImages = messages.filter((m) => m.image_path).length;
  const expiredImages = messages.filter(
    (m) => m.image_path && m.expires_at && new Date(m.expires_at).getTime() < Date.now()
  ).length;

  return (
    <div className="container max-w-3xl space-y-4 py-6">
      <Link
        href="/admin/mensagens"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <Avatar className="h-10 w-10 border-2 border-background">
                {thread.user_a?.avatar_url && <AvatarImage src={thread.user_a.avatar_url} />}
                <AvatarFallback>
                  {(thread.user_a?.display_name ?? thread.user_a?.username ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Avatar className="h-10 w-10 border-2 border-background">
                {thread.user_b?.avatar_url && <AvatarImage src={thread.user_b.avatar_url} />}
                <AvatarFallback>
                  {(thread.user_b?.display_name ?? thread.user_b?.username ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {thread.user_a?.display_name ?? thread.user_a?.username ?? "?"}
                <span className="mx-2 text-muted-foreground">↔</span>
                {thread.user_b?.display_name ?? thread.user_b?.username ?? "?"}
              </h1>
              <p className="text-xs text-muted-foreground">
                @{thread.user_a?.username ?? "?"} · @{thread.user_b?.username ?? "?"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div>
              <p>Total mensagens</p>
              <p className="text-base font-semibold text-foreground">{messages.length}</p>
            </div>
            <div>
              <p>Imagens</p>
              <p className="text-base font-semibold text-foreground">
                {totalImages}{" "}
                {expiredImages > 0 && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({expiredImages} expiradas)
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma mensagem nesta conversa.
            </p>
          )}

          {messages.map((m) => {
            const sender = profileById.get(m.sender_id);
            const initial = (sender?.display_name ?? sender?.username ?? "?")
              .charAt(0)
              .toUpperCase();
            const url = m.image_path ? signedUrlByPath.get(m.image_path) : null;
            const expired =
              m.expires_at && new Date(m.expires_at).getTime() < Date.now();

            return (
              <div key={m.id} className="flex gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  {sender?.avatar_url && <AvatarImage src={sender.avatar_url} />}
                  <AvatarFallback className="text-[11px]">{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {sender?.display_name ?? sender?.username ?? "?"}
                    </span>
                    <span>·</span>
                    <span>{formatTime(m.created_at)}</span>
                    {m.expires_at && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]",
                          expired ? "text-destructive" : "text-foreground"
                        )}
                      >
                        <ImageIcon className="h-3 w-3" />
                        {expired ? "expirada" : "efêmera"}
                      </span>
                    )}
                  </div>

                  {m.image_path && (
                    <div className="mt-1.5">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt="anexo"
                            loading="lazy"
                            className="max-h-80 w-auto max-w-full rounded-lg border border-border/50 object-contain"
                          />
                        </a>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-xs text-muted-foreground">
                          Falha ao gerar URL da imagem ({m.image_path}).
                        </div>
                      )}
                    </div>
                  )}

                  {m.content && (
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 text-sm">
                      {m.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

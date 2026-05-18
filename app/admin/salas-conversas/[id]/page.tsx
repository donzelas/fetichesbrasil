import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const ROOM_IMAGE_BUCKET = "room-images";

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface RoomDetail {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_premium_only: boolean;
  deleted_at: string | null;
  fetish: { name: string | null } | null;
}

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  image_path: string | null;
  expires_at: string | null;
  created_at: string;
}

export default async function AdminRoomConversationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const backHref = sp.back ?? "/admin/ao-vivo";
  const supabase = await createClient();

  const { data: roomRaw } = await supabase
    .from("chat_rooms")
    .select(
      "id, name, description, owner_id, is_premium_only, deleted_at, fetish:fetishes(name)"
    )
    .eq("id", id)
    .single();

  if (!roomRaw) notFound();
  const room = roomRaw as unknown as RoomDetail;

  const { data: messagesRaw } = await supabase
    .from("messages")
    .select("id, room_id, user_id, content, image_path, expires_at, created_at")
    .eq("room_id", id)
    .order("created_at", { ascending: true })
    .limit(2000);

  const messages = (messagesRaw ?? []) as MessageRow[];

  // Profiles em batch
  const userIds = Array.from(new Set(messages.map((m) => m.user_id)));
  const profileById = new Map<string, ProfileLite>();
  if (userIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of (profilesRaw ?? []) as ProfileLite[]) {
      profileById.set(p.id, p);
    }
  }

  // Signed URLs em batch (via service role para passar pelas RLS)
  const admin = createAdminClient();
  const signedUrlByPath = new Map<string, string>();
  const paths = messages
    .map((m) => m.image_path)
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from(ROOM_IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 30);
    if (signed) {
      for (const s of signed) {
        if (s.path && s.signedUrl) signedUrlByPath.set(s.path, s.signedUrl);
      }
    }
  }

  // Faixas por usuário (igual ao /admin/mensagens) — ajuda admin a ler quem
  // é quem visualmente.
  const ADMIN_LANE_CLASSES = ["ml-0", "ml-8", "ml-16"] as const;
  const laneByUser = new Map<string, number>();
  {
    let next = 0;
    for (const m of messages) {
      if (!laneByUser.has(m.user_id)) {
        laneByUser.set(m.user_id, next % ADMIN_LANE_CLASSES.length);
        next += 1;
      }
    }
  }

  const totalImages = messages.filter((m) => m.image_path).length;
  const now = Date.now();
  const expiredImages = messages.filter(
    (m) => m.image_path && m.expires_at && new Date(m.expires_at).getTime() < now
  ).length;
  const distinctUsers = new Set(messages.map((m) => m.user_id)).size;

  return (
    <div className="container max-w-3xl space-y-4 py-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{room.name}</h1>
              {room.fetish?.name && (
                <Badge variant="outline">{room.fetish.name}</Badge>
              )}
              {room.is_premium_only && (
                <Badge
                  variant="outline"
                  className="border-premium/40 text-premium"
                >
                  premium-only
                </Badge>
              )}
              {room.deleted_at && (
                <Badge
                  variant="outline"
                  className="border-destructive/40 text-destructive"
                >
                  sala excluída
                </Badge>
              )}
            </div>
            {room.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {room.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div>
              <p>Mensagens</p>
              <p className="text-base font-semibold text-foreground">
                {messages.length}
              </p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Imagens
              </p>
              <p className="text-base font-semibold text-foreground">
                {totalImages}
                {expiredImages > 0 && (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    ({expiredImages} expiradas)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                Pessoas
              </p>
              <p className="text-base font-semibold text-foreground">
                {distinctUsers}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href={`/admin/salas-imagens/${room.id}`}
          className="rounded-md border border-border/60 px-3 py-1.5 transition hover:border-primary/50 hover:text-primary"
        >
          Ver só as imagens →
        </Link>
        <Link
          href={`/salas/${room.id}`}
          className="rounded-md border border-border/60 px-3 py-1.5 transition hover:border-primary/50 hover:text-primary"
        >
          Abrir sala como usuário →
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma mensagem nesta sala.
            </p>
          )}

          {messages.map((m) => {
            const sender = profileById.get(m.user_id);
            const url = m.image_path
              ? signedUrlByPath.get(m.image_path)
              : null;
            const expired =
              !!m.expires_at && new Date(m.expires_at).getTime() < now;
            const lane = laneByUser.get(m.user_id) ?? 0;
            const laneClass = ADMIN_LANE_CLASSES[lane];

            return (
              <div key={m.id} className={cn("flex gap-2", laneClass)}>
                {sender?.avatar_url && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={sender.avatar_url} />
                  </Avatar>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { DeleteRoomImageButton } from "../DeleteRoomImageButton";

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
  owner_id: string | null;
  deleted_at: string | null;
  is_premium_only: boolean;
  fetish: { name: string | null } | null;
}

interface MessageImageRow {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  image_path: string;
  expires_at: string | null;
  created_at: string;
  user: ProfileLite | null;
}

export default async function AdminRoomImagesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const backRange = sp.range ?? "7d";
  const supabase = await createClient();

  const { data: roomRaw } = await supabase
    .from("chat_rooms")
    .select(
      "id, name, owner_id, deleted_at, is_premium_only, fetish:fetishes(name)"
    )
    .eq("id", id)
    .single();

  if (!roomRaw) notFound();
  const room = roomRaw as unknown as RoomDetail;

  const { data: messagesRaw, error: messagesErr } = await supabase
    .from("messages")
    .select("id, room_id, user_id, content, image_path, expires_at, created_at")
    .eq("room_id", id)
    .not("image_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (messagesErr) {
    console.error("[admin/salas-imagens/detail] erro:", messagesErr);
  }

  const messagesBase = (messagesRaw ?? []) as Omit<MessageImageRow, "user">[];

  // Busca perfis em separado (mais robusto que embed via PostgREST)
  const userIds = Array.from(new Set(messagesBase.map((m) => m.user_id)));
  const profileById = new Map<string, ProfileLite>();
  if (userIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profilesRaw ?? []) {
      profileById.set(p.id, p as ProfileLite);
    }
  }

  const messages: MessageImageRow[] = messagesBase.map((m) => ({
    ...m,
    user: profileById.get(m.user_id) ?? null,
  }));

  // Signed URLs em batch (via service role para não tropeçar em RLS)
  const admin = createAdminClient();
  const signedUrlByPath = new Map<string, string>();
  const paths = messages.map((m) => m.image_path).filter(Boolean);
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

  const now = Date.now();
  const expiredCount = messages.filter(
    (m) => m.expires_at && new Date(m.expires_at).getTime() < now
  ).length;

  const sendersById = new Map<string, ProfileLite>();
  for (const m of messages) {
    if (m.user) sendersById.set(m.user.id, m.user);
  }

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <Link
        href={`/admin/salas-imagens?range=${backRange}`}
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
                <Badge variant="outline" className="border-premium/40 text-premium">
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
            <p className="mt-1 text-xs text-muted-foreground">
              {messages.length} imagem{messages.length === 1 ? "" : "ns"}{" "}
              registrada{messages.length === 1 ? "" : "s"}
              {expiredCount > 0 && (
                <>
                  {" · "}
                  <span className="text-foreground">
                    {expiredCount} expirada{expiredCount === 1 ? "" : "s"} para
                    usuários comuns
                  </span>
                </>
              )}
              {sendersById.size > 0 && (
                <>
                  {" · "}
                  {sendersById.size} remetente{sendersById.size === 1 ? "" : "s"}
                </>
              )}
            </p>
          </div>
          <Link
            href={`/salas/${room.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Abrir sala →
          </Link>
        </CardContent>
      </Card>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma imagem registrada nesta sala.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {messages.map((m) => {
            const url = signedUrlByPath.get(m.image_path);
            const expired =
              !!m.expires_at && new Date(m.expires_at).getTime() < now;
            const sender = m.user;
            return (
              <Card
                key={m.id}
                className={cn(
                  "overflow-hidden",
                  expired && "border-amber-500/40"
                )}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-black/30">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full w-full"
                    >
                      <img
                        src={url}
                        alt="imagem da sala"
                        loading="lazy"
                        className="h-full w-full object-cover transition hover:scale-105"
                      />
                    </a>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                  {expired && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-white shadow">
                      <Timer className="h-3 w-3" />
                      expirada
                    </span>
                  )}
                  <div className="absolute right-2 top-2">
                    <DeleteRoomImageButton
                      messageId={m.id}
                      imagePath={m.image_path}
                    />
                  </div>
                </div>
                <CardContent className="space-y-1 p-3">
                  <div className="flex items-center gap-2">
                    {sender?.avatar_url && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={sender.avatar_url} />
                      </Avatar>
                    )}
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {sender?.display_name ?? sender?.username ?? "?"}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatTime(m.created_at)}
                  </p>
                  {m.content && (
                    <p className="line-clamp-2 text-xs text-foreground/80">
                      {m.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

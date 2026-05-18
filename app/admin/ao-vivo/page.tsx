import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveMonitor, type LiveMessage } from "@/components/admin/LiveMonitor";

export const dynamic = "force-dynamic";

const WINDOW_MINUTES = 30;

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface RoomMessageRow {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
}

interface DmMessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
}

interface RoomLite {
  id: string;
  name: string;
}

interface DmThreadLite {
  id: string;
  user_a_id: string;
  user_b_id: string;
}

export default async function AdminLiveMonitorPage() {
  const supabase = await createClient();
  const sinceIso = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  // 1) Mensagens recentes em salas
  const { data: roomMessagesRaw } = await supabase
    .from("messages")
    .select("id, room_id, user_id, content, image_path, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(500);

  const roomMessages = (roomMessagesRaw ?? []) as RoomMessageRow[];

  // 2) Mensagens recentes em DMs
  const { data: dmMessagesRaw } = await supabase
    .from("dm_messages")
    .select("id, thread_id, sender_id, content, image_path, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(500);

  const dmMessages = (dmMessagesRaw ?? []) as DmMessageRow[];

  // 3) Profiles e rooms/threads referenciados
  const userIds = Array.from(
    new Set([
      ...roomMessages.map((m) => m.user_id),
      ...dmMessages.map((m) => m.sender_id),
    ])
  );
  const roomIds = Array.from(new Set(roomMessages.map((m) => m.room_id)));
  const threadIds = Array.from(new Set(dmMessages.map((m) => m.thread_id)));

  const [profilesRes, roomsRes, threadsRes] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: [] as ProfileLite[] }),
    roomIds.length > 0
      ? supabase.from("chat_rooms").select("id, name").in("id", roomIds)
      : Promise.resolve({ data: [] as RoomLite[] }),
    threadIds.length > 0
      ? supabase
          .from("dm_threads")
          .select("id, user_a_id, user_b_id")
          .in("id", threadIds)
      : Promise.resolve({ data: [] as DmThreadLite[] }),
  ]);

  const profileById = new Map<string, ProfileLite>();
  for (const p of (profilesRes.data ?? []) as ProfileLite[]) {
    profileById.set(p.id, p);
  }
  const roomById = new Map<string, RoomLite>();
  for (const r of (roomsRes.data ?? []) as RoomLite[]) {
    roomById.set(r.id, r);
  }
  const threadById = new Map<string, DmThreadLite>();
  for (const t of (threadsRes.data ?? []) as DmThreadLite[]) {
    threadById.set(t.id, t);
  }

  // 4) Serializa o initialFeed misto (salas + DMs) ordenado por data desc
  const initialMessages: LiveMessage[] = [
    ...roomMessages.map<LiveMessage>((m) => ({
      kind: "room",
      id: m.id,
      groupId: m.room_id,
      groupLabel:
        roomById.get(m.room_id)?.name ?? "Sala desconhecida",
      groupHref: `/admin/salas-conversas/${m.room_id}?back=/admin/ao-vivo`,
      authorId: m.user_id,
      authorName:
        profileById.get(m.user_id)?.display_name ??
        profileById.get(m.user_id)?.username ??
        "Usuário",
      authorAvatar: profileById.get(m.user_id)?.avatar_url ?? null,
      content: m.content,
      hasImage: !!m.image_path,
      createdAt: m.created_at,
    })),
    ...dmMessages.map<LiveMessage>((m) => {
      const t = threadById.get(m.thread_id);
      const userA = t ? profileById.get(t.user_a_id) ?? null : null;
      const userB = t ? profileById.get(t.user_b_id) ?? null : null;
      const labelA = userA?.display_name ?? userA?.username ?? "?";
      const labelB = userB?.display_name ?? userB?.username ?? "?";
      return {
        kind: "dm",
        id: m.id,
        groupId: m.thread_id,
        groupLabel: `${labelA} ↔ ${labelB}`,
        groupHref: `/admin/mensagens/${m.thread_id}`,
        authorId: m.sender_id,
        authorName:
          profileById.get(m.sender_id)?.display_name ??
          profileById.get(m.sender_id)?.username ??
          "Usuário",
        authorAvatar: profileById.get(m.sender_id)?.avatar_url ?? null,
        content: m.content,
        hasImage: !!m.image_path,
        createdAt: m.created_at,
      };
    }),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Radio className="h-5 w-5" />
              <span className="absolute right-0.5 top-0.5 flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" />
                <span className="relative h-2 w-2 rounded-full bg-red-500" />
              </span>
            </span>
            Monitor ao Vivo
          </h1>
          <p className="text-muted-foreground">
            Conversas ativas dos últimos {WINDOW_MINUTES} minutos · atualiza em
            tempo real conforme novas mensagens chegam.
          </p>
        </div>
      </div>

      <LiveMonitor
        initialMessages={initialMessages}
        windowMinutes={WINDOW_MINUTES}
      />
    </div>
  );
}

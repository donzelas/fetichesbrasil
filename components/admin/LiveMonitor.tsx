"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, MessageCircle, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";

export type LiveMessageKind = "room" | "dm";

export interface LiveMessage {
  kind: LiveMessageKind;
  id: string;
  /** Sala_id ou Thread_id */
  groupId: string;
  /** Nome amigável: nome da sala ou "Alice ↔ Bob" */
  groupLabel: string;
  /** Link de detalhe no admin */
  groupHref: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string | null;
  hasImage: boolean;
  createdAt: string;
}

interface LiveMonitorProps {
  initialMessages: LiveMessage[];
  windowMinutes: number;
}

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface RoomLite {
  id: string;
  name: string;
}

interface ThreadLite {
  id: string;
  user_a_id: string;
  user_b_id: string;
}

export function LiveMonitor({
  initialMessages,
  windowMinutes,
}: LiveMonitorProps) {
  const [messages, setMessages] = useState<LiveMessage[]>(initialMessages);
  const [filter, setFilter] = useState<"all" | "room" | "dm">("all");
  // Re-render periódico para atualizar "há Xs"
  const [, tick] = useState(0);

  // Caches locais para enriquecer payloads de realtime sem refetch pesado
  const profileCache = useRef<Map<string, ProfileLite>>(new Map());
  const roomCache = useRef<Map<string, RoomLite>>(new Map());
  const threadCache = useRef<Map<string, ThreadLite>>(new Map());

  // Inicializa caches a partir do initialMessages
  useEffect(() => {
    for (const m of initialMessages) {
      if (m.authorId && !profileCache.current.has(m.authorId)) {
        profileCache.current.set(m.authorId, {
          id: m.authorId,
          username: m.authorName,
          display_name: m.authorName,
          avatar_url: m.authorAvatar,
        });
      }
      if (m.kind === "room" && !roomCache.current.has(m.groupId)) {
        roomCache.current.set(m.groupId, { id: m.groupId, name: m.groupLabel });
      }
    }
  }, [initialMessages]);

  // Tick: atualiza relative time + remove mensagens que saíram da janela
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - windowMinutes * 60 * 1000;
      setMessages((prev) =>
        prev.filter((m) => new Date(m.createdAt).getTime() >= cutoff)
      );
      tick((n) => n + 1);
    }, 5000);
    return () => clearInterval(t);
  }, [windowMinutes]);

  // Realtime: subscreve INSERTs nas tabelas messages e dm_messages
  useEffect(() => {
    const supabase = createClient();

    async function enrichProfile(userId: string): Promise<ProfileLite> {
      if (profileCache.current.has(userId)) {
        return profileCache.current.get(userId)!;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      const profile: ProfileLite = data ?? {
        id: userId,
        username: null,
        display_name: null,
        avatar_url: null,
      };
      profileCache.current.set(userId, profile);
      return profile;
    }

    async function enrichRoom(roomId: string): Promise<RoomLite | null> {
      if (roomCache.current.has(roomId)) return roomCache.current.get(roomId)!;
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, name")
        .eq("id", roomId)
        .maybeSingle();
      if (!data) return null;
      const r = { id: data.id, name: data.name };
      roomCache.current.set(roomId, r);
      return r;
    }

    async function enrichThread(threadId: string): Promise<ThreadLite | null> {
      if (threadCache.current.has(threadId)) {
        return threadCache.current.get(threadId)!;
      }
      const { data } = await supabase
        .from("dm_threads")
        .select("id, user_a_id, user_b_id")
        .eq("id", threadId)
        .maybeSingle();
      if (!data) return null;
      threadCache.current.set(threadId, data as ThreadLite);
      return data as ThreadLite;
    }

    const channel = supabase
      .channel("admin-live-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new as {
            id: string;
            room_id: string;
            user_id: string;
            content: string | null;
            image_path: string | null;
            created_at: string;
          };
          const [author, room] = await Promise.all([
            enrichProfile(row.user_id),
            enrichRoom(row.room_id),
          ]);
          const lm: LiveMessage = {
            kind: "room",
            id: row.id,
            groupId: row.room_id,
            groupLabel: room?.name ?? "Sala desconhecida",
            groupHref: `/admin/salas/${row.room_id}`,
            authorId: row.user_id,
            authorName: author.display_name ?? author.username ?? "Usuário",
            authorAvatar: author.avatar_url,
            content: row.content,
            hasImage: !!row.image_path,
            createdAt: row.created_at,
          };
          setMessages((prev) => {
            if (prev.some((x) => x.id === lm.id)) return prev;
            return [lm, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        async (payload) => {
          const row = payload.new as {
            id: string;
            thread_id: string;
            sender_id: string;
            content: string | null;
            image_path: string | null;
            created_at: string;
          };
          const [author, thread] = await Promise.all([
            enrichProfile(row.sender_id),
            enrichThread(row.thread_id),
          ]);
          const [a, b] = thread
            ? await Promise.all([
                enrichProfile(thread.user_a_id),
                enrichProfile(thread.user_b_id),
              ])
            : [null, null];
          const labelA = a?.display_name ?? a?.username ?? "?";
          const labelB = b?.display_name ?? b?.username ?? "?";
          const lm: LiveMessage = {
            kind: "dm",
            id: row.id,
            groupId: row.thread_id,
            groupLabel: thread ? `${labelA} ↔ ${labelB}` : "DM",
            groupHref: `/admin/mensagens/${row.thread_id}`,
            authorId: row.sender_id,
            authorName: author.display_name ?? author.username ?? "Usuário",
            authorAvatar: author.avatar_url,
            content: row.content,
            hasImage: !!row.image_path,
            createdAt: row.created_at,
          };
          setMessages((prev) => {
            if (prev.some((x) => x.id === lm.id)) return prev;
            return [lm, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return messages;
    return messages.filter((m) => m.kind === filter);
  }, [messages, filter]);

  // Agrupa por groupId pra mostrar "X grupos ativos"
  const groupCount = useMemo(
    () => new Set(messages.map((m) => `${m.kind}:${m.groupId}`)).size,
    [messages]
  );

  const roomCount = useMemo(
    () =>
      new Set(
        messages.filter((m) => m.kind === "room").map((m) => m.groupId)
      ).size,
    [messages]
  );
  const dmCount = useMemo(
    () =>
      new Set(messages.filter((m) => m.kind === "dm").map((m) => m.groupId))
        .size,
    [messages]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {messages.length}{" "}
          {messages.length === 1 ? "mensagem" : "mensagens"} em {groupCount}{" "}
          {groupCount === 1 ? "conversa" : "conversas"}
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <FilterTab
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`Tudo (${messages.length})`}
          />
          <FilterTab
            active={filter === "room"}
            onClick={() => setFilter("room")}
            label={`Salas (${roomCount})`}
            icon={<MessagesSquare className="h-3.5 w-3.5" />}
          />
          <FilterTab
            active={filter === "dm"}
            onClick={() => setFilter("dm")}
            label={`DMs (${dmCount})`}
            icon={<MessageCircle className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma atividade nos últimos {windowMinutes} minutos.
              <br />
              Quando alguém mandar mensagem, vai aparecer aqui na hora.
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filtered.map((m) => (
                <li key={`${m.kind}:${m.id}`}>
                  <Link
                    href={m.groupHref}
                    className="flex items-start gap-3 p-3 transition hover:bg-muted/40"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {m.authorAvatar && <AvatarImage src={m.authorAvatar} />}
                      <AvatarFallback className="text-[10px]">
                        {(m.authorName ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold">
                          {m.authorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          em
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            m.kind === "room"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-500"
                          )}
                        >
                          {m.kind === "room" ? (
                            <MessagesSquare className="h-3 w-3" />
                          ) : (
                            <MessageCircle className="h-3 w-3" />
                          )}
                          {m.groupLabel}
                        </span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {formatRelativeTime(m.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 break-words text-sm text-foreground/90">
                        {m.hasImage && (
                          <span className="mr-1 inline-flex items-center gap-1 align-middle text-primary">
                            <ImageIcon className="h-3.5 w-3.5" />
                            imagem
                          </span>
                        )}
                        {m.content ?? (m.hasImage ? "" : "(vazio)")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

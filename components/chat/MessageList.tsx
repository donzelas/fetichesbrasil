"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Message, Profile } from "@/types/database";

type MessageWithUser = Message & {
  user: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
};

interface MessageListProps {
  roomId: string;
  currentUserId: string;
  initialMessages: MessageWithUser[];
  /** Quando true, aplica deslocamento por usuário (faixas) para o admin distinguir falantes. */
  isAdminView?: boolean;
}

const ADMIN_LANE_CLASSES = ["ml-0", "ml-8", "ml-16"] as const;

export function MessageList({
  roomId,
  currentUserId,
  initialMessages,
  isAdminView = false,
}: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithUser[]>(initialMessages);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!didMountRef.current) {
      el.scrollTop = el.scrollHeight;
      didMountRef.current = true;
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `messages:${roomId}`;

    for (const c of supabase.getChannels()) {
      if (c.topic === `realtime:${channelName}`) {
        supabase.removeChannel(c);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const m = payload.new as Message;
          const { data: user } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", m.user_id)
            .single();
          setMessages((prev) => [...prev, { ...m, user } as MessageWithUser]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Faixas por usuário (apenas para admin): cada user_id ganha 0/1/2 conforme ordem de aparição.
  const adminLaneByUser = (() => {
    if (!isAdminView) return null;
    const map = new Map<string, number>();
    let next = 0;
    for (const m of messages) {
      if (!map.has(m.user_id)) {
        map.set(m.user_id, next % ADMIN_LANE_CLASSES.length);
        next += 1;
      }
    }
    return map;
  })();

  return (
    <div
      ref={containerRef}
      className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
    >
      {messages.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Seja o primeiro a quebrar o gelo aqui...
        </p>
      )}
      {messages.map((m) => {
        const own = m.user_id === currentUserId;
        const adminLane = adminLaneByUser?.get(m.user_id) ?? 0;
        const adminOffset = isAdminView ? ADMIN_LANE_CLASSES[adminLane] : "";
        return (
          <div
            key={m.id}
            className={cn(
              "flex gap-2",
              own ? "flex-row-reverse" : "flex-row",
              adminOffset
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              {m.user?.avatar_url && <AvatarImage src={m.user.avatar_url} />}
              <AvatarFallback className="text-xs">
                <User className="h-4 w-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex max-w-[75%] flex-col gap-1", own && "items-end")}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{m.user?.display_name ?? m.user?.username ?? "—"}</span>
                <span>·</span>
                <span>{formatTime(m.created_at)}</span>
              </div>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm",
                  own
                    ? "rounded-tr-sm gradient-primary text-white"
                    : "rounded-tl-sm bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

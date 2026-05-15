"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DmDialog } from "./DmDialog";

interface DmInboxProps {
  currentUserId: string;
  isAdmin?: boolean;
  /** Sala atual, para listar candidatos online ao adicionar gente em DMs. */
  roomId?: string;
}

interface ThreadRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ThreadView {
  id: string;
  other: ProfileRow;
  last_message_at: string | null;
  unread_count: number;
}

export function DmInbox({ currentUserId, isAdmin = false, roomId }: DmInboxProps) {
  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [open, setOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<ThreadView | null>(null);

  const fetchThreads = useCallback(async () => {
    const supabase = createClient();

    const { data: rows } = await supabase
      .from("dm_threads")
      .select("id, user_a_id, user_b_id, last_message_at, created_at")
      .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50);

    const list = (rows ?? []) as ThreadRow[];
    if (list.length === 0) {
      setThreads([]);
      return;
    }

    const otherIds = list.map((t) =>
      t.user_a_id === currentUserId ? t.user_b_id : t.user_a_id
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", otherIds);

    const profMap = new Map<string, ProfileRow>();
    for (const p of (profiles ?? []) as ProfileRow[]) {
      profMap.set(p.id, p);
    }

    const unreadByThread = new Map<string, number>();
    for (const t of list) {
      const { count } = await supabase
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", t.id)
        .neq("sender_id", currentUserId)
        .is("read_at", null);
      unreadByThread.set(t.id, count ?? 0);
    }

    const views: ThreadView[] = list.map((t) => {
      const otherId = t.user_a_id === currentUserId ? t.user_b_id : t.user_a_id;
      const other = profMap.get(otherId) ?? {
        id: otherId,
        username: "user",
        display_name: "Usuário",
        avatar_url: null,
      };
      return {
        id: t.id,
        other,
        last_message_at: t.last_message_at,
        unread_count: unreadByThread.get(t.id) ?? 0,
      };
    });

    setThreads(views);
  }, [currentUserId]);

  useEffect(() => {
    fetchThreads();

    const supabase = createClient();
    const userChannelName = `user:${currentUserId}`;

    for (const c of supabase.getChannels()) {
      if (c.topic === `realtime:${userChannelName}`) {
        supabase.removeChannel(c);
      }
    }

    const userChannel = supabase
      .channel(userChannelName, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "dm_invite" }, () => {
        fetchThreads();
      })
      .on("broadcast", { event: "dm_message" }, () => {
        fetchThreads();
      })
      .subscribe();

    const threadChannel = supabase
      .channel(`dm_threads_inbox:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_threads" },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`dm_messages_inbox:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages" },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(threadChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [currentUserId, fetchThreads]);

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);
  const hasThreads = threads.length > 0;

  if (!hasThreads) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2.5 text-sm font-medium transition hover:bg-muted"
        aria-label={`${threads.length} conversas privadas, ${totalUnread} não lidas`}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="tabular-nums">{threads.length}</span>
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversas privadas
            </DialogTitle>
            <DialogDescription>
              Toque em uma conversa para abrir.
            </DialogDescription>
          </DialogHeader>

          <div className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto pr-1">
            {threads.map((t) => {
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveThread(t);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      {t.other.avatar_url && <AvatarImage src={t.other.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.other.display_name ?? t.other.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{t.other.username}
                      </p>
                    </div>
                  </div>
                  {t.unread_count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                      {t.unread_count > 9 ? "9+" : t.unread_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {activeThread && (
        <DmDialog
          threadId={activeThread.id}
          otherUser={{
            user_id: activeThread.other.id,
            username: activeThread.other.username ?? "user",
            display_name:
              activeThread.other.display_name ?? activeThread.other.username ?? "Usuário",
            avatar_url: activeThread.other.avatar_url,
          }}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          roomId={roomId}
          open={!!activeThread}
          onOpenChange={(o) => {
            if (!o) {
              setActiveThread(null);
              fetchThreads();
            }
          }}
        />
      )}
    </>
  );
}

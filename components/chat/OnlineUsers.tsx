"use client";

import { useEffect, useMemo, useState } from "react";
import { Flag, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DmDialog } from "./DmDialog";
import { ReportDialog } from "./ReportDialog";
import { notifyUser } from "@/lib/realtime/notify";

type PresenceUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

interface OnlineUsersProps {
  roomId: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  invisible?: boolean;
  isAdmin?: boolean;
}

export function OnlineUsers({ roomId, user, invisible = false, isAdmin = false }: OnlineUsersProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [open, setOpen] = useState(false);

  const [dmTarget, setDmTarget] = useState<PresenceUser | null>(null);
  const [dmThreadId, setDmThreadId] = useState<string | null>(null);
  const [dmLoading, setDmLoading] = useState(false);

  const [reportTarget, setReportTarget] = useState<PresenceUser | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `presence:${roomId}`;

    for (const c of supabase.getChannels()) {
      if (c.topic === `realtime:${channelName}`) {
        supabase.removeChannel(c);
      }
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const all = Object.values(state).flat();
        const seen = new Set<string>();
        const unique = all.filter((u) => {
          if (seen.has(u.user_id)) return false;
          seen.add(u.user_id);
          return true;
        });
        setUsers(unique);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !invisible) {
          await channel.track({
            user_id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
          } satisfies PresenceUser);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user.id, user.username, user.display_name, user.avatar_url, invisible]);

  const otherUsers = useMemo(
    () => users.filter((u) => u.user_id !== user.id),
    [users, user.id]
  );

  async function handleOpenDm(target: PresenceUser) {
    setDmLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("open_dm_thread", {
      p_other_user_id: target.user_id,
    });
    setDmLoading(false);
    if (error || !data) {
      toast.error("Não foi possível abrir o chat", {
        description: error?.message ?? "Tente novamente.",
      });
      return;
    }
    const threadId = data as unknown as string;
    setDmTarget(target);
    setDmThreadId(threadId);
    setOpen(false);

    notifyUser(supabase, target.user_id, "dm_invite", {
      threadId,
      fromUserId: user.id,
      fromUsername: user.username,
      fromDisplayName: user.display_name,
    }).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2.5 text-sm font-medium transition hover:bg-muted"
        aria-label={`${users.length} usuários online`}
      >
        <Users className="h-4 w-4" />
        <span className="tabular-nums">{users.length}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários online ({users.length})
            </DialogTitle>
            <DialogDescription>
              Toque em um usuário para enviar mensagem direta ou denunciar.
            </DialogDescription>
          </DialogHeader>

          <div className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto pr-1">
            {otherUsers.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum outro usuário online no momento.
              </p>
            )}

            {otherUsers.map((u) => {
              const initial =
                u.display_name?.charAt(0)?.toUpperCase() ??
                u.username?.charAt(0)?.toUpperCase() ??
                "?";
              return (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                      </Avatar>
                      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.display_name ?? u.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDm(u)}
                      disabled={dmLoading}
                      title="Abrir chat individual"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setReportTarget(u)}
                      title="Denunciar usuário"
                    >
                      <Flag className="h-4 w-4" />
                      <span className="hidden sm:inline">Denunciar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {dmThreadId && dmTarget && (
        <DmDialog
          threadId={dmThreadId}
          otherUser={dmTarget}
          currentUserId={user.id}
          isAdmin={isAdmin}
          roomId={roomId}
          open={!!dmThreadId}
          onOpenChange={(o) => {
            if (!o) {
              setDmThreadId(null);
              setDmTarget(null);
            }
          }}
        />
      )}

      {reportTarget && (
        <ReportDialog
          target={reportTarget}
          roomId={roomId}
          open={!!reportTarget}
          onOpenChange={(o) => {
            if (!o) setReportTarget(null);
          }}
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, User, UserPlus } from "lucide-react";
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
import { notifyUser } from "@/lib/realtime/notify";

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

type PresenceUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

interface AddDmParticipantDialogProps {
  threadId: string;
  currentUserId: string;
  existingParticipantIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sala em que o usuário está. Se informado, lista usuários presentes na sala. */
  roomId?: string;
  onAdded?: (user: ProfileLite) => void;
}

export function AddDmParticipantDialog({
  threadId,
  currentUserId,
  existingParticipantIds,
  open,
  onOpenChange,
  roomId,
  onAdded,
}: AddDmParticipantDialogProps) {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  const exclude = useMemo(
    () => new Set([...existingParticipantIds, currentUserId]),
    [existingParticipantIds, currentUserId]
  );

  useEffect(() => {
    if (!open || !roomId) {
      setPresence([]);
      return;
    }
    const supabase = createClient();
    const channelName = `presence:${roomId}`;

    for (const c of supabase.getChannels()) {
      if (c.topic === `realtime:${channelName}`) {
        supabase.removeChannel(c);
      }
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: `viewer:${currentUserId}:${threadId}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const all = Object.values(state).flat();
        const seen = new Set<string>();
        const unique = all.filter((u) => {
          if (!u?.user_id || seen.has(u.user_id)) return false;
          seen.add(u.user_id);
          return true;
        });
        setPresence(unique);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, roomId, currentUserId, threadId]);

  const candidates = useMemo(
    () => presence.filter((p) => !exclude.has(p.user_id)),
    [presence, exclude]
  );

  async function handleAdd(user: PresenceUser) {
    setAdding(user.user_id);
    const supabase = createClient();
    const { error } = await supabase.rpc("add_dm_participant", {
      p_thread_id: threadId,
      p_user_id: user.user_id,
    });
    setAdding(null);
    if (error) {
      toast.error("Não foi possível adicionar", { description: error.message });
      return;
    }
    toast.success(`${user.display_name ?? user.username} entrou na conversa.`);
    onAdded?.({
      id: user.user_id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    });

    notifyUser(supabase, user.user_id, "dm_invite", {
      threadId,
      fromUserId: currentUserId,
      fromUsername: "",
      fromDisplayName: "",
    }).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar à conversa
          </DialogTitle>
          <DialogDescription>
            {roomId
              ? "Usuários online na sala atual."
              : "Não há sala associada a esta conversa."}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-72 space-y-1 overflow-y-auto pr-1">
          {!roomId && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Abra a conversa pela sala para ver os usuários online dela.
            </p>
          )}

          {roomId && candidates.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum outro usuário online na sala no momento.
            </p>
          )}

          {candidates.map((u) => {
            return (
              <div
                key={u.user_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 p-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-card bg-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.display_name ?? u.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(u)}
                  disabled={adding !== null}
                >
                  {adding === u.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

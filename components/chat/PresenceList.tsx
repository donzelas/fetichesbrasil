"use client";

import { useEffect, useState } from "react";
import { User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PresenceUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

interface PresenceListProps {
  roomId: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  invisible?: boolean;
}

export function PresenceList({ roomId, user, invisible = false }: PresenceListProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

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

  const usersToShow = users;

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border/50 bg-card/40 px-3 py-2 lg:flex-col lg:items-stretch lg:gap-0 lg:w-64 lg:shrink lg:border-l lg:border-t-0 lg:p-4">
      <h3 className="flex shrink-0 items-center gap-1.5 text-sm font-semibold lg:mb-3 lg:gap-2">
        <Users className="h-4 w-4" />
        <span className="lg:hidden">{users.length}</span>
        <span className="hidden lg:inline">Online ({users.length})</span>
      </h3>

      <div className="scrollbar-thin flex flex-1 items-center gap-2 overflow-x-auto lg:hidden">
        {usersToShow.map((u) => {
          return (
            <div key={u.user_id} className="relative shrink-0" title={u.display_name ?? u.username}>
              <Avatar className="h-7 w-7">
                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                <AvatarFallback className="text-xs">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
            </div>
          );
        })}
      </div>

      <div className="scrollbar-thin hidden min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:block">
        {usersToShow.map((u) => {
          return (
            <div key={u.user_id} className="flex items-center gap-2 text-sm">
              <div className="relative">
                <Avatar className="h-7 w-7">
                  {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback className="text-xs">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
              </div>
              <span className="truncate">{u.display_name ?? u.username}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

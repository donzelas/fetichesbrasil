"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Inscreve-se no canal de presence de uma sala (read-only) e retorna a contagem
 * em tempo real de usuários únicos online. NÃO chama track() — não aparece como
 * presente. Ideal para painéis de admin que precisam observar atividade.
 */
export function useRoomPresenceCount(roomId: string, enabled: boolean = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
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
      config: { presence: { key: `observer-${crypto.randomUUID()}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const all = Object.values(state).flat() as Array<{ user_id?: string }>;
        const seen = new Set<string>();
        let unique = 0;
        for (const u of all) {
          const k = u.user_id ?? "";
          if (!k || seen.has(k)) continue;
          seen.add(k);
          unique += 1;
        }
        setCount(unique);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, enabled]);

  return count;
}

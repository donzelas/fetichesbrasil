"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DmInviteEvent = {
  threadId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
};

export type DmMessageEvent = {
  threadId: string;
  fromUserId: string;
  preview: string;
};

/**
 * Envia um broadcast efêmero para o canal pessoal do usuário (`user:<id>`).
 * Não depende de RLS do Postgres Changes — entrega via Realtime Broadcast.
 */
export async function notifyUser<T>(
  supabase: SupabaseClient,
  recipientUserId: string,
  event: string,
  payload: T
): Promise<void> {
  const channel = supabase.channel(`user:${recipientUserId}`, {
    config: { broadcast: { self: false, ack: true } },
  });

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
      resolve();
    };

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.send({ type: "broadcast", event, payload });
        } catch {
          /* noop */
        }
        setTimeout(finish, 200);
      } else if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
        finish();
      }
    });

    setTimeout(finish, 3000);
  });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Endpoint chamado pelo Vercel Cron a cada 30s.
 * Conta participantes em room_participants e atualiza chat_rooms.active_users_count.
 * (Presence em si é em memória e mais preciso em tempo-real, mas precisamos do snapshot
 * persistido para ordenação eficiente das listagens.)
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: rooms, error: roomsErr } = await supabase
    .from("chat_rooms")
    .select("id")
    .is("deleted_at", null);

  if (roomsErr || !rooms) {
    return NextResponse.json({ error: roomsErr?.message ?? "no rooms" }, { status: 500 });
  }

  let updated = 0;
  for (const room of rooms) {
    const { count } = await supabase
      .from("room_participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id);

    const { error } = await supabase
      .from("chat_rooms")
      .update({ active_users_count: count ?? 0 })
      .eq("id", room.id);

    if (!error) updated += 1;
  }

  return NextResponse.json({
    ok: true,
    updated,
    timestamp: new Date().toISOString(),
  });
}

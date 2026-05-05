import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AdminRoomRow } from "./row";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select(
      "id, name, owner_id, is_featured, is_premium_only, active_users_count, created_at, deleted_at, owner:profiles!chat_rooms_owner_id_fkey(username, display_name)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar salas</h1>
        <p className="text-muted-foreground">{rooms?.length ?? 0} salas no total.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {rooms?.map((r) => <AdminRoomRow key={r.id} room={r as never} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

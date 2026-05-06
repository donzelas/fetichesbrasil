import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AdminRoomRow } from "./row";

export const dynamic = "force-dynamic";

interface AdminRoomItem {
  id: string;
  name: string;
  owner_id: string | null;
  is_featured: boolean;
  is_premium_only: boolean;
  active_users_count: number;
  created_at: string;
  deleted_at: string | null;
  owner: { username: string | null; display_name: string | null } | null;
  fetish: {
    name: string | null;
    category: { id: string; name: string; emoji: string | null; sort_order: number } | null;
  } | null;
}

const USER_GROUP_KEY = "__user__";

export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select(
      `id, name, owner_id, is_featured, is_premium_only, active_users_count, created_at, deleted_at,
       owner:profiles!chat_rooms_owner_id_fkey(username, display_name),
       fetish:fetishes(name, category:categories(id, name, emoji, sort_order))`
    )
    .order("created_at", { ascending: false });

  const list = (rooms ?? []) as unknown as AdminRoomItem[];

  type Group = {
    key: string;
    name: string;
    sortOrder: number;
    rooms: AdminRoomItem[];
  };

  const groupsMap = new Map<string, Group>();

  for (const r of list) {
    const cat = r.fetish?.category;
    if (cat) {
      if (!groupsMap.has(cat.id)) {
        groupsMap.set(cat.id, {
          key: cat.id,
          name: cat.name,
          sortOrder: cat.sort_order,
          rooms: [],
        });
      }
      groupsMap.get(cat.id)!.rooms.push(r);
    } else {
      if (!groupsMap.has(USER_GROUP_KEY)) {
        groupsMap.set(USER_GROUP_KEY, {
          key: USER_GROUP_KEY,
          name: "Salas criadas pelos Usuários",
          sortOrder: 999,
          rooms: [],
        });
      }
      groupsMap.get(USER_GROUP_KEY)!.rooms.push(r);
    }
  }

  const groups = [...groupsMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar salas</h1>
        <p className="text-muted-foreground">
          {list.length} salas em {groups.length} {groups.length === 1 ? "categoria" : "categorias"}.
        </p>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.key} className="overflow-hidden">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 transition hover:bg-muted/30">
                <div>
                  <h2 className="font-semibold">{g.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {g.rooms.length} {g.rooms.length === 1 ? "sala" : "salas"}
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition group-open:rotate-180" />
              </summary>
              <CardContent className="border-t border-border/50 p-0">
                <div className="divide-y divide-border/50">
                  {g.rooms.map((r) => (
                    <AdminRoomRow key={r.id} room={r as never} />
                  ))}
                </div>
              </CardContent>
            </details>
          </Card>
        ))}

        {groups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma sala cadastrada.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

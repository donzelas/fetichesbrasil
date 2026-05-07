import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminRoomRow } from "../row";

export const dynamic = "force-dynamic";

interface UserRoomItem {
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
    category: { name: string; emoji: string | null } | null;
  } | null;
}

export default async function AdminUserRoomsPage() {
  const supabase = await createClient();

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select(
      `id, name, owner_id, is_featured, is_premium_only, active_users_count, created_at, deleted_at,
       owner:profiles!chat_rooms_owner_id_fkey(username, display_name),
       fetish:fetishes(name, category:categories(name, emoji))`
    )
    .not("owner_id", "is", null)
    .order("created_at", { ascending: false });

  const list = (rooms ?? []) as unknown as UserRoomItem[];
  const activeCount = list.filter((r) => !r.deleted_at).length;
  const deletedCount = list.length - activeCount;

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground hover:text-foreground"
      >
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o painel
        </Link>
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <UserPlus className="h-7 w-7 text-primary" />
          Salas de assinantes
        </h1>
        <p className="text-muted-foreground">
          {activeCount} {activeCount === 1 ? "sala ativa" : "salas ativas"} criadas pela comunidade
          Premium
          {deletedCount > 0 && ` · ${deletedCount} deletada${deletedCount === 1 ? "" : "s"}`}.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <UserPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhum assinante criou salas ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {list.map((r) => (
                <div key={r.id} className="space-y-1 px-0 py-0">
                  {r.fetish?.category && (
                    <div className="bg-muted/30 px-4 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {r.fetish.category.emoji} {r.fetish.category.name}
                      {r.fetish.name && (
                        <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">
                          · {r.fetish.name}
                        </span>
                      )}
                    </div>
                  )}
                  <AdminRoomRow room={r as never} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

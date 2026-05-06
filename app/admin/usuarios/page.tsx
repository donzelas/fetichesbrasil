import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AdminUserRow } from "./row";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_premium, is_admin, premium_since, created_at")
    .eq("is_admin", false)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">{users?.length ?? 0} usuários (limite 200 mais recentes).</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {users?.map((u) => <AdminUserRow key={u.id} user={u as never} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

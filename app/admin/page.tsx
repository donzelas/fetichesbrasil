import Link from "next/link";
import { Crown, Flame, MessageSquare, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [
    { count: totalUsers },
    { count: totalPremium },
    { count: totalRooms },
    { count: totalFeatured },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", false),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_premium", true)
      .eq("is_admin", false),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("is_featured", true)
      .is("deleted_at", null),
  ]);

  const stats = [
    { label: "Usuários totais", value: totalUsers ?? 0, icon: Users },
    { label: "Usuários Premium", value: totalPremium ?? 0, icon: Crown },
    { label: "Salas ativas", value: totalRooms ?? 0, icon: MessageSquare },
    { label: "Salas em destaque", value: totalFeatured ?? 0, icon: Flame },
  ];

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Admin</h1>
        <p className="text-muted-foreground">Gestão geral da plataforma.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 py-5">
              <div className="rounded-lg bg-primary/10 p-2">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/salas" className="group">
          <Card className="transition hover:border-primary/50">
            <CardContent className="py-6">
              <h3 className="font-semibold group-hover:text-primary">Gerenciar salas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Marcar/desmarcar destaque, deletar salas problemáticas.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/usuarios" className="group">
          <Card className="transition hover:border-primary/50">
            <CardContent className="py-6">
              <h3 className="font-semibold group-hover:text-primary">Gerenciar usuários</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Promover Premium manualmente, banir, ver detalhes.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  Crown,
  Flame,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Users,
} from "lucide-react";
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
    { count: totalDmThreads },
    { count: totalFeaturedCards },
    { count: pendingPosts },
    { count: approvedPosts },
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
    supabase
      .from("dm_threads")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("featured_fetish_cards")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .is("deleted_at", null),
  ]);

  const stats = [
    { label: "Usuários totais", value: totalUsers ?? 0, icon: Users },
    { label: "Usuários Premium", value: totalPremium ?? 0, icon: Crown },
    { label: "Salas ativas", value: totalRooms ?? 0, icon: MessageSquare },
    { label: "Salas em destaque", value: totalFeatured ?? 0, icon: Flame },
    { label: "Posts pendentes", value: pendingPosts ?? 0, icon: Newspaper, highlight: (pendingPosts ?? 0) > 0 },
    { label: "Posts aprovados", value: approvedPosts ?? 0, icon: Newspaper },
    { label: "Chats individuais", value: totalDmThreads ?? 0, icon: MessageCircle },
    { label: "Cards de destaque", value: totalFeaturedCards ?? 0, icon: ImageIcon },
  ];

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Admin</h1>
        <p className="text-muted-foreground">Gestão geral da plataforma.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {stats.map((s) => {
          const isHighlight = "highlight" in s && (s as { highlight?: boolean }).highlight;
          return (
            <Card key={s.label} className={isHighlight ? "border-amber-500/50 ring-1 ring-amber-500/30" : undefined}>
              <CardContent className="flex items-center gap-3 py-5">
                <div className={isHighlight ? "rounded-lg bg-amber-500/15 p-2" : "rounded-lg bg-primary/10 p-2"}>
                  <s.icon className={isHighlight ? "h-5 w-5 text-amber-500" : "h-5 w-5 text-primary"} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <Link href="/admin/destaques" className="group">
          <Card className="transition hover:border-primary/50">
            <CardContent className="py-6">
              <h3 className="font-semibold group-hover:text-primary">Cards de destaque</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Editar/criar/excluir cards do carrossel da home (auto-slide 3s).
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/posts" className="group">
          <Card
            className={
              (pendingPosts ?? 0) > 0
                ? "border-amber-500/40 transition hover:border-amber-500/70"
                : "transition hover:border-primary/50"
            }
          >
            <CardContent className="py-6">
              <h3 className="flex items-center gap-2 font-semibold group-hover:text-primary">
                Moderar Blog
                {(pendingPosts ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                    {pendingPosts} pendente{(pendingPosts ?? 0) === 1 ? "" : "s"}
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aprovar/rejeitar posts da comunidade, excluir comentários.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/mensagens" className="group">
          <Card className="transition hover:border-primary/50">
            <CardContent className="py-6">
              <h3 className="font-semibold group-hover:text-primary">Chats individuais</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ver conversas privadas e imagens (inclusive já expiradas).
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

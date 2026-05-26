import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient, getViewerOrRedirectAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RoomCard } from "@/components/rooms/RoomCard";

export const dynamic = "force-dynamic";

const ROOM_FIELDS =
  "id, name, description, is_premium_only, is_featured, active_users_count, unlock_message, fetish:fetishes(name, slug, category:categories(name, slug, emoji))";

interface PageProps {
  searchParams: Promise<{ categoria?: string; fetiche?: string; usuarios?: string }>;
}

export default async function SalasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const viewer = await getViewerOrRedirectAdmin("/salas");
  const initialViewer = {
    isPremium: viewer.isPremium,
    isAuthenticated: viewer.isAuthenticated,
    isInTrial: viewer.isInTrial,
  };

  let query = supabase
    .from("chat_rooms")
    .select(ROOM_FIELDS)
    .is("deleted_at", null)
    .order("active_users_count", { ascending: false })
    .order("last_activity_at", { ascending: false });

  let title = "Todas as salas";
  let subtitle: string | undefined;

  if (params.usuarios === "true") {
    query = query.not("owner_id", "is", null);
    title = "Salas criadas pelos Usuários";
    subtitle = "👥 Comunidade Premium";
  } else if (params.fetiche) {
    const { data: f } = await supabase
      .from("fetishes")
      .select("id, name, category:categories(name, emoji)")
      .eq("slug", params.fetiche)
      .single();
    if (f) {
      query = query.eq("fetish_id", f.id);
      title = f.name;
      const cat = f.category as unknown as { name: string; emoji: string | null } | null;
      subtitle = cat ? `${cat.emoji} ${cat.name}` : undefined;
    }
  } else if (params.categoria) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id, name, emoji, fetishes(id)")
      .eq("slug", params.categoria)
      .single();
    if (cat) {
      const fIds = (cat.fetishes as unknown as { id: string }[]).map((f) => f.id);
      if (fIds.length > 0) query = query.in("fetish_id", fIds);
      title = cat.name;
      subtitle = cat.emoji ?? undefined;
    }
  }

  const { data: rooms } = await query;

  return (
    <div className="container space-y-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground hover:text-foreground">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para home
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {rooms?.length ?? 0} {rooms?.length === 1 ? "sala disponível" : "salas disponíveis"}
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/salas/nova">
            <Plus className="h-4 w-4" />
            Criar sala
          </Link>
        </Button>
      </div>

      {rooms && rooms.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room as never} initialViewer={initialViewer} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">Nenhuma sala disponível ainda.</p>
          <Button asChild className="mt-4" variant="gradient">
            <Link href="/salas/nova">Seja o primeiro a criar</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

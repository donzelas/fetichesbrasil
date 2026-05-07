import Link from "next/link";
import { ArrowLeft, Plus, Sparkles, Users } from "lucide-react";
import { createClient, getViewerOrRedirectAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CategoryAccordion } from "@/components/chat/CategoryAccordion";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { TopActiveSection } from "@/components/home/TopActiveSection";
import type { CategoryWithFetishes } from "@/types/database";

export const dynamic = "force-dynamic";

const ROOM_FIELDS =
  "id, name, description, is_premium_only, is_featured, active_users_count, unlock_message, fetish:fetishes!inner(name, slug, category:categories(name, slug, emoji))";

const ROOM_FIELDS_OPTIONAL_FETISH =
  "id, name, description, is_premium_only, is_featured, active_users_count, unlock_message, fetish:fetishes(name, slug, category:categories(name, slug, emoji))";

const HIGHLIGHTED_FETISH_SLUGS = ["cuckold", "swing", "fisting", "exibicionismo"] as const;

export default async function ChatPage() {
  const supabase = await createClient();
  const viewer = await getViewerOrRedirectAdmin("/chat");
  const initialViewer = { isPremium: viewer.isPremium, isAuthenticated: viewer.isAuthenticated };

  const [
    { data: cats },
    { data: featured },
    { data: highlightedRaw },
    { data: latestUserRooms },
    { count: userRoomsCount },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*, fetishes(*)")
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "fetishes", ascending: true }),
    supabase
      .from("chat_rooms")
      .select(ROOM_FIELDS_OPTIONAL_FETISH)
      .eq("is_featured", true)
      .is("deleted_at", null)
      .order("active_users_count", { ascending: false })
      .limit(6),
    supabase
      .from("chat_rooms")
      .select(ROOM_FIELDS)
      .in("fetish.slug", HIGHLIGHTED_FETISH_SLUGS as unknown as string[])
      .is("deleted_at", null)
      .order("active_users_count", { ascending: false }),
    supabase
      .from("chat_rooms")
      .select(ROOM_FIELDS_OPTIONAL_FETISH)
      .not("owner_id", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .not("owner_id", "is", null)
      .is("deleted_at", null),
  ]);

  const categories = (cats ?? []) as unknown as CategoryWithFetishes[];

  // Pega no máximo 1 sala por fetiche destacado, na ordem definida em HIGHLIGHTED_FETISH_SLUGS.
  const highlightedRooms = HIGHLIGHTED_FETISH_SLUGS
    .map((slug) =>
      (highlightedRaw ?? []).find(
        (r: { fetish?: { slug?: string | null } | null }) => r.fetish?.slug === slug
      )
    )
    .filter(Boolean) as NonNullable<typeof highlightedRaw>;

  return (
    <div className="container space-y-8 py-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground hover:text-foreground">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para home
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Salas de bate-papo em tempo real para cada fetiche e categoria.
        </p>
      </header>

      <FeaturedSection rooms={featured ?? []} initialViewer={initialViewer} />

      <TopActiveSection
        rooms={highlightedRooms}
        initialViewer={initialViewer}
        title="Fetiches em destaque"
        subtitle="Cuckold, Swing, Fisting e Exibicionismo — os mais procurados"
      />

      {(latestUserRooms?.length ?? 0) > 0 && (
        <TopActiveSection
          rooms={latestUserRooms ?? []}
          initialViewer={initialViewer}
          title="Salas recentes da comunidade"
          subtitle="As últimas salas criadas por usuários Premium"
          icon={Sparkles}
          iconClassName="h-6 w-6 text-primary"
        />
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Explorar por categoria</h2>
            <p className="text-sm text-muted-foreground">
              Toque para ver os fetiches de cada categoria.
            </p>
          </div>

          {viewer.isPremium && (
            <Button asChild size="sm" variant="gradient">
              <Link href="/salas/nova">
                <Plus className="h-4 w-4" />
                Criar sala
              </Link>
            </Button>
          )}
        </div>

        <CategoryAccordion categories={categories} />

        <Link
          href="/salas?usuarios=true"
          className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card/50 px-4 py-3 transition hover:border-primary/60 hover:bg-primary/15"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-tight group-hover:text-primary">
              Salas criadas pelos Usuários
            </span>
            <span className="block text-xs text-muted-foreground">
              {userRoomsCount === 0
                ? "Nenhuma sala criada por usuário ainda"
                : `${userRoomsCount} ${userRoomsCount === 1 ? "sala criada" : "salas criadas"} pela comunidade Premium`}
            </span>
          </span>
        </Link>
      </section>
    </div>
  );
}

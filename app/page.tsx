import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";
import { createClient, getViewerOrRedirectAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { TopActiveSection } from "@/components/home/TopActiveSection";
import { FeaturedCardsCarousel } from "@/components/home/FeaturedCardsCarousel";
import type { CategoryWithFetishes } from "@/types/database";

export const dynamic = "force-dynamic";

const ROOM_FIELDS =
  "id, name, description, is_premium_only, is_featured, active_users_count, unlock_message, fetish:fetishes(name, category:categories(name, emoji))";

export default async function HomePage() {
  const supabase = await createClient();
  const viewer = await getViewerOrRedirectAdmin("/");
  const initialViewer = { isPremium: viewer.isPremium, isAuthenticated: viewer.isAuthenticated };

  const [
    { data: cats },
    { data: featured },
    { data: top },
    { count: userRoomsCount },
    { count: totalRoomsCount },
    { data: featuredCards },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*, fetishes(*)")
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "fetishes", ascending: true }),
    supabase
      .from("chat_rooms")
      .select(ROOM_FIELDS)
      .eq("is_featured", true)
      .is("deleted_at", null)
      .order("active_users_count", { ascending: false })
      .limit(6),
    supabase
      .from("chat_rooms")
      .select(ROOM_FIELDS)
      .is("deleted_at", null)
      .order("active_users_count", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(15),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .not("owner_id", "is", null)
      .is("deleted_at", null),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("featured_fetish_cards")
      .select("id, title, description, image_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const categories = (cats ?? []) as unknown as CategoryWithFetishes[];

  return (
    <div className="container space-y-12 py-8">
      {(featuredCards?.length ?? 0) > 0 && (
        <FeaturedCardsCarousel cards={featuredCards ?? []} />
      )}

      {!viewer.isPremium && (
        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-background p-8 md:p-12">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Crown className="h-3 w-3" />
              Desbloqueie tudo com Premium
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Converse de verdade com quem compartilha seus{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                desejos mais íntimos
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Acesso ilimitado a todas as salas, chat em tempo real e a possibilidade de criar a sua
              própria sala. Comunidade adulta, segura e sem julgamentos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="premium">
                <Link href="/premium">
                  <Crown className="h-5 w-5" />
                  Virar Premium
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/salas">Explorar salas</Link>
              </Button>
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
          />
        </section>
      )}

      <CategoriesGrid
        categories={categories}
        userRoomsCount={userRoomsCount ?? 0}
        totalRoomsCount={totalRoomsCount ?? 0}
      />

      <FeaturedSection rooms={featured ?? []} initialViewer={initialViewer} />

      <TopActiveSection rooms={top ?? []} initialViewer={initialViewer} />
    </div>
  );
}

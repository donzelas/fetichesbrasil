import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { createClient, getViewer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { FeaturedCardsCarousel } from "@/components/home/FeaturedCardsCarousel";
import { HomeFeatureCards } from "@/components/home/HomeFeatureCards";
import { LandingPage } from "@/components/landing/LandingPage";
import { signBlogImagePaths } from "@/lib/blog/sign-images";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const viewer = await getViewer();

  if (!viewer.isAuthenticated) {
    const [{ data: rpcOnline }, { data: rpcRooms }] = await Promise.all([
      supabase.rpc("global_online_users"),
      supabase.rpc("global_active_rooms"),
    ]);
    return (
      <LandingPage
        onlineUsers={typeof rpcOnline === "number" ? rpcOnline : 0}
        activeRooms={typeof rpcRooms === "number" ? rpcRooms : 0}
      />
    );
  }

  if (viewer.isAdmin) {
    redirect("/admin");
  }

  const [
    { data: featuredCards },
    { data: rpcOnline },
    { data: rpcRooms },
    { data: rpcPosts },
    { data: latestPost },
  ] = await Promise.all([
    supabase
      .from("featured_fetish_cards")
      .select("id, title, description, image_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.rpc("global_online_users"),
    supabase.rpc("global_active_rooms"),
    supabase.rpc("blog_posts_today"),
    supabase
      .from("blog_posts")
      .select("id, title, image_paths")
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const onlineUsers = typeof rpcOnline === "number" ? rpcOnline : 0;
  const activeRooms = typeof rpcRooms === "number" ? rpcRooms : 0;
  const postsToday = typeof rpcPosts === "number" ? rpcPosts : 0;

  let latestThumb: string | null = null;
  let latestTitle: string | null = null;
  if (latestPost) {
    latestTitle = latestPost.title;
    const firstPath = latestPost.image_paths?.[0] ?? null;
    if (firstPath) {
      const map = await signBlogImagePaths(supabase, [firstPath]);
      latestThumb = map[firstPath] ?? null;
    }
  }

  return (
    <div className="container space-y-10 py-8">
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
                <Link href="/chat">Explorar chat</Link>
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

      <HomeFeatureCards
        chat={{ activeRooms, onlineUsers }}
        blog={{
          postsToday,
          latestPostThumb: latestThumb,
          latestPostTitle: latestTitle,
        }}
      />
    </div>
  );
}

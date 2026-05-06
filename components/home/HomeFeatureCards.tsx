import Link from "next/link";
import { MessageCircle, Newspaper } from "lucide-react";

interface HomeFeatureCardsProps {
  chat: {
    activeRooms: number;
    onlineUsers: number;
  };
  blog: {
    postsToday: number;
    latestPostThumb?: string | null;
    latestPostTitle?: string | null;
  };
}

export function HomeFeatureCards({ chat, blog }: HomeFeatureCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Link
        href="/chat"
        className="group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/15 via-card to-card/60 p-6 transition-all hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/20 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/30 blur-3xl transition-opacity group-hover:opacity-80"
        />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <MessageCircle className="h-4 w-4" />
            Bate-papo ao vivo
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">CHAT</h2>
          <p className="text-sm text-muted-foreground">
            Conheça gente nova nas salas de cada fetiche e categoria. Conversa em tempo real.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {chat.activeRooms} {chat.activeRooms === 1 ? "sala ativa" : "salas ativas"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-500">
              {chat.onlineUsers} {chat.onlineUsers === 1 ? "usuário" : "usuários"} agora
            </span>
          </div>

          <div className="pt-2 text-sm font-semibold text-primary group-hover:underline">
            Entrar →
          </div>
        </div>
      </Link>

      <Link
        href="/blog"
        className="group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-accent/20 via-card to-card/60 p-6 transition-all hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/20 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-accent/30 blur-3xl transition-opacity group-hover:opacity-80"
        />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Newspaper className="h-4 w-4" />
            Comunidade
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">BLOG</h2>
          <p className="text-sm text-muted-foreground">
            Histórias, fantasias e relatos da comunidade. Curta, comente e compartilhe os seus.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 font-medium text-accent">
              {blog.postsToday} {blog.postsToday === 1 ? "novo post hoje" : "novos posts hoje"}
            </span>

            {blog.latestPostThumb && (
              <span className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blog.latestPostThumb}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md border border-border/60 object-cover"
                />
                <span className="line-clamp-1 max-w-[180px] text-xs text-muted-foreground">
                  {blog.latestPostTitle ?? "Último post"}
                </span>
              </span>
            )}
          </div>

          <div className="pt-2 text-sm font-semibold text-accent group-hover:underline">
            Ver posts →
          </div>
        </div>
      </Link>
    </section>
  );
}

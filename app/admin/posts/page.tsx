import Link from "next/link";
import { Crown, MessageSquare, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlogImageCarousel } from "@/components/blog/BlogImageCarousel";
import { AdminPostActions } from "@/components/admin/AdminPostActions";
import { AdminCommentDeleteButton } from "@/components/admin/AdminCommentDeleteButton";
import { signBlogImagePaths } from "@/lib/blog/sign-images";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

type Status = "pending" | "approved" | "rejected";

interface PageProps {
  searchParams: Promise<{ tab?: Status }>;
}

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean | null;
}

interface AdminPostRow {
  id: string;
  title: string;
  content: string;
  image_paths: string[];
  status: Status;
  rejection_reason: string | null;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  approved_at: string | null;
  author: ProfileLite | null;
  fetish: { name: string; category: { name: string; emoji: string | null } | null } | null;
}

interface AdminCommentRow {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

const TABS: { id: Status; label: string }[] = [
  { id: "pending", label: "Pendentes" },
  { id: "approved", label: "Aprovados" },
  { id: "rejected", label: "Rejeitados" },
];

export default async function AdminPostsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab: Status = (sp.tab as Status) ?? "pending";
  const supabase = await createClient();

  const [
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { data: postsRaw },
  ] = await Promise.all([
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
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .is("deleted_at", null),
    supabase
      .from("blog_posts")
      .select(
        `id, title, content, image_paths, status, rejection_reason, is_pinned, like_count,
         comment_count, created_at, approved_at,
         author:profiles!blog_posts_author_id_fkey(id, username, display_name, avatar_url, is_premium),
         fetish:fetishes(name, category:categories(name, emoji))`
      )
      .eq("status", tab)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const posts = (postsRaw ?? []) as unknown as AdminPostRow[];
  const postIds = posts.map((p) => p.id);

  const allPaths = posts.flatMap((p) => p.image_paths);
  const imageUrls = await signBlogImagePaths(supabase, allPaths);

  const { data: commentsRaw } = postIds.length
    ? await supabase
        .from("blog_post_comments")
        .select(
          `id, post_id, content, created_at,
           author:profiles!blog_post_comments_author_id_fkey(id, username, display_name, avatar_url)`
        )
        .in("post_id", postIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
    : { data: [] as never[] };

  const commentsByPost = new Map<string, AdminCommentRow[]>();
  for (const row of (commentsRaw ?? []) as unknown as AdminCommentRow[]) {
    const list = commentsByPost.get(row.post_id) ?? [];
    list.push(row);
    commentsByPost.set(row.post_id, list);
  }

  const counts = {
    pending: pendingCount ?? 0,
    approved: approvedCount ?? 0,
    rejected: rejectedCount ?? 0,
  };

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">← Voltar</Link>
        </Button>
      </div>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Moderação do Blog</h1>
        <p className="text-muted-foreground">Aprove, rejeite ou remova publicações da comunidade.</p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border/60">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/posts?tab=${t.id}`}
            className={cn(
              "relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                tab === t.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {counts[t.id]}
            </span>
            {tab === t.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum post nesta aba.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((p) => {
            const carouselUrls = p.image_paths.map((path) => imageUrls[path]).filter(Boolean);
            const author = p.author;
            const initials =
              author?.display_name?.charAt(0)?.toUpperCase() ??
              author?.username?.charAt(0)?.toUpperCase() ??
              "?";
            return (
              <article key={p.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                <header className="flex flex-wrap items-start gap-3">
                  <Avatar className="h-10 w-10">
                    {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {author?.display_name ?? author?.username ?? "anônimo"}
                      </span>
                      <span className="text-xs text-muted-foreground">@{author?.username ?? "?"}</span>
                      {author?.is_premium && (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20">
                          <Crown className="h-3 w-3" /> Premium
                        </Badge>
                      )}
                      <Badge
                        className={cn(
                          "uppercase",
                          p.status === "pending" && "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20",
                          p.status === "approved" && "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20",
                          p.status === "rejected" && "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20"
                        )}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Criado em {formatDate(p.created_at)} ({formatRelativeTime(p.created_at)})
                      {p.approved_at && (
                        <>
                          <span className="mx-1.5">·</span>
                          Aprovado {formatRelativeTime(p.approved_at)}
                        </>
                      )}
                      {p.fetish && (
                        <>
                          <span className="mx-1.5">·</span>
                          {p.fetish.category?.emoji ?? ""} {p.fetish.name}
                        </>
                      )}
                    </div>
                  </div>
                  <AdminPostActions postId={p.id} status={p.status} isPinned={p.is_pinned} />
                </header>

                <div className="mt-3">
                  <h3 className="text-base font-semibold">{p.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
                    {p.content}
                  </p>
                </div>

                {carouselUrls.length > 0 && (
                  <div className="mt-3">
                    <BlogImageCarousel urls={carouselUrls} alt={p.title} />
                  </div>
                )}

                {p.rejection_reason && (
                  <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">
                    <strong>Motivo da rejeição:</strong> {p.rejection_reason}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> {p.like_count} curtidas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {p.comment_count} comentários
                  </span>
                </div>

                {p.status === "approved" && (commentsByPost.get(p.id)?.length ?? 0) > 0 && (
                  <details className="mt-3 rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Comentários ({commentsByPost.get(p.id)?.length ?? 0})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {(commentsByPost.get(p.id) ?? []).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start gap-2 rounded-lg bg-muted/40 p-2"
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                            <AvatarFallback className="text-xs">
                              {c.author?.display_name?.charAt(0)?.toUpperCase() ??
                                c.author?.username?.charAt(0)?.toUpperCase() ??
                                "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs">
                              <strong>
                                {c.author?.display_name ?? c.author?.username ?? "anônimo"}
                              </strong>
                              <span className="ml-1 text-muted-foreground">
                                · {formatRelativeTime(c.created_at)}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
                          </div>
                          <AdminCommentDeleteButton commentId={c.id} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

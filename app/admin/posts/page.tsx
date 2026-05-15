import Link from "next/link";
import { ChevronDown, Crown, ImageIcon, MessageSquare, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlogImageCarousel } from "@/components/blog/BlogImageCarousel";
import { AdminPostActions } from "@/components/admin/AdminPostActions";
import { AdminCommentDeleteButton } from "@/components/admin/AdminCommentDeleteButton";
import { signBlogImagePaths } from "@/lib/blog/sign-images";
import { formatRelativeTime } from "@/lib/utils/format";
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
    <div className="container max-w-5xl space-y-4 py-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">← Voltar</Link>
        </Button>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Moderação do Blog</h1>
        <p className="text-sm text-muted-foreground">
          Aprove, rejeite ou remova publicações da comunidade.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/posts?tab=${t.id}`}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
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
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum post nesta aba.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
          {posts.map((p) => {
            const carouselUrls = p.image_paths.map((path) => imageUrls[path]).filter(Boolean);
            const author = p.author;
            const thumb = carouselUrls[0];
            const comments = commentsByPost.get(p.id) ?? [];

            return (
              <details key={p.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 transition hover:bg-muted/30">
                  {author?.avatar_url && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={author.avatar_url} />
                    </Avatar>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate font-semibold text-foreground">
                        {author?.display_name ?? author?.username ?? "anônimo"}
                      </span>
                      {author?.is_premium && (
                        <Crown className="h-3 w-3 shrink-0 text-amber-500" aria-label="Premium" />
                      )}
                      <span>·</span>
                      <span className="shrink-0">{formatRelativeTime(p.created_at)}</span>
                      {p.is_pinned && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          fixado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">
                        {p.title || <span className="text-muted-foreground">(sem título)</span>}
                      </p>
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {p.content}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {carouselUrls.length > 0 && (
                      <span className="inline-flex items-center gap-0.5" title={`${carouselUrls.length} imagem(ns)`}>
                        <ImageIcon className="h-3 w-3" />
                        {carouselUrls.length}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5" title="Curtidas">
                      <ShieldCheck className="h-3 w-3" />
                      {p.like_count}
                    </span>
                    <span className="inline-flex items-center gap-0.5" title="Comentários">
                      <MessageSquare className="h-3 w-3" />
                      {p.comment_count}
                    </span>
                  </div>

                  {thumb && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-border/60 object-cover"
                      loading="lazy"
                    />
                  )}

                  <Badge
                    className={cn(
                      "shrink-0 uppercase",
                      p.status === "pending" && "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20",
                      p.status === "approved" && "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20",
                      p.status === "rejected" && "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20"
                    )}
                  >
                    {p.status}
                  </Badge>

                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                </summary>

                <div className="border-t border-border/60 bg-muted/10 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      @{author?.username ?? "?"}
                      {p.fetish && (
                        <>
                          <span className="mx-1.5">·</span>
                          {p.fetish.category?.emoji ?? ""} {p.fetish.name}
                        </>
                      )}
                      {p.approved_at && (
                        <>
                          <span className="mx-1.5">·</span>
                          aprovado {formatRelativeTime(p.approved_at)}
                        </>
                      )}
                    </span>
                    <AdminPostActions postId={p.id} status={p.status} isPinned={p.is_pinned} />
                  </div>

                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
                    {p.content}
                  </p>

                  {carouselUrls.length > 0 && (
                    <div className="mt-3 max-w-md">
                      <BlogImageCarousel urls={carouselUrls} alt={p.title} />
                    </div>
                  )}

                  {p.rejection_reason && (
                    <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-600">
                      <strong>Motivo:</strong> {p.rejection_reason}
                    </div>
                  )}

                  {p.status === "approved" && comments.length > 0 && (
                    <div className="mt-3 rounded-lg border border-border/60 bg-card/50 p-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        Comentários ({comments.length})
                      </p>
                      <div className="space-y-1.5">
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-start gap-2 rounded-md bg-muted/40 p-1.5"
                          >
                            {c.author?.avatar_url && (
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={c.author.avatar_url} />
                              </Avatar>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px]">
                                <strong>
                                  {c.author?.display_name ?? c.author?.username ?? "anônimo"}
                                </strong>
                                <span className="ml-1 text-muted-foreground">
                                  · {formatRelativeTime(c.created_at)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap break-words text-xs">{c.content}</p>
                            </div>
                            <AdminCommentDeleteButton commentId={c.id} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

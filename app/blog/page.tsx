import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient, getViewerOrRedirectAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BlogComposer } from "@/components/blog/BlogComposer";
import { BlogPostCard, type BlogPostCardData } from "@/components/blog/BlogPostCard";
import type { BlogCommentItem } from "@/components/blog/BlogComments";
import { signBlogImagePaths } from "@/lib/blog/sign-images";
import type { CategoryWithFetishes } from "@/types/database";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const POSTS_PER_PAGE = 10;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();
  const viewer = await getViewerOrRedirectAdmin("/blog");

  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const [
    { data: postsRaw, count },
    { data: catsRaw },
  ] = await Promise.all([
    supabase
      .from("blog_posts")
      .select(
        `id, title, content, image_paths, status, rejection_reason, is_pinned,
         like_count, comment_count, created_at, approved_at,
         author:profiles!blog_posts_author_id_fkey(id, username, display_name, avatar_url, is_premium),
         fetish:fetishes(id, name, slug, category:categories(name, emoji))`,
        { count: "exact" }
      )
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("is_pinned", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .range(from, to),
    supabase
      .from("categories")
      .select("*, fetishes(*)")
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "fetishes", ascending: true }),
  ]);

  const posts = (postsRaw ?? []) as unknown as BlogPostCardData[];
  const categories = (catsRaw ?? []) as unknown as CategoryWithFetishes[];

  const allPaths = posts.flatMap((p) => p.image_paths);
  const imageUrls = await signBlogImagePaths(supabase, allPaths);

  const postIds = posts.map((p) => p.id);

  const [{ data: likedRows }, { data: commentRows }] = await Promise.all([
    viewer.userId && postIds.length > 0
      ? supabase
          .from("blog_post_likes")
          .select("post_id")
          .eq("user_id", viewer.userId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    postIds.length > 0
      ? supabase
          .from("blog_post_comments")
          .select(
            "id, post_id, content, created_at, author:profiles!blog_post_comments_author_id_fkey(id, username, display_name, avatar_url)"
          )
          .in("post_id", postIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const likedSet = new Set((likedRows ?? []).map((r) => r.post_id));
  const commentsByPost = new Map<string, BlogCommentItem[]>();
  const commentRowsTyped = (commentRows ?? []) as unknown as Array<{
    id: string;
    post_id: string;
    content: string;
    created_at: string;
    author: BlogCommentItem["author"] | BlogCommentItem["author"][];
  }>;
  for (const row of commentRowsTyped) {
    const list = commentsByPost.get(row.post_id) ?? [];
    list.push({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      author: Array.isArray(row.author) ? row.author[0] ?? null : row.author,
    });
    commentsByPost.set(row.post_id, list);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  return (
    <div className="container space-y-6 py-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground hover:text-foreground">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para home
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Blog da comunidade</h1>
        <p className="text-sm text-muted-foreground">
          Compartilhe suas histórias, fantasias e fetiches. Tudo passa por aprovação antes de aparecer
          aqui.
        </p>
      </header>

      {viewer.userId && (
        <BlogComposer currentUserId={viewer.userId} categories={categories} />
      )}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda não há publicações aprovadas. Seja o primeiro!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <BlogPostCard
              key={p.id}
              post={p}
              imageUrls={imageUrls}
              liked={likedSet.has(p.id)}
              currentUserId={viewer.userId}
              isAdmin={viewer.isAdmin}
              initialComments={commentsByPost.get(p.id) ?? []}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination current={page} total={totalPages} />
      )}
    </div>
  );
}

function Pagination({ current, total }: { current: number; total: number }) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1">
      {current > 1 && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/blog?page=${current - 1}`}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        </Button>
      )}

      {start > 1 && (
        <>
          <PageLink page={1} active={false} />
          {start > 2 && <span className="px-2 text-muted-foreground">...</span>}
        </>
      )}

      {pages.map((p) => (
        <PageLink key={p} page={p} active={p === current} />
      ))}

      {end < total && (
        <>
          {end < total - 1 && <span className="px-2 text-muted-foreground">...</span>}
          <PageLink page={total} active={false} />
        </>
      )}

      {current < total && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/blog?page=${current + 1}`}>
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </nav>
  );
}

function PageLink({ page, active }: { page: number; active: boolean }) {
  return (
    <Link
      href={`/blog?page=${page}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "h-9 min-w-9 rounded-md px-3 text-sm font-medium transition flex items-center justify-center",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {page}
    </Link>
  );
}

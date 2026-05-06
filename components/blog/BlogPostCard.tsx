"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Flag, MessageCircle, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { BlogImageCarousel } from "./BlogImageCarousel";
import { BlogLikeButton } from "./BlogLikeButton";
import { BlogReportDialog } from "./BlogReportDialog";
import { BlogComments, type BlogCommentItem } from "./BlogComments";

export interface BlogPostCardData {
  id: string;
  title: string;
  content: string;
  image_paths: string[];
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  approved_at: string | null;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_premium: boolean;
  } | null;
  fetish: {
    id: string;
    name: string;
    slug: string;
    category: { name: string; emoji: string | null } | null;
  } | null;
}

interface BlogPostCardProps {
  post: BlogPostCardData;
  imageUrls: Record<string, string>;
  liked: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  initialComments: BlogCommentItem[];
}

export function BlogPostCard({
  post,
  imageUrls,
  liked,
  currentUserId,
  isAdmin,
  initialComments,
}: BlogPostCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const carouselUrls = post.image_paths.map((p) => imageUrls[p]).filter(Boolean);
  const author = post.author;
  const initials =
    author?.display_name?.charAt(0)?.toUpperCase() ??
    author?.username?.charAt(0)?.toUpperCase() ??
    "?";

  async function handleDeleteAdmin() {
    const supabase = createClient();
    const { error } = await supabase.rpc("reject_blog_post", {
      p_post_id: post.id,
      p_reason: "Removido pela moderação",
    });
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return;
    }
    toast.success("Post removido.");
    router.refresh();
  }

  async function handleDeleteOwn() {
    const supabase = createClient();
    const { error } = await supabase.rpc("soft_delete_my_blog_post", { p_post_id: post.id });
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Post excluído.");
    router.refresh();
  }

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition hover:border-border",
        post.is_pinned && "ring-1 ring-amber-500/30"
      )}
    >
      <header className="flex items-start gap-3">
        <Link href={`/u/${author?.username ?? ""}`} className="shrink-0">
          <Avatar className="h-10 w-10">
            {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold leading-tight">
              {author?.display_name ?? author?.username ?? "anônimo"}
            </span>
            {author?.is_premium && (
              <Badge variant="default" className="gap-1 bg-amber-500/15 text-amber-500 hover:bg-amber-500/20">
                <Crown className="h-3 w-3" /> Premium
              </Badge>
            )}
            {post.is_pinned && (
              <Badge variant="default" className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20">
                Fixado
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <span>@{author?.username ?? "?"}</span>
            <span className="mx-1.5">·</span>
            <time>{formatRelativeTime(post.approved_at ?? post.created_at)}</time>
            {post.fetish && (
              <>
                <span className="mx-1.5">·</span>
                <span>
                  {post.fetish.category?.emoji ?? ""} {post.fetish.name}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mais opções"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-10 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border/60 bg-popover p-1 text-sm shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {currentUserId && currentUserId !== author?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setReporting(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left hover:bg-muted"
                >
                  <Flag className="h-3.5 w-3.5" /> Denunciar
                </button>
              )}
              {currentUserId && currentUserId === author?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleDeleteOwn();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir post
                </button>
              )}
              {isAdmin && currentUserId !== author?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleDeleteAdmin();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover (admin)
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mt-3">
        <h3 className="text-base font-semibold leading-snug">{post.title}</h3>
        <div
          className={cn(
            "mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90",
            !expanded && "line-clamp-4"
          )}
        >
          {post.content}
        </div>
        {post.content.length > 220 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? "ver menos" : "ver mais"}
          </button>
        )}
      </div>

      {carouselUrls.length > 0 && (
        <div className="mt-3">
          <BlogImageCarousel urls={carouselUrls} alt={post.title} />
        </div>
      )}

      <footer className="mt-3 flex items-center gap-2">
        <BlogLikeButton
          postId={post.id}
          initialLiked={liked}
          initialCount={post.like_count}
        />
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium tabular-nums">{post.comment_count}</span>
        </button>
      </footer>

      {showComments && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <BlogComments
            postId={post.id}
            initialComments={initialComments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {reporting && (
        <BlogReportDialog
          postId={post.id}
          open={reporting}
          onOpenChange={setReporting}
        />
      )}
    </article>
  );
}

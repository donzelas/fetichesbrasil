"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2, Flag, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BlogReportDialog } from "./BlogReportDialog";
import { formatRelativeTime } from "@/lib/utils/format";

export interface BlogCommentItem {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface BlogCommentsProps {
  postId: string;
  initialComments: BlogCommentItem[];
  currentUserId: string | null;
  isAdmin: boolean;
}

export function BlogComments({
  postId,
  initialComments,
  currentUserId,
  isAdmin,
}: BlogCommentsProps) {
  const [comments, setComments] = useState<BlogCommentItem[]>(initialComments);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const channel = supabase
      .channel(`blog_comments:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "blog_post_comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string };
          const { data } = await supabase
            .from("blog_post_comments")
            .select(
              "id, content, created_at, author:profiles!blog_post_comments_author_id_fkey(id, username, display_name, avatar_url)"
            )
            .eq("id", row.id)
            .single();
          if (data) {
            setComments((prev) => {
              if (prev.some((c) => c.id === data.id)) return prev;
              return [
                ...prev,
                {
                  id: data.id,
                  content: data.content,
                  created_at: data.created_at,
                  author: Array.isArray(data.author) ? data.author[0] : data.author,
                } as BlogCommentItem,
              ];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "blog_post_comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; deleted_at: string | null };
          if (row.deleted_at) {
            setComments((prev) => prev.filter((c) => c.id !== row.id));
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [postId]);

  async function send() {
    const trimmed = content.trim();
    if (trimmed.length < 1) return;
    if (!currentUserId) {
      toast.error("Faça login para comentar.");
      return;
    }
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("add_blog_comment", {
      p_post_id: postId,
      p_content: trimmed,
    });
    setSending(false);
    if (error) {
      toast.error("Erro ao comentar", { description: error.message });
      return;
    }
    setContent("");
  }

  async function adminDelete(commentId: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_blog_comment", { p_comment_id: commentId });
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Comentário removido.");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Seja o primeiro a comentar.
          </p>
        ) : (
          comments.map((c) => {
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                  <AvatarFallback className="text-xs">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 rounded-2xl bg-muted/40 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {c.author?.display_name ?? c.author?.username ?? "anônimo"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {currentUserId && currentUserId !== c.author?.id && (
                      <button
                        type="button"
                        onClick={() => setReportingId(c.id)}
                        className="inline-flex items-center gap-1 hover:text-destructive"
                      >
                        <Flag className="h-3 w-3" /> denunciar
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => adminDelete(c.id)}
                        className="inline-flex items-center gap-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" /> excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {currentUserId && (
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Escreva um comentário..."
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length}/1000</span>
            <Button size="sm" onClick={send} disabled={sending || content.trim().length < 1}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Comentar
            </Button>
          </div>
        </div>
      )}

      {reportingId && (
        <BlogReportDialog
          commentId={reportingId}
          open={!!reportingId}
          onOpenChange={(o) => !o && setReportingId(null)}
        />
      )}
    </div>
  );
}

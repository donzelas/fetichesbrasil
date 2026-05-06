"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface BlogLikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function BlogLikeButton({ postId, initialLiked, initialCount }: BlogLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const supabase = createClient();
    const optimisticLiked = !liked;
    const optimisticCount = optimisticLiked ? count + 1 : Math.max(count - 1, 0);
    setLiked(optimisticLiked);
    setCount(optimisticCount);

    startTransition(async () => {
      const { data, error } = await supabase.rpc("toggle_blog_post_like", { p_post_id: postId });
      if (error) {
        setLiked(!optimisticLiked);
        setCount(count);
        toast.error("Não foi possível curtir", { description: error.message });
        return;
      }
      if (typeof data === "boolean") setLiked(data);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
        liked
          ? "bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}

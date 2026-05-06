"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  commentId: string;
}

export function AdminCommentDeleteButton({ commentId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_blog_comment", { p_comment_id: commentId });
      if (error) {
        toast.error("Erro ao excluir comentário", { description: error.message });
        return;
      }
      toast.success("Comentário removido.");
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={go} disabled={pending} className="text-destructive">
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </Button>
  );
}

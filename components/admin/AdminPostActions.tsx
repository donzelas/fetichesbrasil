"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pin, PinOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdminPostActionsProps {
  postId: string;
  status: "pending" | "approved" | "rejected";
  isPinned: boolean;
}

export function AdminPostActions({ postId, status, isPinned }: AdminPostActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("approve_blog_post", { p_post_id: postId });
      if (error) {
        toast.error("Erro ao aprovar", { description: error.message });
        return;
      }
      toast.success("Post aprovado.");
      router.refresh();
    });
  }

  async function rejectSubmit() {
    if (reason.trim().length < 3) {
      toast.error("Motivo precisa ter ao menos 3 caracteres.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.rpc("reject_blog_post", {
      p_post_id: postId,
      p_reason: reason.trim(),
    });
    if (error) {
      toast.error("Erro ao rejeitar", { description: error.message });
      return;
    }
    toast.success("Post rejeitado.");
    setRejectOpen(false);
    setReason("");
    router.refresh();
  }

  function togglePin() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("pin_blog_post", {
        p_post_id: postId,
        p_pin: !isPinned,
      });
      if (error) {
        toast.error("Erro ao fixar", { description: error.message });
        return;
      }
      toast.success(isPinned ? "Post desafixado." : "Post fixado.");
      router.refresh();
    });
  }

  function hardDelete() {
    if (!confirm("Excluir definitivamente este post? (não dá pra desfazer)")) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
      if (error) {
        toast.error("Erro ao excluir", { description: error.message });
        return;
      }
      toast.success("Post excluído.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" && (
        <Button size="sm" variant="default" onClick={approve} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Aprovar
        </Button>
      )}

      {status !== "rejected" && (
        <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={pending}>
          <X className="h-4 w-4" />
          Rejeitar
        </Button>
      )}

      {status === "approved" && (
        <Button size="sm" variant="outline" onClick={togglePin} disabled={pending}>
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          {isPinned ? "Desafixar" : "Fixar"}
        </Button>
      )}

      <Button size="sm" variant="outline" onClick={hardDelete} disabled={pending}>
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar publicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo (mostrado pro autor)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex: conteúdo proibido, spam, fora das regras..."
            />
            <p className="text-right text-xs text-muted-foreground">{reason.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={rejectSubmit} disabled={reason.trim().length < 3}>
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

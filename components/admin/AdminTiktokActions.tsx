"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
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
import { AdminTiktokEditModal } from "@/components/admin/AdminTiktokEditModal";

interface Props {
  scriptId: string;
  status: string;
  hasVideo: boolean;
  videoPath: string | null;
  shareUrl: string | null;
  editable: {
    titulo: string;
    hook: string;
    corpo: string;
    cta: string;
    hashtags: string[];
    broll_tags: string[];
    voz: string;
  };
}

const PENDING_STATUSES = ["pending_approval", "rejected"];
const FAILURE_STATUSES = ["failed", "posted_inbox"];

export function AdminTiktokActions({
  scriptId,
  status,
  hasVideo,
  videoPath,
  shareUrl,
  editable,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const canApprove = PENDING_STATUSES.includes(status);
  const canReject = status === "pending_approval";
  const canRetry = FAILURE_STATUSES.includes(status);
  const canDelete = status !== "processing";
  const canEdit = ["pending_approval", "rejected", "failed"].includes(status);

  async function approve() {
    startTransition(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("approve_tiktok_script", {
        p_script_id: scriptId,
      });
      if (rpcError) {
        toast.error("Erro ao aprovar", { description: rpcError.message });
        return;
      }
      const triggerRes = await fetch(`/api/admin/tiktok/trigger/${scriptId}`, {
        method: "POST",
      });
      const body = await triggerRes.json().catch(() => ({}));
      if (!triggerRes.ok) {
        toast.warning("Roteiro aprovado, mas pipeline não acionado.", {
          description: body.error ?? "Configure IAS_LOCAL_PYTHON_PATH ou N8N_TIKTOK_WEBHOOK_URL",
        });
      } else {
        toast.success(
          body.mode === "local"
            ? "Aprovado. Pipeline rodando local (1-2 min, acompanhe o status)."
            : "Aprovado. Pipeline iniciado via n8n."
        );
      }
      router.refresh();
    });
  }

  async function rejectSubmit() {
    if (reason.trim().length < 3) {
      toast.error("Motivo precisa ter ao menos 3 caracteres.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.rpc("reject_tiktok_script", {
      p_script_id: scriptId,
      p_reason: reason.trim(),
    });
    if (error) {
      toast.error("Erro ao rejeitar", { description: error.message });
      return;
    }
    toast.success("Roteiro rejeitado.");
    setRejectOpen(false);
    setReason("");
    router.refresh();
  }

  function retry() {
    startTransition(async () => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("retry_tiktok_script", {
        p_script_id: scriptId,
      });
      if (rpcError) {
        toast.error("Erro ao reprocessar", { description: rpcError.message });
        return;
      }
      const triggerRes = await fetch(`/api/admin/tiktok/trigger/${scriptId}`, {
        method: "POST",
      });
      const body = await triggerRes.json().catch(() => ({}));
      if (!triggerRes.ok) {
        toast.warning("Reprocessamento marcado, mas pipeline não acionado.", {
          description: body.error,
        });
      } else {
        toast.success(
          body.mode === "local"
            ? "Reprocessamento rodando local (1-2 min)."
            : "Reprocessamento iniciado."
        );
      }
      router.refresh();
    });
  }

  function hardDelete() {
    if (!confirm("Excluir este roteiro? (não dá pra desfazer)")) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_tiktok_script", {
        p_script_id: scriptId,
      });
      if (error) {
        toast.error("Erro ao excluir", { description: error.message });
        return;
      }
      toast.success("Roteiro excluído.");
      router.refresh();
    });
  }

  async function downloadVideo() {
    if (!videoPath) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("tiktok-videos")
      .createSignedUrl(videoPath, 60 * 10);
    if (error || !data) {
      toast.error("Erro ao gerar link", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canApprove && (
        <Button size="sm" variant="default" onClick={approve} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Aprovar
        </Button>
      )}

      {canEdit && <AdminTiktokEditModal scriptId={scriptId} initial={editable} />}

      {canReject && (
        <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={pending}>
          <X className="h-4 w-4" />
          Rejeitar
        </Button>
      )}

      {canRetry && (
        <Button size="sm" variant="outline" onClick={retry} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reprocessar
        </Button>
      )}

      {hasVideo && videoPath && (
        <Button size="sm" variant="outline" onClick={downloadVideo}>
          <Download className="h-4 w-4" />
          Baixar vídeo
        </Button>
      )}

      {shareUrl && (
        <Button asChild size="sm" variant="outline">
          <a href={shareUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Ver no TikTok
          </a>
        </Button>
      )}

      {canDelete && (
        <Button size="sm" variant="ghost" onClick={hardDelete} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar roteiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tiktok-reject-reason">
              Motivo (opcional, mas ajuda a melhorar a IA)
            </Label>
            <Textarea
              id="tiktok-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex: hook fraco, hashtags banidas, fora do tom..."
            />
            <p className="text-right text-xs text-muted-foreground">{reason.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={rejectSubmit}
              disabled={reason.trim().length < 3}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

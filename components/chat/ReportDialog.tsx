"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReportTarget {
  user_id: string;
  username: string;
  display_name: string;
}

interface ReportDialogProps {
  target: ReportTarget;
  roomId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({ target, roomId, open, onOpenChange }: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      toast.error("Descreva o motivo (mínimo 3 caracteres).");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("report_user", {
      p_reported_id: target.user_id,
      p_reason: trimmed,
      p_room_id: roomId,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao denunciar", { description: error.message });
      return;
    }
    toast.success("Denúncia enviada", {
      description: "Nossa equipe vai analisar e tomar as medidas necessárias.",
    });
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flag className="h-5 w-5" />
            Denunciar {target.display_name ?? target.username}
          </DialogTitle>
          <DialogDescription>
            Conte o que aconteceu. A denúncia é anônima — o usuário denunciado não saberá
            quem reportou.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="report-reason">Motivo</Label>
          <Textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Ex: spam, comportamento inadequado, conteúdo proibido..."
          />
          <p className="text-right text-xs text-muted-foreground">
            {reason.length}/500
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={loading || reason.trim().length < 3}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar denúncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

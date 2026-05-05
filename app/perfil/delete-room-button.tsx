"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
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

export function DeleteRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("soft_delete_room", { p_room_id: roomId });
    setLoading(false);
    if (error) {
      toast.error("Erro ao deletar", { description: error.message });
      return;
    }
    toast.success("Sala deletada");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar sala?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A sala e todas as mensagens serão removidas.
              Você poderá criar uma nova sala em 30 dias.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sim, deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SwitchRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRoomName: string;
  newRoomName: string;
  loading?: boolean;
  onConfirm: () => void;
}

export function SwitchRoomModal({
  open,
  onOpenChange,
  currentRoomName,
  newRoomName,
  loading = false,
  onConfirm,
}: SwitchRoomModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar de sala?</DialogTitle>
          <DialogDescription>
            Você só pode estar em uma sala por vez. Ao entrar em outra, você sairá da atual.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-4 text-sm">
          <div className="flex-1 truncate">
            <p className="text-xs text-muted-foreground">Atual</p>
            <p className="truncate font-medium">{currentRoomName}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 truncate">
            <p className="text-xs text-muted-foreground">Nova</p>
            <p className="truncate font-medium text-primary">{newRoomName}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sair e entrar na nova
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

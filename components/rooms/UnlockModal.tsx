"use client";

import Link from "next/link";
import { Crown, Image as ImageIcon, MessageCircle, Sparkles, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  unlockMessage: string;
  isAuthenticated: boolean;
}

export function UnlockModal({
  open,
  onOpenChange,
  roomName,
  unlockMessage,
  isAuthenticated,
}: UnlockModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full gradient-premium">
            <Lock className="h-7 w-7 text-premium-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">{roomName}</DialogTitle>
          <DialogDescription className="text-center text-base text-foreground/80 leading-relaxed">
            {unlockMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 grid gap-3 rounded-lg border border-border/50 bg-background/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-premium">
            <Crown className="h-4 w-4" />
            Com Premium você desbloqueia:
          </p>
          <ul className="space-y-2 text-sm text-foreground/90">
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Acesso a todas as salas e chats privados
            </li>
            <li className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Visualização e troca de imagens
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Criar sua própria sala exclusiva
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
          <Button asChild size="lg" variant="premium" className="w-full">
            <Link href="/premium">
              <Crown className="h-5 w-5" />
              Quero ser Premium
            </Link>
          </Button>
          {!isAuthenticated && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Já sou membro — entrar</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

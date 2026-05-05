"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ComingSoonButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="xl"
        variant="premium"
        className="mt-6 w-full"
        onClick={() => setOpen(true)}
      >
        <Crown className="h-5 w-5" />
        Quero ser Premium
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="mx-auto mb-2 text-5xl">🚀</div>
            <DialogTitle className="text-center text-2xl">
              Em breve!
            </DialogTitle>
            <DialogDescription className="text-center text-base text-foreground/80">
              Nossa integração de pagamento está em desenvolvimento.
              <br />
              Em breve você poderá assinar e desbloquear tudo.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enquanto isso, fique de olho — vamos avisar assim que liberarmos as assinaturas.
          </p>
          <Button onClick={() => setOpen(false)} variant="outline" className="mt-2 w-full">
            Voltar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

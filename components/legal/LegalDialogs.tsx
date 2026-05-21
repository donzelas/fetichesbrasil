"use client";

import Link from "next/link";
import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LEGAL_LAST_UPDATED,
  PrivacyPolicyBody,
  TermsOfUseBody,
} from "@/components/legal/LegalContent";

interface LegalTriggerProps {
  children: ReactNode;
  className?: string;
}

export function PrivacyPolicyTrigger({ children, className }: LegalTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className ?? "hover:text-foreground"}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl">Política de Privacidade</DialogTitle>
          <DialogDescription>
            Última atualização: {LEGAL_LAST_UPDATED}. Plataforma destinada exclusivamente a
            maiores de 18 anos.{" "}
            <Link href="/privacidade" className="underline">
              Abrir em página completa
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <PrivacyPolicyBody />
      </DialogContent>
    </Dialog>
  );
}

export function TermsOfUseTrigger({ children, className }: LegalTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className ?? "hover:text-foreground"}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl">Termos de Uso</DialogTitle>
          <DialogDescription>
            Última atualização: {LEGAL_LAST_UPDATED}. Leia com atenção antes de criar sua
            conta.{" "}
            <Link href="/termos" className="underline">
              Abrir em página completa
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <TermsOfUseBody />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fb_age_confirmed";

export function AgeGate() {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setConfirmed(v === "1");
  }, []);

  if (confirmed === null || confirmed === true) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl">🔞</div>
        <h2 className="mb-2 text-2xl font-bold">Conteúdo Adulto</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Este site contém material destinado exclusivamente a maiores de 18 anos.
          Ao continuar, você confirma que tem idade legal e concorda com nossos termos.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            variant="gradient"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "1");
              setConfirmed(true);
            }}
          >
            Tenho 18 anos ou mais — Entrar
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
          >
            Sair
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Fetiches Brasil • Ambiente seguro e consensual entre adultos
        </p>
      </div>
    </div>
  );
}

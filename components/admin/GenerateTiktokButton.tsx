"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GenerateTiktokButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const res = await fetch("/api/admin/tiktok/generate", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao gerar roteiro", {
          description: body.error ?? "Verifique os logs do servidor",
        });
        return;
      }
      toast.success("Novo roteiro gerado pela IA.");
      router.refresh();
    });
  }

  return (
    <Button onClick={gerar} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      Gerar novo roteiro
    </Button>
  );
}

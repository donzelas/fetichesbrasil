"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  pending: number;
  total: number;
}

export function SeoGenerateButtons({ pending, total }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function trigger(body: Record<string, unknown>, msg: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao iniciar geração", {
          description: data.error ?? "Erro desconhecido",
        });
        return;
      }
      toast.success(msg, {
        description:
          "Pode acompanhar o progresso atualizando esta página (F5) ou aguarde ~5min.",
      });
      // Atualiza a página a cada 30s pra mostrar progresso
      const id = window.setInterval(() => router.refresh(), 30_000);
      window.setTimeout(() => window.clearInterval(id), 10 * 60_000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          trigger(
            { mode: "pending" },
            `Iniciada geração de ${pending} pendentes em background.`
          )
        }
        disabled={loading || pending === 0}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Gerar {pending} pendentes
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          trigger(
            { mode: "pending", limit: 5 },
            "Iniciada geração de 5 pendentes (teste rápido)."
          )
        }
        disabled={loading || pending === 0}
      >
        Gerar 5 (teste)
      </Button>

      <Button
        variant="outline"
        onClick={() => {
          if (
            !confirm(
              `Regerar TODOS os ${total} fetiches? Vai sobrescrever conteúdo existente e demorar ~${Math.ceil(
                total / 30
              )} min.`
            )
          )
            return;
          trigger(
            { mode: "all", force: true },
            `Iniciada regeneração de todos os ${total} fetiches.`
          );
        }}
        disabled={loading}
      >
        <RefreshCw className="h-4 w-4" />
        Regerar todos
      </Button>
    </div>
  );
}

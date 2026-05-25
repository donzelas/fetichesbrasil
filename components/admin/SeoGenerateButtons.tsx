"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  pending: number;
  total: number;
}

interface Progress {
  running: boolean;
  done: number;
  failed: number;
  current: string | null;
  abort: boolean;
  mode: "pending" | "all";
  total: number;
}

const DELAY_BETWEEN_CALLS_MS = 2500; // respeita rate limit Groq

export function SeoGenerateButtons({ pending, total }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);

  // Auto-refresh do dashboard a cada 5s durante geracao
  useEffect(() => {
    if (!progress?.running) return;
    const id = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(id);
  }, [progress?.running, router]);

  async function runLoop(mode: "pending" | "all", limit: number) {
    setProgress({
      running: true,
      done: 0,
      failed: 0,
      current: null,
      abort: false,
      mode,
      total: limit,
    });

    let done = 0;
    let failed = 0;
    let stopped = false;

    for (let i = 0; i < limit; i++) {
      // Verifica se usuario clicou em parar
      setProgress((prev) => {
        if (prev?.abort) stopped = true;
        return prev;
      });
      if (stopped) break;

      try {
        const res = await fetch("/api/admin/seo/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "next", force: mode === "all" }),
        });
        const data = await res.json();

        if (data.done) {
          // Acabaram os pendentes
          break;
        }
        if (!res.ok) {
          failed++;
          toast.error(`Falha em ${data.slug ?? "?"}`, {
            description: data.error ?? "erro desconhecido",
          });
        } else {
          done++;
          setProgress((prev) =>
            prev ? { ...prev, done, current: `${data.name} (${data.words} palavras)` } : null
          );
        }
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Erro de rede", { description: msg });
      }

      // Respira pra nao bater no rate limit
      if (i < limit - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
      }
    }

    setProgress((prev) =>
      prev ? { ...prev, running: false, done, failed } : null
    );

    toast.success(`Concluido! ${done} gerados, ${failed} falhas`);
    router.refresh();
  }

  function abort() {
    setProgress((prev) => (prev ? { ...prev, abort: true } : null));
    toast.info("Parando geração...");
  }

  if (progress?.running) {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Gerando {progress.mode === "pending" ? "pendentes" : "todos"} ({progress.done}/{progress.total})
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {progress.current ?? "iniciando..."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={abort}>
            <XCircle className="h-4 w-4" />
            Parar
          </Button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => runLoop("pending", pending)}
        disabled={pending === 0}
      >
        <Sparkles className="h-4 w-4" />
        Gerar {pending} pendentes
      </Button>

      <Button
        variant="outline"
        onClick={() => runLoop("pending", 5)}
        disabled={pending === 0}
      >
        Gerar 5 (teste)
      </Button>

      <Button
        variant="outline"
        onClick={() => {
          if (
            !confirm(
              `Regerar TODOS os ${total} fetiches? Vai sobrescrever conteúdo existente e demorar ~${Math.ceil(
                (total * 7.5) / 60
              )} min.`
            )
          )
            return;
          runLoop("all", total);
        }}
      >
        <RefreshCw className="h-4 w-4" />
        Regerar todos
      </Button>
    </div>
  );
}

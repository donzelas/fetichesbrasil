"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Timer ao vivo durante a producao do video.
 *
 * - Mostra segundos decorridos desde startedAt
 * - Mostra mensagem do step atual
 * - Faz auto-refresh da pagina a cada POLL_MS para puxar status novo
 *   do banco, ate que o status saia da fase "em producao"
 */

const IN_PROGRESS_STATUSES = new Set([
  "approved",
  "processing",
  "audio_done",
  "broll_done",
  "srt_done",
]);

const POLL_MS = 3000;

// Estimativa media do pipeline (em segundos). Usado pra estimar ETA.
const PIPELINE_ESTIMATE_S = 35;

interface Props {
  status: string;
  startedAt: string | null;
  message: string | null;
}

export function TiktokProgressTimer({ status, startedAt, message }: Props) {
  const router = useRouter();
  const inProgress = IN_PROGRESS_STATUSES.has(status);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!inProgress || !startedAt) {
      setElapsed(0);
      return;
    }
    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [inProgress, startedAt]);

  useEffect(() => {
    if (!inProgress) return;
    const id = window.setInterval(() => router.refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [inProgress, router]);

  if (!inProgress) return null;

  const eta = Math.max(0, PIPELINE_ESTIMATE_S - elapsed);
  const pct = Math.min(99, Math.round((elapsed / PIPELINE_ESTIMATE_S) * 100));

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {message ?? "Processando..."}
        </span>
        <span className="ml-auto font-mono text-muted-foreground">
          {formatTime(elapsed)}
          {eta > 0 && <span className="opacity-60"> / ~{formatTime(PIPELINE_ESTIMATE_S)}</span>}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-blue-500/10">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            elapsed > PIPELINE_ESTIMATE_S
              ? "bg-amber-500"
              : "bg-blue-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

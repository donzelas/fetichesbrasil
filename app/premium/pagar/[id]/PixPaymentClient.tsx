"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Clock, Copy, Loader2, QrCode, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string | null;
  amount_cents: number;
  expires_at: string;
  plan_title: string;
  duration_days: number;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const POLL_INTERVAL_MS = 4000;
const STORAGE_KEY_PREFIX = "fb_pix_";

export function PixPaymentClient({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PixData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [copied, setCopied] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${paymentId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PixData;
        setData(parsed);
      } catch {
        setLoadError("Dados do pagamento corrompidos. Volte e gere um novo PIX.");
      }
    } else {
      setLoadError("Sessão expirada. Volte e gere um novo PIX.");
    }
  }, [paymentId]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/pix/status/${paymentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.is_paid) {
        setStatus("paid");
        sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${paymentId}`);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setTimeout(() => {
          router.push(`/premium/sucesso?payment_id=${paymentId}&status=approved`);
        }, 1200);
      } else if (json.is_failed) {
        setStatus("failed");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    } catch {
      // silencioso — tenta de novo no proximo poll
    }
  }, [paymentId, router]);

  useEffect(() => {
    if (!data) return;
    checkStatus();
    pollTimerRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [data, checkStatus]);

  useEffect(() => {
    if (!data) return;
    const target = new Date(data.expires_at).getTime();
    const tick = () => setRemainingMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  const expired = remainingMs <= 0 && data !== null && status === "pending";

  async function copyCode() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.qr_code);
      setCopied(true);
      toast.success("Código PIX copiado");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar — selecione e copie manualmente.");
    }
  }

  if (loadError) {
    return (
      <div className="container max-w-md py-16">
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="text-sm">{loadError}</p>
            <Button asChild variant="premium">
              <Link href="/premium">Voltar para Premium</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-md py-16">
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="container max-w-md py-16">
        <Card className="border-emerald-500/30">
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-xl font-bold">Pagamento aprovado!</h1>
            <p className="text-sm text-muted-foreground">
              Estamos liberando seu acesso Premium agora…
            </p>
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed" || expired) {
    return (
      <div className="container max-w-md py-16">
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold">
              {expired ? "Tempo expirado" : "Pagamento não aprovado"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {expired
                ? "O QR Code expirou. Gere um novo para continuar."
                : "O Mercado Pago não aprovou este PIX. Tente novamente."}
            </p>
            <Button asChild variant="premium">
              <Link href="/premium">
                <RefreshCw className="h-4 w-4" />
                Gerar novo PIX
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-8">
      <Card className="border-premium/30 shadow-xl shadow-premium/5">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-3 inline-flex items-center justify-center gap-2 rounded-full bg-premium/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-premium">
              <QrCode className="h-3.5 w-3.5" />
              Pagamento via PIX
            </div>
            <h1 className="text-xl font-bold">{data.plan_title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.duration_days} dia{data.duration_days === 1 ? "" : "s"} de Premium
            </p>
            <p className="mt-3 text-3xl font-bold">{formatBRL(data.amount_cents)}</p>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Expira em <span className="font-bold tabular-nums">{formatRemaining(remainingMs)}</span>
          </div>

          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-3 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${data.qr_code_base64}`}
                alt="QR Code PIX"
                className="h-56 w-56"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-center text-sm font-medium">
              Escaneie com o app do seu banco
            </p>
            <p className="text-center text-xs text-muted-foreground">ou copie o código PIX abaixo</p>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="break-all font-mono text-[11px] text-foreground/90">
                {data.qr_code}
              </p>
            </div>

            <Button
              variant="premium"
              size="lg"
              className="w-full"
              onClick={copyCode}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar código PIX
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguardando pagamento…
          </div>

          {data.ticket_url && (
            <p className="text-center text-[11px] text-muted-foreground">
              Problema?{" "}
              <a
                href={data.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-premium hover:underline"
              >
                Abrir comprovante no Mercado Pago
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/premium" className="hover:underline">
          ← Cancelar e voltar
        </Link>
      </p>
    </div>
  );
}

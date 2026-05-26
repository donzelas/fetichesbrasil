"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Crown, LogOut, MessageCircleOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";

/**
 * Rotas onde o modal de trial expirado deve bloquear:
 * - /salas e subrotas (lista + chat)
 * - /chat (rota legada)
 *
 * NAO bloqueia: /perfil, /blog, /, /fetiches, /categorias, /premium etc.
 */
const BLOCKED_PREFIXES = ["/salas", "/chat"];

function shouldBlock(pathname: string | null): boolean {
  if (!pathname) return false;
  return BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Modal bloqueante que aparece quando o trial gratuito expira E
 * usuario esta em rota protegida (salas/chat).
 */
export function TrialExpiredModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { expired, bypass, loading } = useTrialStatus();

  if (loading || bypass || !expired) return null;
  if (!shouldBlock(pathname)) return null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-2xl">
        {/* Glow no topo */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="space-y-5 p-6 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <MessageCircleOff className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Seu trial gratuito acabou
            </h2>
            <p className="text-sm text-muted-foreground">
              Você teve <strong>1 hora grátis</strong> pra conhecer a plataforma.
              Pra continuar conversando nas salas e enviando mensagens, ative o{" "}
              <strong className="text-primary">Premium</strong>.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              O Premium libera
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Mensagens ilimitadas em todas as salas</li>
              <li>• Acesso a fotos e conteúdo exclusivo</li>
              <li>• DMs privadas com qualquer pessoa</li>
              <li>• Criar suas próprias salas temáticas</li>
              <li>• Sem propagandas, sem limites</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <Button asChild size="lg" variant="gradient" className="h-14 w-full text-base">
              <Link href="/premium">
                <Crown className="h-5 w-5" />
                Continuar usando — virar Premium
              </Link>
            </Button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <LogOut className="h-3 w-3" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

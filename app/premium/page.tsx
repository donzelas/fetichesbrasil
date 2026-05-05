import { Crown, Check, Sparkles, MessageCircle, Image as ImageIcon, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComingSoonButton } from "./coming-soon-button";

export const metadata = {
  title: "Premium",
};

const benefits = [
  {
    icon: MessageCircle,
    title: "Acesso a TODAS as salas",
    description: "Entre em qualquer chat exclusivo, sem limites.",
  },
  {
    icon: ImageIcon,
    title: "Imagens nas conversas",
    description: "Envie e receba fotos sem restrições.",
  },
  {
    icon: Plus,
    title: "Crie sua própria sala",
    description: "Tenha sua sala exclusiva para sua comunidade.",
  },
  {
    icon: Lock,
    title: "Conteúdo privado",
    description: "Veja perfis completos e mensagens diretas.",
  },
  {
    icon: Sparkles,
    title: "Selo Premium no perfil",
    description: "Destaque-se na comunidade.",
  },
  {
    icon: Crown,
    title: "Sem anúncios",
    description: "Experiência limpa e sem distrações.",
  },
];

export default function PremiumPage() {
  return (
    <div className="container max-w-5xl py-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-premium animate-pulse-glow">
          <Crown className="h-8 w-8 text-premium-foreground" />
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Desbloqueie tudo com{" "}
          <span className="bg-gradient-to-r from-premium to-yellow-400 bg-clip-text text-transparent">
            Fetiches Brasil Premium
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Acesse salas exclusivas, troque imagens, crie sua sala e conecte-se com pessoas que
          compartilham seus desejos.
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-md border-premium/30 shadow-2xl shadow-premium/10">
        <CardContent className="p-8 text-center">
          <p className="text-sm uppercase tracking-wider text-premium font-bold">Plano Premium</p>
          <div className="mt-3 flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold">R$ —</span>
            <span className="text-muted-foreground">/mês</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cancele quando quiser. Sem fidelidade.
          </p>

          <ComingSoonButton />

          <p className="mt-3 text-xs text-muted-foreground">
            Pagamento seguro · Stripe (em breve)
          </p>
        </CardContent>
      </Card>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="rounded-2xl border border-border/50 bg-card/60 p-6 transition-all hover:border-premium/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-premium/10">
              <b.icon className="h-5 w-5 text-premium" />
            </div>
            <h3 className="font-semibold">{b.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border/50 bg-card/40 p-6">
        <h3 className="mb-4 font-semibold">Comparativo</h3>
        <div className="grid gap-3">
          {[
            { feature: "Visualizar lista de salas", free: true, premium: true },
            { feature: "Visualizar nome das salas", free: true, premium: true },
            { feature: "Ver mensagens nas salas", free: false, premium: true },
            { feature: "Enviar mensagens", free: false, premium: true },
            { feature: "Trocar imagens", free: false, premium: true },
            { feature: "Criar sua própria sala", free: false, premium: true },
            { feature: "Ver usuários online", free: false, premium: true },
          ].map((row) => (
            <div
              key={row.feature}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 px-4 py-3 text-sm"
            >
              <span>{row.feature}</span>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1 text-muted-foreground">
                  Free {row.free ? <Check className="h-4 w-4 text-green-500" /> : <span className="text-destructive">—</span>}
                </span>
                <span className="flex items-center gap-1 font-semibold text-premium">
                  Premium {row.premium ? <Check className="h-4 w-4" /> : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

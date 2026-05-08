import Link from "next/link";
import { Crown, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pagamento confirmado",
};

export default async function PremiumSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <div className="container max-w-xl py-16">
      <Card className="border-premium/30 shadow-2xl shadow-premium/10">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full gradient-premium animate-pulse-glow">
            <Crown className="h-8 w-8 text-premium-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagamento recebido!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos liberando seu acesso Premium agora.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-left text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Pagamento processado pelo Stripe
            </p>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              A confirmação pode levar alguns segundos. Recarregue se o selo Premium
              ainda não apareceu no seu perfil.
            </p>
            {session_id && (
              <p className="mt-2 break-all text-[11px] text-muted-foreground/70">
                Sessão: {session_id}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="premium">
              <Link href="/chat">Explorar agora</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/perfil">Meu perfil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

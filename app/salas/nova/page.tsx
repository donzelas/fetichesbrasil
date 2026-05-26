import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown } from "lucide-react";
import { createClient, getViewerOrRedirectAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRoomForm } from "./form";

export default async function NewRoomPage() {
  await getViewerOrRedirectAdmin("/salas/nova");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/salas/nova");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, last_room_created_at, trial_started_at")
    .eq("id", user.id)
    .single();

  const trialStartedAt = (profile as { trial_started_at: string | null } | null)
    ?.trial_started_at;
  const isInTrial = trialStartedAt
    ? new Date(trialStartedAt).getTime() + 3600 * 1000 > Date.now()
    : false;

  if (!profile?.is_premium && !isInTrial) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <Crown className="mx-auto h-12 w-12 text-premium" />
            <CardTitle>Recurso Premium</CardTitle>
            <CardDescription>
              Seu trial gratuito acabou. Vire Premium pra criar suas próprias salas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" variant="premium" className="w-full">
              <Link href="/premium">
                <Crown className="h-5 w-5" />
                Quero ser Premium
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("id, name")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <CardTitle>Você já tem uma sala ativa</CardTitle>
            <CardDescription>
              Cada usuário pode manter apenas uma sala por vez. Delete a sala atual para criar uma
              nova.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link href={`/salas/${existing.id}`}>Acessar &quot;{existing.name}&quot;</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/perfil">Gerenciar minha sala</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.last_room_created_at) {
    const last = new Date(profile.last_room_created_at);
    const next = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (next > new Date()) {
      return (
        <div className="container py-12">
          <Card className="mx-auto max-w-md text-center">
            <CardHeader>
              <CardTitle>Aguarde um pouco</CardTitle>
              <CardDescription>
                Você só pode criar uma sala a cada 30 dias.
                <br />
                Próxima disponível em {next.toLocaleDateString("pt-BR")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/salas">Explorar outras salas</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold tracking-tight">Criar nova sala</h1>
      <p className="mt-2 text-muted-foreground">
        Sua sala ficará disponível imediatamente para outros usuários.
      </p>

      {isInTrial && !profile.is_premium && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">
            Atenção: você está no trial gratuito
          </p>
          <p className="mt-1 text-sm text-amber-100/80">
            Sua sala ficará pública imediatamente, mas será{" "}
            <strong>ocultada automaticamente</strong> quando seu trial expirar.
            Vire <Link href="/premium" className="underline">Premium</Link> pra
            mantê-la ativa pra sempre — toda a conversa fica salva e volta
            intacta se você renovar.
          </p>
        </div>
      )}

      <Card className="mt-6">
        <CardContent className="pt-6">
          <CreateRoomForm ownerId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}

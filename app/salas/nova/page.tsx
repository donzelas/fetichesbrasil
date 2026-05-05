import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRoomForm } from "./form";

export default async function NewRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/salas/nova");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, last_room_created_at")
    .eq("id", user.id)
    .single();

  if (!profile?.is_premium) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <Crown className="mx-auto h-12 w-12 text-premium" />
            <CardTitle>Recurso Premium</CardTitle>
            <CardDescription>
              Apenas usuários Premium podem criar suas próprias salas.
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

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, emoji, fetishes(id, name)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "fetishes", ascending: true });

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold tracking-tight">Criar nova sala</h1>
      <p className="mt-2 text-muted-foreground">
        Sua sala ficará disponível imediatamente para outros usuários Premium.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <CreateRoomForm
            ownerId={user.id}
            categories={(cats ?? []) as never}
          />
        </CardContent>
      </Card>
    </div>
  );
}

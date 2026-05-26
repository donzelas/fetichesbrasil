import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Crown, EyeOff, Plus } from "lucide-react";
import { createClient, getViewerOrRedirectAdmin } from "@/lib/supabase/server";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteRoomButton } from "./delete-room-button";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  await getViewerOrRedirectAdmin("/perfil");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/perfil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: ownRoom } = await supabase
    .from("chat_rooms")
    .select("id, name, description, active_users_count, is_premium_only, is_featured, created_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  const trialStartedAt = (profile as { trial_started_at: string | null })
    .trial_started_at;
  const isInTrial = trialStartedAt
    ? new Date(trialStartedAt).getTime() + 3600 * 1000 > Date.now()
    : false;
  const ownerActive =
    !!profile.is_premium || !!profile.is_admin || isInTrial;
  const roomIsHidden = !!ownRoom && !ownerActive;

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-8 sm:flex-row sm:items-start">
          {profile.avatar_url && (
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} />
            </Avatar>
          )}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
              {profile.is_premium && (
                <Badge variant="premium">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              )}
              {profile.is_admin && <Badge variant="secondary">Admin</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
          </div>
        </CardContent>
      </Card>

      {roomIsHidden && ownRoom && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-amber-200">
                Sua sala &quot;{ownRoom.name}&quot; está oculta
              </p>
              <p className="text-sm text-amber-100/80">
                Como seu Premium venceu (ou o trial acabou), sua sala não
                aparece mais na listagem pública e ninguém consegue entrar.
                Toda a conversa fica <strong>preservada</strong> — assim que
                você renovar, a sala volta intacta com todo o histórico.
              </p>
              <p className="text-xs text-amber-100/60">
                Após 30 dias sem renovar, a sala e o histórico serão apagados
                definitivamente.
              </p>
              <Button asChild variant="premium" size="sm" className="mt-1">
                <Link href="/premium">
                  <Crown className="h-4 w-4" />
                  Renovar Premium agora
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Minha sala</CardTitle>
        </CardHeader>
        <CardContent>
          {ownRoom ? (
            <div className="space-y-3">
              <div
                className={`rounded-lg border p-4 ${
                  roomIsHidden
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border/50 bg-background/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/salas/${ownRoom.id}`} className="font-semibold hover:text-primary">
                    {ownRoom.name}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {roomIsHidden && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                        <EyeOff className="mr-1 h-3 w-3" />
                        Oculta
                      </Badge>
                    )}
                    {ownRoom.is_featured && <Badge variant="featured">Destaque</Badge>}
                  </div>
                </div>
                {ownRoom.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{ownRoom.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {ownRoom.active_users_count} online · Criada em{" "}
                  {new Date(ownRoom.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/salas/${ownRoom.id}`}>Acessar</Link>
                </Button>
                <DeleteRoomButton roomId={ownRoom.id} />
              </div>
              <p className="text-xs text-muted-foreground">
                Você pode criar uma nova sala 30 dias após a deleção desta.
              </p>
            </div>
          ) : ownerActive ? (
            <div className="text-center">
              <p className="text-muted-foreground">Você ainda não tem uma sala.</p>
              <Button asChild variant="gradient" className="mt-3">
                <Link href="/salas/nova">
                  <Plus className="h-4 w-4" />
                  Criar minha sala
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-premium/30 bg-premium/5 p-4 text-center">
              <Crown className="mx-auto mb-2 h-8 w-8 text-premium" />
              <p className="text-sm">
                Vire Premium pra criar suas próprias salas.
              </p>
              <Button asChild variant="premium" className="mt-3">
                <Link href="/premium">Virar Premium</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

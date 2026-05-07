import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { OnlineUsers } from "@/components/chat/OnlineUsers";
import { DmInbox } from "@/components/chat/DmInbox";
import { LeaveRoomButton } from "@/components/chat/LeaveRoomButton";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: room } = await supabase
    .from("chat_rooms")
    .select(
      "id, name, description, owner_id, is_premium_only, unlock_message, fetish:fetishes(name, slug, category:categories(name, emoji))"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!room) notFound();

  if (!user) {
    redirect(`/login?redirect=/salas/${id}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_premium, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isOwner = room.owner_id === user.id;
  const isAdmin = !!profile.is_admin;

  if (room.is_premium_only && !profile.is_premium && !isOwner && !isAdmin) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-premium/30 bg-card p-8 text-center">
          <Crown className="mx-auto mb-3 h-12 w-12 text-premium" />
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="mt-3 text-muted-foreground">{room.unlock_message}</p>
          <Button asChild size="lg" variant="premium" className="mt-6 w-full">
            <Link href="/premium">
              <Crown className="h-5 w-5" />
              Quero ser Premium
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { data: latestMessages } = await supabase
    .from("messages")
    .select("*, user:profiles(id, username, display_name, avatar_url)")
    .eq("room_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  const messages = (latestMessages ?? []).slice().reverse();

  const fetish = room.fetish as unknown as
    | { name: string; category: { name: string; emoji: string | null } | null }
    | null;

  const backHref = isAdmin ? "/admin/salas" : "/";

  return (
    <div className="container flex h-[calc(100vh-4rem)] flex-col px-2 py-2 sm:px-4 sm:py-4">
      <LeaveRoomButton
        redirectTo={backHref}
        ariaLabel="Voltar"
        className="mb-2 hidden w-fit items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:mb-3 sm:inline-flex"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </LeaveRoomButton>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-card/60 px-3 py-2 sm:p-4">
          <LeaveRoomButton
            redirectTo={backHref}
            ariaLabel="Voltar"
            className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </LeaveRoomButton>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">{room.name}</h1>
              {fetish && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {fetish.name}
                </Badge>
              )}
            </div>
            {room.description && (
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                {room.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <DmInbox currentUserId={user.id} isAdmin={isAdmin} roomId={room.id} />
            <OnlineUsers
              roomId={room.id}
              invisible={isAdmin}
              isAdmin={isAdmin}
              user={{
                id: profile.id,
                username: profile.username ?? "user",
                display_name: profile.display_name ?? profile.username ?? "user",
                avatar_url: profile.avatar_url,
              }}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <MessageList
            roomId={room.id}
            currentUserId={user.id}
            initialMessages={messages as never}
            isAdminView={isAdmin}
          />
          <MessageInput roomId={room.id} userId={user.id} />
        </div>
      </div>
    </div>
  );
}

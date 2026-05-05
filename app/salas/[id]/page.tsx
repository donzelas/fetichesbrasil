import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { PresenceList } from "@/components/chat/PresenceList";
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
    .select("id, username, display_name, avatar_url, is_premium")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isOwner = room.owner_id === user.id;

  if (room.is_premium_only && !profile.is_premium && !isOwner) {
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

  const { data: messages } = await supabase
    .from("messages")
    .select("*, user:profiles(id, username, display_name, avatar_url)")
    .eq("room_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  const fetish = room.fetish as unknown as
    | { name: string; category: { name: string; emoji: string | null } | null }
    | null;

  return (
    <div className="container py-4">
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/salas">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 bg-card/60 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{room.name}</h1>
              {fetish && <Badge variant="outline">{fetish.name}</Badge>}
            </div>
            {room.description && (
              <p className="truncate text-sm text-muted-foreground">{room.description}</p>
            )}
          </div>
          <LeaveRoomButton />
        </div>

        <div className="flex h-[calc(100vh-16rem)] flex-col lg:flex-row">
          <div className="flex flex-1 flex-col">
            <MessageList
              roomId={room.id}
              currentUserId={user.id}
              initialMessages={(messages ?? []) as never}
            />
            <MessageInput roomId={room.id} userId={user.id} />
          </div>

          <PresenceList
            roomId={room.id}
            user={{
              id: profile.id,
              username: profile.username ?? "user",
              display_name: profile.display_name ?? profile.username ?? "user",
              avatar_url: profile.avatar_url,
            }}
          />
        </div>
      </div>
    </div>
  );
}

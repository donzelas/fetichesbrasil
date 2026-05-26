"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Flame, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { UnlockModal } from "./UnlockModal";
import { SwitchRoomModal } from "./SwitchRoomModal";
import type { ChatRoom } from "@/types/database";

interface RoomCardProps {
  room: Pick<
    ChatRoom,
    | "id"
    | "name"
    | "description"
    | "is_premium_only"
    | "is_featured"
    | "active_users_count"
    | "unlock_message"
  > & {
    fetish?: { name: string; category?: { name: string; emoji: string | null } | null } | null;
  };
  variant?: "default" | "featured" | "compact";
  showRank?: number;
  /** Estado inicial vindo do servidor para evitar flash de bloqueio durante hidratação */
  initialViewer?: { isPremium: boolean; isAuthenticated: boolean; isInTrial?: boolean };
}

export function RoomCard({ room, variant = "default", showRank, initialViewer }: RoomCardProps) {
  const router = useRouter();
  const { isPremium: clientIsPremium, profile, isAuthenticated: clientIsAuth, loading } = useUser();
  const { active: trialActive, bypass: trialBypass } = useTrialStatus();

  const isPremium = loading && initialViewer ? initialViewer.isPremium : clientIsPremium;
  const isAuthenticated = loading && initialViewer ? initialViewer.isAuthenticated : clientIsAuth;
  // Trial libera mesmo acesso de premium durante a 1h.
  // Durante hydration usa o valor server-side pra evitar flash de bloqueio.
  const trialUnlock =
    loading && initialViewer ? !!initialViewer.isInTrial : trialActive && !trialBypass;
  const hasAccess = isPremium || trialUnlock;
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [joining, setJoining] = useState(false);

  const isLocked = room.is_premium_only && !hasAccess;

  async function enterRoom() {
    setJoining(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("join_room", { p_room_id: room.id });
    setJoining(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    router.push(`/salas/${room.id}`);
    router.refresh();
  }

  async function onClick() {
    if (isLocked) {
      setUnlockOpen(true);
      return;
    }
    if (!isAuthenticated) {
      router.push(`/login?redirect=/salas/${room.id}`);
      return;
    }

    if (profile?.current_room_id && profile.current_room_id !== room.id) {
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_rooms")
        .select("name")
        .eq("id", profile.current_room_id)
        .single();
      setCurrentRoomName(data?.name ?? "outra sala");
      setSwitchOpen(true);
      return;
    }

    await enterRoom();
  }

  return (
    <>
      <Card
        onClick={onClick}
        className={cn(
          "group relative cursor-pointer overflow-hidden border-border/50 transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10",
          variant === "featured" && "border-primary/30",
          variant === "compact" && "h-full"
        )}
      >
        {showRank !== undefined && (
          <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-xs font-bold backdrop-blur">
            {showRank}
          </div>
        )}

        {room.is_featured && (
          <div className="absolute right-3 top-3 z-10">
            <Badge variant="featured">
              <Flame className="mr-1 h-3 w-3" /> Destaque
            </Badge>
          </div>
        )}

        <CardContent className={cn("p-5", variant === "compact" && "p-4")}>
          <div
            className={cn(
              "transition-all duration-300",
              isLocked && "blur-[2px] opacity-80 group-hover:blur-[1px]"
            )}
          >
            {room.fetish?.category && (
              <p className="mb-1 text-xs text-muted-foreground">
                {room.fetish.category.emoji} {room.fetish.category.name}
              </p>
            )}
            <h3 className={cn("font-semibold leading-tight", variant === "featured" ? "text-lg" : "text-base")}>
              {room.name}
            </h3>
            {room.description && variant !== "compact" && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              {room.fetish && (
                <Badge variant="outline" className="truncate max-w-[60%]">
                  {room.fetish.name}
                </Badge>
              )}
              {hasAccess ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {room.active_users_count}
                </span>
              ) : (
                room.is_premium_only && (
                  <Badge variant="premium">
                    <Crown className="mr-1 h-3 w-3" />
                    Premium
                  </Badge>
                )
              )}
            </div>
          </div>

          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-background/95 via-background/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <Lock className="h-8 w-8 text-premium" />
              <p className="text-xs font-semibold uppercase tracking-wider text-premium">
                Conteúdo Premium
              </p>
            </div>
          )}

          {isLocked && (
            <div className="pointer-events-none absolute right-3 bottom-3 opacity-60">
              <Lock className="h-4 w-4" />
            </div>
          )}
        </CardContent>
      </Card>

      <UnlockModal
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        roomName={room.name}
        unlockMessage={room.unlock_message}
        isAuthenticated={isAuthenticated}
      />

      <SwitchRoomModal
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        currentRoomName={currentRoomName}
        newRoomName={room.name}
        loading={joining}
        onConfirm={enterRoom}
      />
    </>
  );
}

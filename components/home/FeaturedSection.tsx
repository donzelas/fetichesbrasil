import { Flame } from "lucide-react";
import { RoomCard } from "@/components/rooms/RoomCard";
import type { ChatRoom } from "@/types/database";

type RoomForCard = Pick<
  ChatRoom,
  "id" | "name" | "description" | "is_premium_only" | "is_featured" | "active_users_count" | "unlock_message"
> & {
  fetish?: { name: string; category?: { name: string; emoji: string | null } | null } | null;
};

export function FeaturedSection({ rooms }: { rooms: RoomForCard[] }) {
  if (rooms.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flame className="h-6 w-6 text-primary" />
            Salas em destaque
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecionadas a dedo para você explorar
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} variant="featured" />
        ))}
      </div>
    </section>
  );
}

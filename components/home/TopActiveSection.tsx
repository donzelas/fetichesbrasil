import { Trophy } from "lucide-react";
import { RoomCard } from "@/components/rooms/RoomCard";
import type { ChatRoom } from "@/types/database";

type RoomForCard = Pick<
  ChatRoom,
  "id" | "name" | "description" | "is_premium_only" | "is_featured" | "active_users_count" | "unlock_message"
> & {
  fetish?: { name: string; category?: { name: string; emoji: string | null } | null } | null;
};

interface TopActiveSectionProps {
  rooms: RoomForCard[];
  initialViewer?: { isPremium: boolean; isAuthenticated: boolean };
}

export function TopActiveSection({ rooms, initialViewer }: TopActiveSectionProps) {
  if (rooms.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="h-6 w-6 text-premium" />
            Top 15 mais acessadas agora
          </h2>
          <p className="text-sm text-muted-foreground">
            As salas com mais gente conectada neste momento
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            variant="compact"
            showRank={idx + 1}
            initialViewer={initialViewer}
          />
        ))}
      </div>
    </section>
  );
}

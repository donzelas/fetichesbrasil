import { Trophy, type LucideIcon } from "lucide-react";
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
  initialViewer?: { isPremium: boolean; isAuthenticated: boolean; isInTrial?: boolean };
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  showRank?: boolean;
}

export function TopActiveSection({
  rooms,
  initialViewer,
  title = "Top fetiches em alta",
  subtitle = "Salas mais acessadas das categorias em destaque",
  icon: Icon = Trophy,
  iconClassName = "h-6 w-6 text-premium",
  showRank = false,
}: TopActiveSectionProps) {
  if (rooms.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Icon className={iconClassName} />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            variant="compact"
            showRank={showRank ? idx + 1 : undefined}
            initialViewer={initialViewer}
          />
        ))}
      </div>
    </section>
  );
}

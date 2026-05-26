"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ExternalLink, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRoomPresenceCount } from "@/hooks/useRoomPresenceCount";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminRoom {
  id: string;
  name: string;
  is_featured: boolean;
  is_premium_only: boolean;
  active_users_count: number;
  created_at: string;
  deleted_at: string | null;
  owner: { username: string | null; display_name: string | null } | null;
  ownerInactive?: boolean;
}

export function AdminRoomRow({ room }: { room: AdminRoom }) {
  const router = useRouter();
  const [featured, setFeatured] = useState(room.is_featured);
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const liveCount = useRoomPresenceCount(room.id, !room.deleted_at);

  async function toggleFeatured(value: boolean) {
    setFeatured(value);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("chat_rooms")
        .update({ is_featured: value })
        .eq("id", room.id);
      if (error) {
        toast.error("Erro", { description: error.message });
        setFeatured(!value);
        return;
      }
      toast.success(value ? "Marcada como destaque" : "Removida do destaque");
      router.refresh();
    });
  }

  async function softDelete() {
    if (!confirm(`Deletar a sala "${room.name}"?`)) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("soft_delete_room", { p_room_id: room.id });
    setDeleting(false);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success("Sala deletada");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <Link href={`/salas/${room.id}`} className="min-w-0 flex-1 group">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium group-hover:text-primary transition">
            {room.name}
          </span>
          {room.deleted_at && <Badge variant="destructive">Deletada</Badge>}
          {!room.deleted_at && room.ownerInactive && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-200">
              <EyeOff className="mr-1 h-3 w-3" />
              Oculta · dono inativo
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>@{room.owner?.username ?? "—"}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            {liveCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
            <span className={liveCount > 0 ? "font-medium text-foreground" : undefined}>
              {liveCount} online
            </span>
          </span>
          <span>·</span>
          <span>{new Date(room.created_at).toLocaleDateString("pt-BR")}</span>
        </p>
      </Link>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          Destaque
          <Switch checked={featured} onCheckedChange={toggleFeatured} disabled={pending || !!room.deleted_at} />
        </label>
        <Button asChild variant="ghost" size="icon">
          <Link href={`/salas/${room.id}`} target="_blank">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        {!room.deleted_at && (
          <Button variant="ghost" size="icon" onClick={softDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
          </Button>
        )}
      </div>
    </div>
  );
}

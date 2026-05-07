"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  is_admin: boolean;
  premium_since: string | null;
  created_at: string;
}

export function AdminUserRow({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [premium, setPremium] = useState(user.is_premium);
  const [pending, start] = useTransition();
  const initials = (user.display_name ?? user.username ?? "?").charAt(0).toUpperCase();

  function togglePremium(v: boolean) {
    setPremium(v);
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_premium: v }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error("Erro", { description: j.error ?? res.statusText });
        setPremium(!v);
        return;
      }
      toast.success("Atualizado");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-9 w-9">
          {user.avatar_url && <AvatarImage src={user.avatar_url} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{user.display_name ?? user.username}</p>
            {user.is_premium && (
              <Badge variant="premium">
                <Crown className="mr-1 h-3 w-3" /> Premium
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-2">
          Premium
          <Switch checked={premium} onCheckedChange={togglePremium} disabled={pending} />
        </label>
      </div>
    </div>
  );
}

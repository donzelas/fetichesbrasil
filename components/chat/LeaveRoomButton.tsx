"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface LeaveRoomButtonProps {
  redirectTo?: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function LeaveRoomButton({
  redirectTo = "/",
  children,
  className,
  ariaLabel,
}: LeaveRoomButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function leave() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("leave_current_room");
    if (error) {
      setLoading(false);
      toast.error("Erro ao sair", { description: error.message });
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={leave}
      disabled={loading}
      className={className}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {children}
    </button>
  );
}

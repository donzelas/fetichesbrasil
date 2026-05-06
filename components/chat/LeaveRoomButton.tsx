"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface LeaveRoomButtonProps {
  redirectTo?: string;
}

export function LeaveRoomButton({ redirectTo = "/" }: LeaveRoomButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function leave() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("leave_current_room");
    setLoading(false);
    if (error) {
      toast.error("Erro ao sair", { description: error.message });
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button onClick={leave} variant="outline" size="sm" disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Sair da sala
    </Button>
  );
}

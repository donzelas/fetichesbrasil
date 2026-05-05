"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  roomId: string;
  userId: string;
}

export function MessageInput({ roomId, userId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, user_id: userId, content: text });
    setSending(false);
    if (error) {
      toast.error("Falha ao enviar", { description: error.message });
      return;
    }
    setContent("");
  }

  return (
    <form onSubmit={send} className="flex gap-2 border-t border-border/50 bg-card/60 p-3">
      <Input
        placeholder="Digite uma mensagem..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        disabled={sending}
        autoFocus
      />
      <Button type="submit" size="icon" disabled={sending || !content.trim()}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}

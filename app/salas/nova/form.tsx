"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateRoomFormProps {
  ownerId: string;
}

export function CreateRoomForm({ ownerId }: CreateRoomFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_rooms")
      .insert({
        owner_id: ownerId,
        fetish_id: null,
        name: name.trim(),
        description: description.trim() || null,
        is_premium_only: true,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast.error("Falha ao criar sala", { description: error.message });
      return;
    }
    toast.success("Sala criada com sucesso!");
    router.push(`/salas/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da sala *</Label>
        <Input
          id="name"
          required
          minLength={3}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Tarde quente em casal"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          maxLength={280}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que rola por aqui..."
        />
      </div>

      <Button type="submit" size="lg" variant="gradient" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Criar sala
      </Button>
    </form>
  );
}

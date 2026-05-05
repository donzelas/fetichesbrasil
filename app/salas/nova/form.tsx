"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Category = {
  id: string;
  name: string;
  emoji: string | null;
  fetishes: { id: string; name: string }[];
};

interface CreateRoomFormProps {
  ownerId: string;
  categories: Category[];
}

const DEFAULT_UNLOCK =
  "🔒 Esta sala é exclusiva para usuários PREMIUM. Assine agora para acessar chats privados, imagens e salas exclusivas.";

export function CreateRoomForm({ ownerId, categories }: CreateRoomFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fetishId, setFetishId] = useState("");
  const [unlockMessage, setUnlockMessage] = useState(DEFAULT_UNLOCK);
  const [isPremiumOnly, setIsPremiumOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetishes = useMemo(
    () => categories.find((c) => c.id === categoryId)?.fetishes ?? [],
    [categoryId, categories]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_rooms")
      .insert({
        owner_id: ownerId,
        fetish_id: fetishId || null,
        name: name.trim(),
        description: description.trim() || null,
        unlock_message: unlockMessage.trim() || DEFAULT_UNLOCK,
        is_premium_only: isPremiumOnly,
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFetishId("");
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
          >
            <option value="">— Sem categoria (sala exclusiva) —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fetish">Fetiche</Label>
          <select
            id="fetish"
            value={fetishId}
            onChange={(e) => setFetishId(e.target.value)}
            disabled={!categoryId}
            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">— Selecione —</option>
            {fetishes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unlock">Mensagem de bloqueio (CTA para usuários FREE)</Label>
        <Textarea
          id="unlock"
          maxLength={280}
          value={unlockMessage}
          onChange={(e) => setUnlockMessage(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Esta mensagem aparece quando um usuário FREE clica na sua sala.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="premium">Sala exclusiva Premium</Label>
          <p className="text-xs text-muted-foreground">
            Recomendado: apenas usuários Premium podem entrar.
          </p>
        </div>
        <Switch id="premium" checked={isPremiumOnly} onCheckedChange={setIsPremiumOnly} />
      </div>

      <Button type="submit" size="lg" variant="gradient" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Criar sala
      </Button>
    </form>
  );
}

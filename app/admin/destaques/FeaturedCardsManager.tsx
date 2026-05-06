"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CardFormDialog } from "./CardFormDialog";

export interface FeaturedCardRecord {
  id: string;
  title: string;
  description: string;
  image_url: string;
  fetish_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FeaturedCardsManagerProps {
  initialCards: FeaturedCardRecord[];
}

export function FeaturedCardsManager({ initialCards }: FeaturedCardsManagerProps) {
  const [cards, setCards] = useState<FeaturedCardRecord[]>(initialCards);
  const [editing, setEditing] = useState<FeaturedCardRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("featured_fetish_cards")
      .select("*")
      .order("sort_order", { ascending: true });
    setCards((data ?? []) as FeaturedCardRecord[]);
  }

  async function toggleActive(card: FeaturedCardRecord) {
    const supabase = createClient();
    const next = !card.is_active;
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, is_active: next } : c))
    );
    const { error } = await supabase
      .from("featured_fetish_cards")
      .update({ is_active: next })
      .eq("id", card.id);
    if (error) {
      toast.error("Falha ao atualizar", { description: error.message });
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, is_active: card.is_active } : c))
      );
    }
  }

  async function handleDelete(card: FeaturedCardRecord) {
    if (!confirm(`Excluir o card "${card.title}"?`)) return;
    setDeletingId(card.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("featured_fetish_cards")
      .delete()
      .eq("id", card.id);
    setDeletingId(null);
    if (error) {
      toast.error("Falha ao excluir", { description: error.message });
      return;
    }
    toast.success("Card excluído.");
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    startTransition(() => refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {cards.length} {cards.length === 1 ? "card" : "cards"} cadastrado
          {cards.length === 1 ? "" : "s"} · {cards.filter((c) => c.is_active).length} ativo
          {cards.filter((c) => c.is_active).length === 1 ? "" : "s"}
        </p>
        <Button onClick={() => setCreating(true)} variant="gradient">
          <Plus className="h-4 w-4" />
          Novo card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 py-12 text-center text-sm text-muted-foreground">
          Nenhum card cadastrado. Crie o primeiro.
        </div>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50">
          {cards.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 bg-card/40 p-3 transition hover:bg-card/70"
            >
              <Avatar className="h-14 w-20 shrink-0 rounded-md">
                <AvatarImage src={c.image_url} className="object-cover" />
                <AvatarFallback className="rounded-md text-xs">IMG</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    #{c.sort_order}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {c.is_active ? "Ativo" : "Oculto"}
                  </span>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={() => toggleActive(c)}
                    aria-label="Alternar visibilidade"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(c)}
                  aria-label="Editar"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deletingId === c.id}
                  onClick={() => handleDelete(c)}
                  aria-label="Excluir"
                  title="Excluir"
                >
                  {deletingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CardFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          refresh();
        }}
      />
      <CardFormDialog
        open={!!editing}
        editing={editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    </div>
  );
}

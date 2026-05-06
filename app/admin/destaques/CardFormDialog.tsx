"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { FeaturedCardRecord } from "./FeaturedCardsManager";

const FALLBACK_IMAGE = "https://picsum.photos/640/320?blur=2";

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: FeaturedCardRecord | null;
  onSaved?: () => void;
}

export function CardFormDialog({
  open,
  onOpenChange,
  editing = null,
  onSaved,
}: CardFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setDescription(editing.description);
        setImageUrl(editing.image_url);
        setSortOrder(editing.sort_order);
        setIsActive(editing.is_active);
      } else {
        setTitle("");
        setDescription("");
        setImageUrl("");
        setSortOrder(0);
        setIsActive(true);
      }
    }
  }, [open, editing]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Título obrigatório.");
      return;
    }
    if (!description.trim()) {
      toast.error("Descrição obrigatória.");
      return;
    }
    if (!imageUrl.trim()) {
      toast.error("URL da imagem obrigatória.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_active: isActive,
    };

    const { error } = editing
      ? await supabase
          .from("featured_fetish_cards")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("featured_fetish_cards").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Falha ao salvar", { description: error.message });
      return;
    }
    toast.success(editing ? "Card atualizado." : "Card criado.");
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar card" : "Novo card de destaque"}</DialogTitle>
          <DialogDescription>
            Preencha os dados que vão aparecer no carrossel da home.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="card-title">Título</Label>
            <Input
              id="card-title"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Latex"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-desc">Descrição</Label>
            <Textarea
              id="card-desc"
              rows={3}
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Curta explicação sobre o fetiche..."
            />
            <p className="text-[11px] text-muted-foreground">{description.length}/600</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-img">URL da imagem</Label>
            <Input
              id="card-img"
              type="url"
              maxLength={500}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
            {imageUrl && (
              <div className="overflow-hidden rounded-md border border-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Pré-visualização"
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (t.src !== FALLBACK_IMAGE) t.src = FALLBACK_IMAGE;
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="card-order">Ordem</Label>
              <Input
                id="card-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                id="card-active"
              />
              <Label htmlFor="card-active">Ativo</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} variant="gradient">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

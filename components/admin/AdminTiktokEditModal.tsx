"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  scriptId: string;
  initial: {
    titulo: string;
    hook: string;
    corpo: string;
    cta: string;
    hashtags: string[];
    broll_tags: string[];
    voz: string;
  };
  triggerLabel?: string;
}

const VOZES = [
  { id: "pt-BR-FranciscaNeural", label: "Francisca (feminina calma)" },
  { id: "pt-BR-ThalitaNeural", label: "Thalita (feminina jovem)" },
  { id: "pt-BR-AntonioNeural", label: "Antonio (masculina grave)" },
];

export function AdminTiktokEditModal({ scriptId, initial, triggerLabel = "Editar" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: initial.titulo,
    hook: initial.hook,
    corpo: initial.corpo,
    cta: initial.cta,
    hashtags: initial.hashtags.join(" "),
    broll_tags: initial.broll_tags.join(", "),
    voz: initial.voz,
  });

  async function salvar() {
    setSaving(true);
    try {
      const supabase = createClient();
      const hashtagsArr = form.hashtags
        .split(/\s+/)
        .map((h) => h.trim())
        .filter(Boolean)
        .map((h) => (h.startsWith("#") ? h : `#${h}`));
      const brollArr = form.broll_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.rpc("update_tiktok_script", {
        p_script_id: scriptId,
        p_titulo: form.titulo,
        p_hook: form.hook,
        p_corpo: form.corpo,
        p_cta: form.cta,
        p_hashtags: hashtagsArr,
        p_broll_tags: brollArr,
        p_voz: form.voz,
        p_video_config: null,
      });
      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        return;
      }
      toast.success("Roteiro atualizado.");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar roteiro TikTok</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-titulo">Título interno</Label>
            <Input
              id="edit-titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="edit-hook">Hook (3s — primeira frase)</Label>
            <Textarea
              id="edit-hook"
              rows={2}
              value={form.hook}
              onChange={(e) => setForm({ ...form, hook: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="edit-corpo">Corpo (15-20s)</Label>
            <Textarea
              id="edit-corpo"
              rows={4}
              value={form.corpo}
              onChange={(e) => setForm({ ...form, corpo: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="edit-cta">CTA (5-7s)</Label>
            <Textarea
              id="edit-cta"
              rows={2}
              value={form.cta}
              onChange={(e) => setForm({ ...form, cta: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="edit-hashtags">Hashtags (separadas por espaço)</Label>
            <Input
              id="edit-hashtags"
              value={form.hashtags}
              onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              placeholder="#lifestyle #brasil #fyp"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Não use #18+, #nsfw, #adultcontent (bane no TikTok).
            </p>
          </div>

          <div>
            <Label htmlFor="edit-broll">B-roll tags (em inglês, separadas por vírgula)</Label>
            <Input
              id="edit-broll"
              value={form.broll_tags}
              onChange={(e) => setForm({ ...form, broll_tags: e.target.value })}
              placeholder="woman silhouette, candle light, mystery"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Inglês funciona melhor no Pexels. Evite palavras explícitas.
            </p>
          </div>

          <div>
            <Label htmlFor="edit-voz">Voz</Label>
            <select
              id="edit-voz"
              value={form.voz}
              onChange={(e) => setForm({ ...form, voz: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {VOZES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import type { TiktokSettings } from "@/types/database";

interface Props {
  initial: TiktokSettings;
}

const FONTES = ["Arial", "Impact", "Verdana", "Tahoma", "Georgia", "Times New Roman", "Trebuchet MS"];

const ALIGNMENTS = [
  { value: 1, label: "Inferior esquerda" },
  { value: 2, label: "Inferior centro (TikTok padrão)" },
  { value: 3, label: "Inferior direita" },
  { value: 5, label: "Meio centro" },
  { value: 8, label: "Topo centro" },
];

const VOZES = [
  { id: "pt-BR-FranciscaNeural", label: "Francisca (feminina calma)" },
  { id: "pt-BR-ThalitaNeural", label: "Thalita (feminina jovem)" },
  { id: "pt-BR-AntonioNeural", label: "Antonio (masculina grave)" },
];

const LLMS = [
  { id: "groq", label: "Groq (gratuito, rápido)" },
  { id: "gemini", label: "Google Gemini (fallback)" },
];

export function TiktokSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TiktokSettings>(key: K, value: TiktokSettings[K]) {
    setS({ ...s, [key]: value });
  }

  async function salvar() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_tiktok_settings", {
        p_data: {
          font_name: s.font_name,
          font_size: s.font_size,
          font_bold: s.font_bold,
          font_color: s.font_color,
          outline_color: s.outline_color,
          outline_width: s.outline_width,
          shadow: s.shadow,
          alignment: s.alignment,
          margin_v: s.margin_v,
          margin_l: s.margin_l,
          margin_r: s.margin_r,
          uppercase: s.uppercase,
          words_per_chunk: s.words_per_chunk,
          default_voz: s.default_voz,
          default_voz_rate: s.default_voz_rate,
          default_llm: s.default_llm,
          default_llm_model: s.default_llm_model,
          video_width: s.video_width,
          video_height: s.video_height,
          video_fps: s.video_fps,
          video_crf: s.video_crf,
          cron_enabled: s.cron_enabled,
        },
      });
      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        return;
      }
      toast.success("Configurações salvas. Aplicado nos próximos vídeos.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* LEGENDAS */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-lg font-semibold">Legendas (subtitles)</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fonte</Label>
              <select
                value={s.font_name}
                onChange={(e) => set("font_name", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {FONTES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Tamanho da fonte</Label>
              <Input
                type="number"
                min={10}
                max={80}
                value={s.font_size}
                onChange={(e) => set("font_size", Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Cor da fonte (hex sem #)</Label>
              <Input
                value={s.font_color}
                onChange={(e) => set("font_color", e.target.value.toUpperCase())}
                placeholder="FFFFFF"
              />
            </div>

            <div>
              <Label>Cor do contorno (hex sem #)</Label>
              <Input
                value={s.outline_color}
                onChange={(e) => set("outline_color", e.target.value.toUpperCase())}
                placeholder="000000"
              />
            </div>

            <div>
              <Label>Espessura do contorno</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={s.outline_width}
                onChange={(e) => set("outline_width", Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Sombra (0 = sem)</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={s.shadow}
                onChange={(e) => set("shadow", Number(e.target.value))}
              />
            </div>

            <div className="col-span-2">
              <Label>Posição</Label>
              <select
                value={s.alignment}
                onChange={(e) => set("alignment", Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ALIGNMENTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Margem vertical (px)</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={s.margin_v}
                onChange={(e) => set("margin_v", Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Distância da base/topo. TikTok cobre ~280px embaixo com UI.
              </p>
            </div>

            <div>
              <Label>Palavras por linha</Label>
              <Input
                type="number"
                min={2}
                max={15}
                value={s.words_per_chunk}
                onChange={(e) => set("words_per_chunk", Number(e.target.value))}
              />
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border/60 p-2">
              <div>
                <Label>Maiúsculas</Label>
                <p className="text-xs text-muted-foreground">Legendas em CAIXA ALTA estilo viral</p>
              </div>
              <Switch
                checked={s.uppercase}
                onCheckedChange={(v) => set("uppercase", v)}
              />
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border/60 p-2">
              <div>
                <Label>Negrito</Label>
              </div>
              <Switch
                checked={s.font_bold}
                onCheckedChange={(v) => set("font_bold", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VOZ E IA */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-lg font-semibold">Voz e IA</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Voz padrão (TTS)</Label>
              <select
                value={s.default_voz}
                onChange={(e) => set("default_voz", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {VOZES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Velocidade da voz</Label>
              <Input
                value={s.default_voz_rate}
                onChange={(e) => set("default_voz_rate", e.target.value)}
                placeholder="+15%"
              />
              <p className="mt-1 text-xs text-muted-foreground">Ex: +15%, +0%, -10%</p>
            </div>

            <div>
              <Label>LLM padrão</Label>
              <select
                value={s.default_llm}
                onChange={(e) => set("default_llm", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {LLMS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Modelo do LLM</Label>
              <Input
                value={s.default_llm_model}
                onChange={(e) => set("default_llm_model", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VIDEO */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-lg font-semibold">Vídeo</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Largura (px)</Label>
              <Input
                type="number"
                value={s.video_width}
                onChange={(e) => set("video_width", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Altura (px)</Label>
              <Input
                type="number"
                value={s.video_height}
                onChange={(e) => set("video_height", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>FPS</Label>
              <Input
                type="number"
                min={24}
                max={60}
                value={s.video_fps}
                onChange={(e) => set("video_fps", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Qualidade (CRF, menor = melhor)</Label>
              <Input
                type="number"
                min={18}
                max={28}
                value={s.video_crf}
                onChange={(e) => set("video_crf", Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CRON */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-lg font-semibold">Automação</h2>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label>Cron automático ativo</Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, n8n dispara geração automática nos horários configurados.
              </p>
            </div>
            <Switch
              checked={s.cron_enabled}
              onCheckedChange={(v) => set("cron_enabled", v)}
            />
          </div>

          <div>
            <Label>Horários cron (formato: 9,21 — só leitura aqui, ajuste no n8n)</Label>
            <Input value={s.cron_hours.join(",")} disabled />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={salvar} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}

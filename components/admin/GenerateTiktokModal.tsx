"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dice5, Loader2, Sparkles, Wand2 } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";

type Mode = "sortear" | "fetiche" | "tema";

interface FetishOption {
  id: string;
  name: string;
  category_name: string | null;
  category_emoji: string | null;
  used_in_tiktok_at: string | null;
}

export function GenerateTiktokModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("sortear");
  const [fetishes, setFetishes] = useState<FetishOption[]>([]);
  const [fetichaId, setFetichaId] = useState<string>("");
  const [tema, setTema] = useState("");
  const [categoria, setCategoria] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingFetishes, setLoadingFetishes] = useState(false);

  useEffect(() => {
    if (!open || fetishes.length > 0) return;
    setLoadingFetishes(true);
    const supabase = createClient();
    supabase
      .from("fetishes")
      .select("id, name, used_in_tiktok_at, category:categories(name, emoji)")
      .order("name")
      .then(({ data }) => {
        const mapped = (data ?? []).map((f) => {
          const cat = (f as { category: { name: string; emoji: string | null } | null }).category;
          return {
            id: f.id as string,
            name: f.name as string,
            used_in_tiktok_at: (f.used_in_tiktok_at as string | null) ?? null,
            category_name: cat?.name ?? null,
            category_emoji: cat?.emoji ?? null,
          };
        });
        setFetishes(mapped);
        setLoadingFetishes(false);
      });
  }, [open, fetishes.length]);

  async function gerar() {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = {};
      if (mode === "fetiche") {
        if (!fetichaId) {
          toast.error("Selecione um fetiche.");
          return;
        }
        body.fetiche_id = fetichaId;
      } else if (mode === "tema") {
        if (tema.trim().length < 2) {
          toast.error("Digite um tema (mínimo 2 caracteres).");
          return;
        }
        body.tema = tema.trim();
        if (categoria.trim()) body.categoria = categoria.trim();
      }

      const res = await fetch("/api/admin/tiktok/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao gerar", { description: data.error ?? "Verifique os logs" });
        return;
      }
      toast.success("Roteiro gerado pela IA.");
      setOpen(false);
      setTema("");
      setFetichaId("");
      setCategoria("");
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="h-4 w-4" />
          Gerar novo roteiro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar roteiro com IA</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <ModeCard
            active={mode === "sortear"}
            onClick={() => setMode("sortear")}
            icon={<Dice5 className="h-5 w-5" />}
            title="Sortear fetiche"
            desc="IA escolhe 1 fetiche dos 94 cadastrados que ainda não foi usado."
          />
          <ModeCard
            active={mode === "fetiche"}
            onClick={() => setMode("fetiche")}
            icon={<Sparkles className="h-5 w-5" />}
            title="Escolher fetiche"
            desc="Você seleciona um fetiche específico da lista oficial."
          />
          <ModeCard
            active={mode === "tema"}
            onClick={() => setMode("tema")}
            icon={<Wand2 className="h-5 w-5" />}
            title="Tema livre"
            desc="Digite qualquer assunto (ex: depilação, primeira vez, swing)."
          />
        </div>

        {mode === "fetiche" && (
          <div className="space-y-2">
            <Label>Fetiche</Label>
            {loadingFetishes ? (
              <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <select
                value={fetichaId}
                onChange={(e) => setFetichaId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— selecione —</option>
                {fetishes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.category_emoji ?? ""} {f.name}
                    {f.used_in_tiktok_at ? " (já usado)" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted-foreground">
              Você pode escolher mesmo que já tenha sido usado. Categoria vai junto.
            </p>
          </div>
        )}

        {mode === "tema" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="tema">Tema</Label>
              <Input
                id="tema"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="ex: depilação, primeira vez, swing, ménage..."
                maxLength={80}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="categoria">Categoria (opcional)</Label>
              <Input
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="ex: Tabu, BDSM, Sensações, Dinâmica"
                maxLength={50}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ajuda a IA a calibrar o tom. Pode deixar vazio.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={gerar} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
        active
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 rounded-md p-1.5",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", active && "text-primary")}>{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

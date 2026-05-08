"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import type { PlanRecord } from "./PlansManager";

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: PlanRecord | null;
  onSaved?: () => void;
}

export function PlanFormDialog({
  open,
  onOpenChange,
  editing = null,
  onSaved,
}: PlanFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">(
    "credit_card"
  );
  const [durationDays, setDurationDays] = useState<number>(30);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setPriceReais((editing.price_cents / 100).toFixed(2));
      setPaymentMethod(editing.payment_method);
      setDurationDays(editing.duration_days);
      setSortOrder(editing.sort_order);
      setIsActive(editing.is_active);
    } else {
      setTitle("");
      setDescription("");
      setPriceReais("");
      setPaymentMethod("credit_card");
      setDurationDays(30);
      setSortOrder(0);
      setIsActive(true);
    }
  }, [open, editing]);

  async function handleSave() {
    if (!title.trim()) return toast.error("Título obrigatório.");
    const price = Number(priceReais.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      return toast.error("Valor inválido.");
    }
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return toast.error("Dias de duração inválidos.");
    }

    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/plans/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            price_cents: Math.round(price * 100),
            payment_method: paymentMethod,
            duration_days: durationDays,
            is_active: isActive,
            sort_order: sortOrder,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Erro ao salvar");
        }
        toast.success("Plano atualizado.");
      } else {
        const res = await fetch("/api/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            price_cents: Math.round(price * 100),
            payment_method: paymentMethod,
            duration_days: durationDays,
            is_active: isActive,
            sort_order: sortOrder,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Erro ao criar");
        }
        toast.success("Plano criado e publicado no Stripe.");
      }
      onSaved?.();
    } catch (e) {
      toast.error("Falha ao salvar", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>
            Configure título, valor, forma de pagamento e duração em dias. Ao salvar,
            o produto e o preço são publicados (ou atualizados) no Stripe automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="plan-title">Título</Label>
            <Input
              id="plan-title"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Premium 30 dias"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="plan-desc">Descrição (opcional)</Label>
            <Textarea
              id="plan-desc"
              rows={2}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que está incluído neste plano..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="plan-price">Valor (R$)</Label>
              <Input
                id="plan-price"
                type="text"
                inputMode="decimal"
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value)}
                placeholder="29,90"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="plan-method">Forma de pagamento</Label>
              <select
                id="plan-method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as "pix" | "credit_card")
                }
              >
                <option value="credit_card">Cartão (assinatura recorrente)</option>
                <option value="pix">Pix (pagamento único)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="plan-days">Duração (dias)</Label>
              <Input
                id="plan-days"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(parseInt(e.target.value || "0", 10))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {paymentMethod === "credit_card"
                  ? "Intervalo de cobrança da assinatura."
                  : "Tempo de Premium concedido após o Pix."}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="plan-order">Ordem</Label>
              <Input
                id="plan-order"
                type="number"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(parseInt(e.target.value || "0", 10))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="plan-active"
            />
            <Label htmlFor="plan-active">Ativo (aparece na página /premium)</Label>
          </div>

          {editing && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
              Mudar valor, forma de pagamento ou duração cria um novo preço no Stripe
              e desativa o anterior. Assinaturas em andamento continuam ativas até a
              próxima cobrança.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
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

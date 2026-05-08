"use client";

import { useState } from "react";
import { CreditCard, Loader2, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PlanFormDialog } from "./PlanFormDialog";

export interface PlanRecord {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  payment_method: "pix" | "credit_card";
  duration_days: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PlansManager({ initialPlans }: { initialPlans: PlanRecord[] }) {
  const [plans, setPlans] = useState<PlanRecord[]>(initialPlans);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlanRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/plans", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setPlans(json.plans as PlanRecord[]);
  }

  async function toggleActive(plan: PlanRecord) {
    const next = !plan.is_active;
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, is_active: next } : p))
    );
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      toast.error("Falha ao atualizar");
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, is_active: plan.is_active } : p))
      );
    }
  }

  async function handleDelete(plan: PlanRecord) {
    if (!confirm(`Excluir o plano "${plan.title}"?`)) return;
    setBusyId(plan.id);
    const res = await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error("Falha ao excluir", { description: json.error });
      return;
    }
    toast.success("Plano excluído.");
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {plans.length} {plans.length === 1 ? "plano" : "planos"} ·{" "}
          {plans.filter((p) => p.is_active).length} ativo
          {plans.filter((p) => p.is_active).length === 1 ? "" : "s"}
        </p>
        <Button onClick={() => setCreating(true)} variant="gradient">
          <Plus className="h-4 w-4" />
          Novo plano
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 py-12 text-center text-sm text-muted-foreground">
          Nenhum plano cadastrado. Crie o primeiro.
        </div>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50">
          {plans.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 bg-card/40 p-3 transition hover:bg-card/70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {p.payment_method === "credit_card" ? (
                  <CreditCard className="h-5 w-5" />
                ) : (
                  <QrCode className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    #{p.sort_order}
                  </span>
                  {!p.stripe_price_id && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                      sem stripe
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(p.price_cents)} ·{" "}
                  {p.payment_method === "credit_card"
                    ? `assinatura a cada ${p.duration_days} dia${
                        p.duration_days === 1 ? "" : "s"
                      }`
                    : `Pix · ${p.duration_days} dia${
                        p.duration_days === 1 ? "" : "s"
                      } de Premium`}
                </p>
                {p.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                    {p.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {p.is_active ? "Ativo" : "Oculto"}
                  </span>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={() => toggleActive(p)}
                    aria-label="Alternar visibilidade"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(p)}
                  aria-label="Editar"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busyId === p.id}
                  onClick={() => handleDelete(p)}
                  aria-label="Excluir"
                  title="Excluir"
                >
                  {busyId === p.id ? (
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

      <PlanFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          refresh();
        }}
      />
      <PlanFormDialog
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

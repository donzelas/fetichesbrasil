"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteDmThreadButtonProps {
  threadId: string;
  label: string;
}

export function DeleteDmThreadButton({ threadId, label }: DeleteDmThreadButtonProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleClick(e: React.MouseEvent) {
    // Impede que o Link wrapper navegue.
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Tem certeza que quer excluir a conversa "${label}"?\n\nIsso apaga TODAS as mensagens e imagens deste chat — irreversível.`
    );
    if (!ok) return;

    start(async () => {
      try {
        const res = await fetch(`/api/admin/dm-threads/${threadId}`, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error ?? "Erro ao excluir");
        }
        toast.success("Conversa excluída");
        router.refresh();
      } catch (err) {
        toast.error("Falha ao excluir", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      title="Excluir conversa"
      aria-label="Excluir conversa"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}

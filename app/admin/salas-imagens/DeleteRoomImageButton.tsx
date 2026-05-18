"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteRoomImageButtonProps {
  messageId: string;
  imagePath: string;
}

export function DeleteRoomImageButton({
  messageId,
  imagePath,
}: DeleteRoomImageButtonProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Excluir esta imagem em definitivo?\n\nO arquivo \`${imagePath}\` será removido do storage e a referência será apagada/limpa da mensagem. Irreversível.`
    );
    if (!ok) return;

    start(async () => {
      try {
        const res = await fetch(`/api/admin/room-images/${messageId}`, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error ?? "Erro ao excluir");
        }
        toast.success("Imagem excluída");
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white/90 transition hover:bg-destructive disabled:opacity-50"
      title="Excluir imagem"
      aria-label="Excluir imagem"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}

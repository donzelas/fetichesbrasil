"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/utils/image";
import {
  ROOM_IMAGE_BUCKET,
  ROOM_IMAGE_TTL_MS,
} from "@/components/chat/RoomImageMessage";

interface MessageInputProps {
  roomId: string;
  userId: string;
}

const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export function MessageInput({ roomId, userId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [pendingFile, setPendingFile] = useState<Blob | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("Imagem muito grande", {
        description: "Limite de 20MB no arquivo original.",
      });
      return;
    }
    setPreparing(true);
    try {
      const blob = await compressImage(file, {
        maxDimension: 1280,
        quality: 0.8,
      });
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingFile(blob);
      setPendingPreview(URL.createObjectURL(blob));
    } catch (err) {
      toast.error("Falha ao processar imagem", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPreparing(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if ((!text && !pendingFile) || sending) return;

    setSending(true);
    const supabase = createClient();

    let imagePath: string | null = null;
    let expiresAt: string | null = null;

    if (pendingFile) {
      const ext = pendingFile.type === "image/webp" ? "webp" : "jpg";
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${ext}`;
      const path = `${roomId}/${userId}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from(ROOM_IMAGE_BUCKET)
        .upload(path, pendingFile, {
          cacheControl: "60",
          upsert: false,
          contentType: pendingFile.type || "image/jpeg",
        });
      if (upErr) {
        setSending(false);
        toast.error("Falha ao enviar imagem", { description: upErr.message });
        return;
      }
      imagePath = path;
      expiresAt = new Date(Date.now() + ROOM_IMAGE_TTL_MS).toISOString();
    }

    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: userId,
      content: text || null,
      image_path: imagePath,
      expires_at: expiresAt,
    });
    setSending(false);
    if (error) {
      toast.error("Falha ao enviar", { description: error.message });
      return;
    }
    setContent("");
    clearPending();
  }

  const busy = sending || preparing;
  const canSend = (!!content.trim() || !!pendingFile) && !busy;

  return (
    <form
      onSubmit={send}
      className="flex flex-col gap-2 border-t border-border/50 bg-card/60 p-3"
    >
      {pendingPreview && (
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
          <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border/50 bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingPreview}
              alt="prévia"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Imagem pronta</p>
            <p>Auto-destruir em 15 segundos após envio.</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={clearPending}
            aria-label="Remover imagem"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-2">
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePick}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePick}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={busy || !!pendingFile}
          onClick={() => galleryRef.current?.click()}
          title="Anexar da galeria"
          aria-label="Anexar da galeria"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={busy || !!pendingFile}
          onClick={() => cameraRef.current?.click()}
          title="Tirar foto"
          aria-label="Tirar foto"
        >
          <Camera className="h-4 w-4" />
        </Button>

        <Input
          placeholder={
            pendingFile
              ? "Adicione uma legenda (opcional)..."
              : "Digite uma mensagem..."
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          disabled={busy}
          autoFocus
        />
        <Button type="submit" size="icon" disabled={!canSend}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}

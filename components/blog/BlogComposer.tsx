"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, PenSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/utils/image";
import type { CategoryWithFetishes } from "@/types/database";

const FEED_BUCKET = "feed-images";
const MAX_IMAGES = 5;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

interface BlogComposerProps {
  currentUserId: string;
  categories: CategoryWithFetishes[];
}

interface PendingImage {
  id: string;
  blob: Blob;
  previewUrl: string;
}

export function BlogComposer({ currentUserId, categories }: BlogComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fetishId, setFetishId] = useState<string>("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setTitle("");
    setContent("");
    setFetishId("");
  }

  function handleClose() {
    if (submitting) return;
    resetForm();
    setOpen(false);
  }

  const fetishOptions = useMemo(
    () =>
      categories.flatMap((c) =>
        c.fetishes.map((f) => ({ id: f.id, label: `${c.emoji ?? ""} ${c.name} · ${f.name}` }))
      ),
    [categories]
  );

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens.`);
      return;
    }
    const next: PendingImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_INPUT_BYTES) {
        toast.error(`"${file.name}" passa de 25 MB.`);
        continue;
      }
      try {
        const blob = await compressImage(file, {
          maxDimension: 1920,
          quality: 0.85,
          mimeType: "image/jpeg",
        });
        next.push({
          id: crypto.randomUUID(),
          blob,
          previewUrl: URL.createObjectURL(blob),
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "erro";
        toast.error(`Falha ao processar "${file.name}": ${message}`);
      }
    }
    setImages((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function submit() {
    const t = title.trim();
    const c = content.trim();
    if (t.length < 3) {
      toast.error("Título precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (c.length < 1) {
      toast.error("Escreva uma descrição.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const uploadedPaths: string[] = [];
    try {
      for (const img of images) {
        const path = `${currentUserId}/${crypto.randomUUID()}.jpg`;
        const file = new File([img.blob], `${path.split("/").pop()}`, { type: "image/jpeg" });
        const { error } = await supabase.storage
          .from(FEED_BUCKET)
          .upload(path, file, { contentType: "image/jpeg", upsert: false });
        if (error) {
          throw new Error(`upload: ${error.message}`);
        }
        uploadedPaths.push(path);
      }

      const { data, error } = await supabase.rpc("create_blog_post", {
        p_title: t,
        p_content: c,
        p_fetish_id: fetishId || null,
        p_image_paths: uploadedPaths,
      });

      if (error) {
        // tenta limpar imagens órfãs
        if (uploadedPaths.length) {
          await supabase.storage.from(FEED_BUCKET).remove(uploadedPaths);
        }
        toast.error("Erro ao publicar", { description: error.message });
        setSubmitting(false);
        return;
      }

      toast.success("Post enviado!", {
        description: "Está aguardando aprovação. Você verá em 'Meus posts'.",
      });

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      if (uploadedPaths.length) {
        await supabase.storage.from(FEED_BUCKET).remove(uploadedPaths);
      }
      const message = e instanceof Error ? e.message : "erro inesperado";
      toast.error("Falha ao publicar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!open ? (
          <p className="flex-1 text-xs text-muted-foreground">
            Compartilhe sua história, fantasia ou fetiche. Toda publicação passa por aprovação.
          </p>
        ) : (
          <span className="flex-1" aria-hidden />
        )}
        <Button
          type="button"
          variant={open ? "outline" : "gradient"}
          size="sm"
          onClick={() => (open ? handleClose() : setOpen(true))}
          disabled={submitting}
        >
          {open ? (
            <>
              <X className="h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <PenSquare className="h-4 w-4" />
              Postar
            </>
          )}
        </Button>
      </div>

      <div
        className={
          "grid transition-all duration-300 ease-in-out " +
          (open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
        }
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Compartilhar nova publicação</h2>

            <div className="space-y-3">
              <Input
                placeholder="Título (ex: Minha primeira experiência com bondage)"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                placeholder="Conta a sua história, fantasia ou fetiche... (1 a 6000 caracteres)"
                rows={5}
                maxLength={6000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={fetishId}
                  onChange={(e) => setFetishId(e.target.value)}
                  className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Sem categoria</option>
                  {fetishOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <span className="ml-auto text-xs text-muted-foreground">{content.length}/6000</span>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {images.map((img) => (
                    <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-border/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
                        aria-label="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_IMAGES || submitting}
                >
                  <ImagePlus className="h-4 w-4" />
                  Imagens ({images.length}/{MAX_IMAGES})
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={submitting}
                  className="ml-auto"
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting || title.trim().length < 3 || content.trim().length < 1}
                  variant="gradient"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publicar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Toda publicação passa por aprovação antes de aparecer pra comunidade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

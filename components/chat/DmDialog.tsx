"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Send, Timer, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { formatTime } from "@/lib/utils/format";
import { compressImage, formatRemaining } from "@/lib/utils/image";
import { notifyUser } from "@/lib/realtime/notify";
import { AddDmParticipantDialog } from "./AddDmParticipantDialog";

const DM_IMAGE_TTL_MS = 5 * 60 * 1000;
const DM_IMAGE_BUCKET = "dm-images";
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

interface OtherUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ParticipantProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DmMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  read_at: string | null;
  image_path: string | null;
  expires_at: string | null;
}

interface DmDialogProps {
  threadId: string;
  otherUser: OtherUser;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  /** Sala em que o usuário está, para listar candidatos a adicionar via presença. */
  roomId?: string;
}

export function DmDialog({
  threadId,
  otherUser,
  currentUserId,
  open,
  onOpenChange,
  isAdmin = false,
  roomId,
}: DmDialogProps) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState<Blob | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [participants, setParticipants] = useState<ParticipantProfile[]>(() => [
    {
      id: otherUser.user_id,
      username: otherUser.username,
      display_name: otherUser.display_name,
      avatar_url: otherUser.avatar_url,
    },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [, forceTick] = useState(0);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const didMountScrollRef = useRef(false);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const otherParticipants = useMemo(
    () => participants.filter((p) => p.id !== currentUserId),
    [participants, currentUserId]
  );

  const headerTitle = useMemo(() => {
    if (otherParticipants.length === 0) return "Conversa";
    if (otherParticipants.length === 1) {
      const o = otherParticipants[0];
      return o.display_name ?? o.username ?? "Usuário";
    }
    return otherParticipants
      .map((p) => p.display_name ?? p.username ?? "Usuário")
      .join(", ");
  }, [otherParticipants]);

  const headerSubtitle = useMemo(() => {
    if (otherParticipants.length <= 1) {
      const o = otherParticipants[0];
      return o ? `@${o.username ?? "user"}` : "";
    }
    return `${participants.length} participantes`;
  }, [otherParticipants, participants.length]);

  useEffect(() => {
    if (!open) return;

    const supabase = createClient();
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!mounted) return;
      setMessages((data ?? []) as DmMessage[]);
      setLoading(false);

      const unread = (data ?? []).filter(
        (m) => m.sender_id !== currentUserId && !m.read_at
      );
      if (unread.length > 0) {
        await supabase
          .from("dm_messages")
          .update({ read_at: new Date().toISOString() })
          .in(
            "id",
            unread.map((m) => m.id)
          );
      }
    }

    load();

    const channelName = `dm_messages:${threadId}`;
    for (const c of supabase.getChannels()) {
      if (c.topic === `realtime:${channelName}`) {
        supabase.removeChannel(c);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const m = payload.new as DmMessage;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id !== currentUserId) {
            await supabase
              .from("dm_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [open, threadId, currentUserId]);

  // Carrega/recarrega participantes do thread em tempo real
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    let mounted = true;

    async function loadParticipants() {
      const { data } = await supabase
        .from("dm_thread_participants")
        .select("user_id, profiles:profiles!dm_thread_participants_user_id_fkey(id, username, display_name, avatar_url)")
        .eq("thread_id", threadId);
      if (!mounted) return;
      const list = (data ?? [])
        .map((row) => row.profiles as unknown as ParticipantProfile | null)
        .filter((p): p is ParticipantProfile => !!p);
      if (list.length > 0) setParticipants(list);
    }

    loadParticipants();

    const partChannelName = `dm_thread_participants:${threadId}`;
    for (const c of supabase.getChannels()) {
      if (c.topic === `realtime:${partChannelName}`) {
        supabase.removeChannel(c);
      }
    }

    const partChannel = supabase
      .channel(partChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_thread_participants",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(partChannel);
    };
  }, [open, threadId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (!didMountScrollRef.current) {
      el.scrollTop = el.scrollHeight;
      didMountScrollRef.current = true;
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!open) didMountScrollRef.current = false;
  }, [open]);

  // Tick a cada 1s para atualizar contadores de expiração
  useEffect(() => {
    if (!open) return;
    const hasEphemeral = messages.some((m) => m.expires_at);
    if (!hasEphemeral) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [open, messages]);

  // Limpa preview URL ao trocar de arquivo
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
      toast.error("Imagem muito grande", { description: "Limite de 20MB no arquivo original." });
      return;
    }
    setPreparing(true);
    try {
      const blob = await compressImage(file, { maxDimension: 1280, quality: 0.8 });
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

  async function send() {
    const content = input.trim();
    if ((!content && !pendingFile) || sending) return;

    setSending(true);
    const supabase = createClient();

    let imagePath: string | null = null;
    let expiresAt: string | null = null;

    if (pendingFile) {
      const ext = pendingFile.type === "image/webp" ? "webp" : "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const path = `${threadId}/${currentUserId}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from(DM_IMAGE_BUCKET)
        .upload(path, pendingFile, {
          cacheControl: "300",
          upsert: false,
          contentType: pendingFile.type || "image/jpeg",
        });
      if (upErr) {
        setSending(false);
        toast.error("Falha ao enviar imagem", { description: upErr.message });
        return;
      }
      imagePath = path;
      expiresAt = new Date(Date.now() + DM_IMAGE_TTL_MS).toISOString();
    }

    const insertPayload: {
      thread_id: string;
      sender_id: string;
      content: string | null;
      image_path: string | null;
      expires_at: string | null;
    } = {
      thread_id: threadId,
      sender_id: currentUserId,
      content: content || null,
      image_path: imagePath,
      expires_at: expiresAt,
    };

    const { error } = await supabase.from("dm_messages").insert(insertPayload);
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar", { description: error.message });
      return;
    }
    setInput("");
    clearPending();

    const preview = imagePath ? "📷 Imagem" : content.slice(0, 80);
    for (const p of participants) {
      if (p.id === currentUserId) continue;
      notifyUser(supabase, p.id, "dm_message", {
        threadId,
        fromUserId: currentUserId,
        preview,
      }).catch(() => {});
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const previewParticipants = otherParticipants.slice(0, 3);
  const remainingCount = otherParticipants.length - previewParticipants.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-none w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[85vh] sm:max-h-[640px] sm:max-w-md sm:rounded-2xl sm:border">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-border/50 bg-card/60 p-4 pr-20 text-left">
          <div className="flex shrink-0 -space-x-2">
            {previewParticipants.length === 0 && (
              <Avatar className="h-10 w-10">
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            )}
            {previewParticipants.map((p) => {
              const init = (p.display_name ?? p.username ?? "?").charAt(0).toUpperCase();
              return (
                <Avatar key={p.id} className="h-10 w-10 border-2 border-card">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                  <AvatarFallback>{init}</AvatarFallback>
                </Avatar>
              );
            })}
            {remainingCount > 0 && (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold">
                +{remainingCount}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base">{headerTitle}</DialogTitle>
            <p className="truncate text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-12 top-3 h-8 w-8"
            onClick={() => setAddOpen(true)}
            title="Adicionar usuário"
            aria-label="Adicionar usuário"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div
          ref={messagesContainerRef}
          className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/40 p-4"
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="my-auto text-center text-sm text-muted-foreground">
              Comece a conversa enviando uma mensagem ou imagem.
            </p>
          ) : (
            messages.map((m) => {
              const own = m.sender_id === currentUserId;
              const senderProfile = participants.find((p) => p.id === m.sender_id);
              const senderLabel =
                !own && participants.length > 2
                  ? senderProfile?.display_name ??
                    senderProfile?.username ??
                    "Usuário"
                  : null;
              return (
                <div
                  key={m.id}
                  className={cn("flex", own ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                      own
                        ? "rounded-tr-sm gradient-primary text-white"
                        : "rounded-tl-sm bg-muted text-foreground"
                    )}
                  >
                    {senderLabel && (
                      <p className="mb-1 text-[11px] font-semibold text-primary">
                        {senderLabel}
                      </p>
                    )}
                    {m.image_path && (
                      <DmImage
                        message={m}
                        own={own}
                        isAdmin={isAdmin}
                      />
                    )}
                    {m.content && (
                      <p className={cn("whitespace-pre-wrap break-words", m.image_path && "mt-2")}>
                        {m.content}
                      </p>
                    )}
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        own ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {pendingPreview && (
          <div className="flex items-center gap-3 border-t border-border/50 bg-card/40 px-3 py-2">
            <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border/50 bg-background">
              <img
                src={pendingPreview}
                alt="prévia"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Imagem pronta para envio</p>
              <p>Auto-destruir em 5 minutos após envio.</p>
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

        <div className="flex items-end gap-1 border-t border-border/50 bg-card/40 p-2 sm:gap-2 sm:p-3">
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
            disabled={preparing || sending || !!pendingFile}
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
            disabled={preparing || sending || !!pendingFile}
            onClick={() => cameraRef.current?.click()}
            title="Tirar foto"
            aria-label="Tirar foto"
          >
            <Camera className="h-4 w-4" />
          </Button>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            maxLength={5000}
            placeholder={pendingFile ? "Adicione uma legenda (opcional)..." : "Mensagem privada..."}
            className="min-h-9 resize-none"
            disabled={sending || preparing}
          />
          <Button
            type="button"
            onClick={send}
            disabled={(!input.trim() && !pendingFile) || sending || preparing}
            variant="gradient"
            size="icon"
            className="shrink-0"
          >
            {sending || preparing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>

      <AddDmParticipantDialog
        threadId={threadId}
        currentUserId={currentUserId}
        existingParticipantIds={participants.map((p) => p.id)}
        open={addOpen}
        onOpenChange={setAddOpen}
        roomId={roomId}
      />
    </Dialog>
  );
}

interface DmImageProps {
  message: DmMessage;
  own: boolean;
  isAdmin: boolean;
}

function DmImage({ message, own, isAdmin }: DmImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const expiresAtMs = message.expires_at ? new Date(message.expires_at).getTime() : null;
  const remaining = expiresAtMs ? expiresAtMs - Date.now() : null;
  const expired = remaining !== null && remaining <= 0;

  const shouldFetch = !!message.image_path && (!expired || isAdmin);

  useEffect(() => {
    if (!shouldFetch || !message.image_path) {
      setUrl(null);
      return;
    }
    let mounted = true;
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.storage
        .from(DM_IMAGE_BUCKET)
        .createSignedUrl(message.image_path!, 60 * 10);
      if (!mounted) return;
      if (error || !data?.signedUrl) {
        setError(true);
        return;
      }
      setUrl(data.signedUrl);
    })();
    return () => {
      mounted = false;
    };
  }, [shouldFetch, message.image_path]);

  if (expired && !isAdmin) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs",
          own ? "border-white/40 text-white/80" : "border-border/60 text-muted-foreground"
        )}
      >
        <Timer className="h-3.5 w-3.5" />
        Imagem expirada
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-xs",
          own ? "text-white/80" : "text-muted-foreground"
        )}
      >
        Não foi possível carregar a imagem.
      </div>
    );
  }

  return (
    <div className="relative">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt="anexo"
            loading="lazy"
            className="max-h-72 w-auto max-w-full rounded-lg object-contain"
          />
        </a>
      ) : (
        <div className="flex h-40 w-56 items-center justify-center rounded-lg bg-black/20">
          <Loader2 className="h-5 w-5 animate-spin opacity-70" />
        </div>
      )}
      {expiresAtMs && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
            own ? "bg-black/20 text-white/85" : "bg-background/60 text-muted-foreground"
          )}
        >
          <Timer className="h-3 w-3" />
          {isAdmin && expired ? "Expirada (visível como admin)" : `Some em ${formatRemaining(remaining ?? 0)}`}
        </div>
      )}
    </div>
  );
}

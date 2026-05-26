"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export type MobileFeedKind =
  | "payment"
  | "signup"
  | "room_created"
  | "chat_active";

export interface MobileFeedEvent {
  kind: MobileFeedKind;
  id: string;
  at: string;
  title: string;
  subtitle: string;
  href: string;
  userLabel: string | null;
  avatarUrl: string | null;
}

interface MobileStats {
  paymentsCount24h: number;
  revenueCents24h: number;
  signupsCount24h: number;
  newRoomsCount24h: number;
  msgsLast5Min: number;
}

interface MobileAdminDashboardProps {
  initialEvents: MobileFeedEvent[];
  initialStats: MobileStats;
}

interface PaymentRealtimePayload {
  id: string;
  user_id: string;
  amount_cents: number;
  plan_id: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface ProfileRealtimePayload {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean | null;
}

interface RoomRealtimePayload {
  id: string;
  name: string;
  owner_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface MessageRealtimePayload {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  created_at: string;
}

interface DmMessageRealtimePayload {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
}

const FILTERS: Array<{ id: MobileFeedKind | "all"; label: string }> = [
  { id: "all", label: "Tudo" },
  { id: "payment", label: "Pagamentos" },
  { id: "signup", label: "Cadastros" },
  { id: "chat_active", label: "Chats" },
  { id: "room_created", label: "Salas" },
];

const KIND_LABEL: Record<MobileFeedKind, string> = {
  payment: "Pagamento",
  signup: "Cadastro",
  room_created: "Sala nova",
  chat_active: "Chat",
};

const KIND_COLOR: Record<MobileFeedKind, string> = {
  payment: "text-emerald-400 border-emerald-500/40",
  signup: "text-sky-400 border-sky-500/40",
  room_created: "text-primary border-primary/40",
  chat_active: "text-amber-400 border-amber-500/40",
};

const MAX_FEED_LENGTH = 200;
const FLASH_DURATION_MS = 1500;

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function MobileAdminDashboard({
  initialEvents,
  initialStats,
}: MobileAdminDashboardProps) {
  const router = useRouter();
  const [events, setEvents] = useState<MobileFeedEvent[]>(initialEvents);
  const [stats, setStats] = useState<MobileStats>(initialStats);
  const [filter, setFilter] = useState<MobileFeedKind | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [flashCards, setFlashCards] = useState<{
    payments: boolean;
    signups: boolean;
    rooms: boolean;
    chats: boolean;
  }>({ payments: false, signups: false, rooms: false, chats: false });
  // Re-render periodico pra atualizar "há Xs"
  const [, tick] = useState(0);

  const { enabled: soundEnabled, toggle: toggleSound, play: playSound } =
    useNotificationSound();

  const profileCacheRef = useRef<Map<string, ProfileRealtimePayload>>(
    new Map()
  );
  const planCacheRef = useRef<
    Map<string, { title: string; duration_days: number; price_cents: number }>
  >(new Map());
  const roomCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(i);
  }, []);

  const flashCard = useCallback(
    (key: keyof typeof flashCards) => {
      setFlashCards((cur) => ({ ...cur, [key]: true }));
      setTimeout(() => {
        setFlashCards((cur) => ({ ...cur, [key]: false }));
      }, FLASH_DURATION_MS);
    },
    []
  );

  const addEvent = useCallback((ev: MobileFeedEvent) => {
    setEvents((cur) => {
      if (cur.some((e) => e.id === ev.id)) return cur;
      return [ev, ...cur].slice(0, MAX_FEED_LENGTH);
    });
  }, []);

  const fetchProfile = useCallback(
    async (
      supabase: ReturnType<typeof createClient>,
      userId: string
    ): Promise<ProfileRealtimePayload | null> => {
      const cached = profileCacheRef.current.get(userId);
      if (cached) return cached;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_admin, created_at")
        .eq("id", userId)
        .single();
      if (data) {
        profileCacheRef.current.set(userId, data as ProfileRealtimePayload);
      }
      return data as ProfileRealtimePayload | null;
    },
    []
  );

  const fetchPlan = useCallback(
    async (supabase: ReturnType<typeof createClient>, planId: string) => {
      const cached = planCacheRef.current.get(planId);
      if (cached) return cached;
      const { data } = await supabase
        .from("plans")
        .select("title, duration_days, price_cents")
        .eq("id", planId)
        .single();
      if (data) planCacheRef.current.set(planId, data);
      return data;
    },
    []
  );

  const fetchRoomName = useCallback(
    async (
      supabase: ReturnType<typeof createClient>,
      roomId: string
    ): Promise<string> => {
      const cached = roomCacheRef.current.get(roomId);
      if (cached) return cached;
      const { data } = await supabase
        .from("chat_rooms")
        .select("name")
        .eq("id", roomId)
        .single();
      const name = data?.name ?? "Sala";
      roomCacheRef.current.set(roomId, name);
      return name;
    },
    []
  );

  // Realtime: assina inserts nas 4 tabelas
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-mobile-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payments" },
        async (payload) => {
          const p = payload.new as PaymentRealtimePayload;
          if (p.status !== "paid") return;
          const [profile, plan] = await Promise.all([
            fetchProfile(supabase, p.user_id),
            fetchPlan(supabase, p.plan_id),
          ]);
          addEvent({
            kind: "payment",
            id: `pay-${p.id}`,
            at: p.paid_at ?? p.created_at,
            title: `+${brl(p.amount_cents)}`,
            subtitle: `${
              profile?.display_name ?? profile?.username ?? "alguém"
            } comprou ${plan?.title ?? "um plano"}`,
            href: "/admin/planos",
            userLabel: profile?.display_name ?? profile?.username ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          });
          setStats((s) => ({
            ...s,
            paymentsCount24h: s.paymentsCount24h + 1,
            revenueCents24h: s.revenueCents24h + p.amount_cents,
          }));
          flashCard("payments");
          playSound("money");
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments" },
        async (payload) => {
          const p = payload.new as PaymentRealtimePayload;
          const old = payload.old as PaymentRealtimePayload;
          if (p.status === "paid" && old.status !== "paid") {
            const [profile, plan] = await Promise.all([
              fetchProfile(supabase, p.user_id),
              fetchPlan(supabase, p.plan_id),
            ]);
            addEvent({
              kind: "payment",
              id: `pay-${p.id}`,
              at: p.paid_at ?? new Date().toISOString(),
              title: `+${brl(p.amount_cents)}`,
              subtitle: `${
                profile?.display_name ?? profile?.username ?? "alguém"
              } comprou ${plan?.title ?? "um plano"}`,
              href: "/admin/planos",
              userLabel: profile?.display_name ?? profile?.username ?? null,
              avatarUrl: profile?.avatar_url ?? null,
            });
            setStats((s) => ({
              ...s,
              paymentsCount24h: s.paymentsCount24h + 1,
              revenueCents24h: s.revenueCents24h + p.amount_cents,
            }));
            flashCard("payments");
            playSound("money");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const p = payload.new as ProfileRealtimePayload;
          if (p.is_admin) return;
          profileCacheRef.current.set(p.id, p);
          addEvent({
            kind: "signup",
            id: `signup-${p.id}`,
            at: p.created_at,
            title: `@${p.username ?? "novo usuário"}`,
            subtitle: "novo cadastro",
            href: "/admin/usuarios",
            userLabel: p.display_name ?? p.username ?? null,
            avatarUrl: p.avatar_url ?? null,
          });
          setStats((s) => ({
            ...s,
            signupsCount24h: s.signupsCount24h + 1,
          }));
          flashCard("signups");
          playSound("default");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_rooms" },
        async (payload) => {
          const r = payload.new as RoomRealtimePayload;
          if (!r.owner_id) return;
          if (r.deleted_at) return;
          const profile = await fetchProfile(supabase, r.owner_id);
          roomCacheRef.current.set(r.id, r.name);
          addEvent({
            kind: "room_created",
            id: `room-${r.id}`,
            at: r.created_at,
            title: r.name,
            subtitle: `nova sala de @${profile?.username ?? "?"}`,
            href: "/admin/salas",
            userLabel: profile?.display_name ?? profile?.username ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          });
          setStats((s) => ({
            ...s,
            newRoomsCount24h: s.newRoomsCount24h + 1,
          }));
          flashCard("rooms");
          playSound("default");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m = payload.new as MessageRealtimePayload;
          const roomName = await fetchRoomName(supabase, m.room_id);
          addEvent({
            kind: "chat_active",
            id: `chat-${m.id}`,
            at: m.created_at,
            title: roomName,
            subtitle:
              m.content && m.content.length > 0
                ? m.content.slice(0, 60)
                : "(imagem)",
            href: `/admin/salas-conversas/${m.room_id}?back=/admin/mobile`,
            userLabel: null,
            avatarUrl: null,
          });
          setStats((s) => ({
            ...s,
            msgsLast5Min: s.msgsLast5Min + 1,
          }));
          flashCard("chats");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        (payload) => {
          const m = payload.new as DmMessageRealtimePayload;
          addEvent({
            kind: "chat_active",
            id: `dm-${m.id}`,
            at: m.created_at,
            title: "DM privada",
            subtitle:
              m.content && m.content.length > 0
                ? m.content.slice(0, 60)
                : "(imagem)",
            href: `/admin/mensagens/${m.thread_id}`,
            userLabel: null,
            avatarUrl: null,
          });
          flashCard("chats");
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [addEvent, fetchPlan, fetchProfile, fetchRoomName, flashCard, playSound]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.kind === filter);
  }, [events, filter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/admin"
            className="text-xs text-muted-foreground transition hover:text-foreground"
          >
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold">Admin</h1>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSound}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition",
                soundEnabled
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/40 bg-card/30 text-muted-foreground/60"
              )}
            >
              Som {soundEnabled ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full border border-border/40 bg-card/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {refreshing ? "..." : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 p-3">
        <StatBox
          label="Pagamentos 24h"
          value={brl(stats.revenueCents24h)}
          sub={`${stats.paymentsCount24h} venda(s)`}
          tone="emerald"
          flash={flashCards.payments}
          href="/admin/planos"
        />
        <StatBox
          label="Cadastros 24h"
          value={String(stats.signupsCount24h)}
          sub="novos usuários"
          tone="sky"
          flash={flashCards.signups}
          href="/admin/usuarios"
        />
        <StatBox
          label="Chats ativos"
          value={String(stats.msgsLast5Min)}
          sub="msgs últimos 5min"
          tone="amber"
          flash={flashCards.chats}
          href="/admin/ao-vivo"
        />
        <StatBox
          label="Salas novas 24h"
          value={String(stats.newRoomsCount24h)}
          sub="criadas por users"
          tone="primary"
          flash={flashCards.rooms}
          href="/admin/salas"
        />
      </section>

      <div className="sticky top-[57px] z-30 border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur-sm">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="space-y-1.5 p-3">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border/40 p-8 text-center text-xs text-muted-foreground">
            Nada por aqui ainda. Eventos novos aparecem em tempo real.
          </li>
        ) : (
          filtered.map((e) => <FeedItem key={e.id} event={e} />)
        )}
      </ul>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="grid grid-cols-3">
          <Link
            href="/admin/mobile"
            className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-primary"
          >
            Eventos
          </Link>
          <Link
            href="/admin/ao-vivo"
            className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
          >
            Ao vivo
          </Link>
          <Link
            href="/admin"
            className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
          >
            Painel
          </Link>
        </div>
      </nav>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "sky" | "amber" | "primary";
  flash: boolean;
  href: string;
}

function StatBox({ label, value, sub, tone, flash, href }: StatBoxProps) {
  const toneRing = {
    emerald: "ring-emerald-500/50",
    sky: "ring-sky-500/50",
    amber: "ring-amber-500/50",
    primary: "ring-primary/50",
  }[tone];

  const toneBar = {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    primary: "bg-primary",
  }[tone];

  return (
    <Link
      href={href}
      className={cn(
        "relative block overflow-hidden rounded-xl border border-border/40 bg-card/30 p-3 transition active:scale-[0.98]",
        flash && `ring-2 ${toneRing}`
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", toneBar)} />
      <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-bold leading-tight tabular-nums">
        {value}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </Link>
  );
}

function FeedItem({ event }: { event: MobileFeedEvent }) {
  return (
    <li>
      <Link
        href={event.href}
        className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/30 p-3 transition hover:border-primary/40 hover:bg-card/50 active:scale-[0.99]"
      >
        {event.avatarUrl ? (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={event.avatarUrl} alt={event.userLabel ?? ""} />
            <AvatarFallback className="bg-muted text-[10px] uppercase">
              {event.userLabel?.slice(0, 2) ?? "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted/30 text-[10px] uppercase text-muted-foreground">
            {event.title.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold">{event.title}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              há {timeAgo(event.at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "shrink-0 rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider",
                KIND_COLOR[event.kind]
              )}
            >
              {KIND_LABEL[event.kind]}
            </span>
            <p className="truncate text-xs text-muted-foreground">
              {event.subtitle}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

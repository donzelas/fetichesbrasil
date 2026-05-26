"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  DollarSign,
  Home,
  MessageCircle,
  Plus,
  RefreshCw,
  Sparkles,
  UserPlus,
} from "lucide-react";
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

const FILTERS: Array<{
  id: MobileFeedKind | "all";
  label: string;
  icon: typeof DollarSign;
}> = [
  { id: "all", label: "Tudo", icon: Sparkles },
  { id: "payment", label: "Pagamentos", icon: DollarSign },
  { id: "signup", label: "Cadastros", icon: UserPlus },
  { id: "chat_active", label: "Chats", icon: MessageCircle },
  { id: "room_created", label: "Salas", icon: Plus },
];

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
          // Pagamento que mudou pra paid (ex.: webhook confirmou PIX)
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
          // Sem som pra mensagens normais (seria muito ruidoso)
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
    <div className="mx-auto max-w-md min-h-screen bg-background pb-20">
      {/* Header sticky */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Painel
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold">Admin Mobile</h1>
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={soundEnabled ? "Desligar som" : "Ligar som"}
              title={soundEnabled ? "Som ligado" : "Som desligado"}
            >
              {soundEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground/50" />
              )}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Atualizar"
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Cards 2x2 */}
      <section className="grid grid-cols-2 gap-2 p-3">
        <StatBox
          icon={DollarSign}
          label="Pagamentos 24h"
          value={brl(stats.revenueCents24h)}
          sub={`${stats.paymentsCount24h} venda(s)`}
          tone="emerald"
          flash={flashCards.payments}
          href="/admin/planos"
        />
        <StatBox
          icon={UserPlus}
          label="Cadastros 24h"
          value={String(stats.signupsCount24h)}
          sub="novos usuários"
          tone="sky"
          flash={flashCards.signups}
          href="/admin/usuarios"
        />
        <StatBox
          icon={MessageCircle}
          label="Chats ativos"
          value={String(stats.msgsLast5Min)}
          sub="msgs últimos 5min"
          tone="amber"
          flash={flashCards.chats}
          href="/admin/ao-vivo"
        />
        <StatBox
          icon={Plus}
          label="Salas novas 24h"
          value={String(stats.newRoomsCount24h)}
          sub="criadas por users"
          tone="primary"
          flash={flashCards.rooms}
          href="/admin/salas"
        />
      </section>

      {/* Filtros */}
      <div className="sticky top-[57px] z-30 border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur-sm">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <ul className="space-y-1.5 p-3">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border/40 p-8 text-center text-xs text-muted-foreground">
            Nada por aqui ainda. Eventos novos aparecem em tempo real.
          </li>
        ) : (
          filtered.map((e) => (
            <FeedItem key={e.id} event={e} />
          ))
        )}
      </ul>

      {/* Bottom nav fixo */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="grid grid-cols-3">
          <Link
            href="/admin/mobile"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-primary"
          >
            <Sparkles className="h-5 w-5" />
            Eventos
          </Link>
          <Link
            href="/admin/ao-vivo"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <MessageCircle className="h-5 w-5" />
            Chats ao vivo
          </Link>
          <Link
            href="/admin"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Home className="h-5 w-5" />
            Painel
          </Link>
        </div>
      </nav>
    </div>
  );
}

interface StatBoxProps {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "sky" | "amber" | "primary";
  flash: boolean;
  href: string;
}

function StatBox({ icon: Icon, label, value, sub, tone, flash, href }: StatBoxProps) {
  const toneClasses = {
    emerald: {
      bg: "bg-emerald-500/15",
      ring: "ring-emerald-500/50",
      text: "text-emerald-400",
    },
    sky: {
      bg: "bg-sky-500/15",
      ring: "ring-sky-500/50",
      text: "text-sky-400",
    },
    amber: {
      bg: "bg-amber-500/15",
      ring: "ring-amber-500/50",
      text: "text-amber-400",
    },
    primary: {
      bg: "bg-primary/15",
      ring: "ring-primary/50",
      text: "text-primary",
    },
  }[tone];

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border border-border/40 bg-card/30 p-3 transition active:scale-[0.98]",
        flash && `ring-2 ${toneClasses.ring}`
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("rounded-lg p-1.5", toneClasses.bg)}>
          <Icon className={cn("h-3.5 w-3.5", toneClasses.text)} />
        </div>
        <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 truncate text-xl font-bold tabular-nums leading-tight">
        {value}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </Link>
  );
}

function FeedItem({ event }: { event: MobileFeedEvent }) {
  const kindMeta: Record<
    MobileFeedKind,
    { icon: typeof DollarSign; tone: string; bg: string }
  > = {
    payment: {
      icon: DollarSign,
      tone: "text-emerald-400",
      bg: "bg-emerald-500/15",
    },
    signup: {
      icon: UserPlus,
      tone: "text-sky-400",
      bg: "bg-sky-500/15",
    },
    room_created: {
      icon: Plus,
      tone: "text-primary",
      bg: "bg-primary/15",
    },
    chat_active: {
      icon: MessageCircle,
      tone: "text-amber-400",
      bg: "bg-amber-500/15",
    },
  };

  const meta = kindMeta[event.kind];
  const Icon = meta.icon;

  return (
    <li>
      <Link
        href={event.href}
        className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/30 p-3 transition active:scale-[0.99] hover:border-primary/40 hover:bg-card/50"
      >
        {event.avatarUrl ? (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={event.avatarUrl} alt={event.userLabel ?? ""} />
            <AvatarFallback className={meta.bg}>
              <Icon className={cn("h-4 w-4", meta.tone)} />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full",
              meta.bg
            )}
          >
            <Icon className={cn("h-4 w-4", meta.tone)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold">{event.title}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              há {timeAgo(event.at)}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {event.subtitle}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      </Link>
    </li>
  );
}

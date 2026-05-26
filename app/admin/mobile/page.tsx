import { createClient } from "@/lib/supabase/server";
import {
  MobileAdminDashboard,
  type MobileFeedEvent,
} from "@/components/admin/MobileAdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Mobile · Fetiches Brasil",
};

const WINDOW_HOURS = 24;

interface PaymentRow {
  id: string;
  user_id: string;
  amount_cents: number;
  plan_id: string;
  paid_at: string | null;
  created_at: string;
}

interface ProfileSignupRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  country?: string | null;
}

interface RoomRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  created_at: string;
}

interface DmMessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
}

export default async function AdminMobilePage() {
  const supabase = await createClient();
  const sinceIso = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();
  const lastHourIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const last5MinIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [
    { data: paymentsRaw },
    { data: signupsRaw },
    { data: newRoomsRaw },
    { data: recentMsgsRaw },
    { data: recentDmsRaw },
    { count: msgsLast5Min },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, user_id, amount_cents, plan_id, paid_at, created_at")
      .eq("status", "paid")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at")
      .gte("created_at", sinceIso)
      .eq("is_admin", false)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("chat_rooms")
      .select("id, name, owner_id, created_at")
      .not("owner_id", "is", null)
      .is("deleted_at", null)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("messages")
      .select("id, room_id, user_id, content, created_at")
      .gte("created_at", lastHourIso)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("dm_messages")
      .select("id, thread_id, sender_id, content, created_at")
      .gte("created_at", lastHourIso)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", last5MinIso),
  ]);

  const payments = (paymentsRaw ?? []) as PaymentRow[];
  const signups = (signupsRaw ?? []) as ProfileSignupRow[];
  const newRooms = (newRoomsRaw ?? []) as RoomRow[];
  const recentMsgs = (recentMsgsRaw ?? []) as MessageRow[];
  const recentDms = (recentDmsRaw ?? []) as DmMessageRow[];

  // Enriquecimento: profiles dos user_ids envolvidos + planos + salas
  const userIds = new Set<string>();
  payments.forEach((p) => userIds.add(p.user_id));
  newRooms.forEach((r) => userIds.add(r.owner_id));
  recentMsgs.forEach((m) => userIds.add(m.user_id));
  recentDms.forEach((m) => userIds.add(m.sender_id));

  const planIds = new Set<string>(payments.map((p) => p.plan_id));
  const roomIdsInMsgs = new Set<string>(recentMsgs.map((m) => m.room_id));

  const [profilesRes, plansRes, roomsRes] = await Promise.all([
    userIds.size > 0
      ? supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", Array.from(userIds))
      : Promise.resolve({ data: [] }),
    planIds.size > 0
      ? supabase
          .from("plans")
          .select("id, title, duration_days, price_cents")
          .in("id", Array.from(planIds))
      : Promise.resolve({ data: [] }),
    roomIdsInMsgs.size > 0
      ? supabase
          .from("chat_rooms")
          .select("id, name")
          .in("id", Array.from(roomIdsInMsgs))
      : Promise.resolve({ data: [] }),
  ]);

  const profileById = new Map<
    string,
    {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }
  >();
  for (const p of profilesRes.data ?? []) profileById.set(p.id, p);

  const planById = new Map<
    string,
    { id: string; title: string; duration_days: number; price_cents: number }
  >();
  for (const p of plansRes.data ?? []) planById.set(p.id, p);

  const roomById = new Map<string, { id: string; name: string }>();
  for (const r of roomsRes.data ?? []) roomById.set(r.id, r);

  // Constroi feed unificado dos eventos individuais (24h)
  const events: MobileFeedEvent[] = [];

  for (const p of payments) {
    const buyer = profileById.get(p.user_id);
    const plan = planById.get(p.plan_id);
    events.push({
      kind: "payment",
      id: `pay-${p.id}`,
      at: p.paid_at ?? p.created_at,
      title: `+R$ ${(p.amount_cents / 100).toFixed(2).replace(".", ",")}`,
      subtitle: `${buyer?.display_name ?? buyer?.username ?? "alguém"} comprou ${
        plan?.title ?? "um plano"
      }`,
      href: "/admin/planos",
      userLabel: buyer?.display_name ?? buyer?.username ?? null,
      avatarUrl: buyer?.avatar_url ?? null,
    });
  }

  for (const s of signups) {
    events.push({
      kind: "signup",
      id: `signup-${s.id}`,
      at: s.created_at,
      title: `@${s.username ?? "novo usuário"}`,
      subtitle: "novo cadastro",
      href: `/admin/usuarios`,
      userLabel: s.display_name ?? s.username ?? null,
      avatarUrl: s.avatar_url ?? null,
    });
  }

  for (const r of newRooms) {
    const owner = profileById.get(r.owner_id);
    events.push({
      kind: "room_created",
      id: `room-${r.id}`,
      at: r.created_at,
      title: r.name,
      subtitle: `nova sala de @${owner?.username ?? "?"}`,
      href: `/admin/salas`,
      userLabel: owner?.display_name ?? owner?.username ?? null,
      avatarUrl: owner?.avatar_url ?? null,
    });
  }

  // Agrega mensagens por sala (mostra atividade quente) — não inunda feed
  const msgsByRoom = new Map<
    string,
    { count: number; lastAt: string; lastContent: string | null }
  >();
  for (const m of recentMsgs) {
    const cur = msgsByRoom.get(m.room_id);
    if (!cur || cur.lastAt < m.created_at) {
      msgsByRoom.set(m.room_id, {
        count: (cur?.count ?? 0) + 1,
        lastAt: cur ? (m.created_at > cur.lastAt ? m.created_at : cur.lastAt) : m.created_at,
        lastContent: m.content,
      });
    } else {
      cur.count += 1;
    }
  }

  for (const [rid, agg] of msgsByRoom.entries()) {
    const room = roomById.get(rid);
    events.push({
      kind: "chat_active",
      id: `chat-${rid}-${agg.lastAt}`,
      at: agg.lastAt,
      title: room?.name ?? "Sala",
      subtitle: `${agg.count} ${agg.count === 1 ? "mensagem" : "mensagens"} na última hora`,
      href: `/admin/salas-conversas/${rid}?back=/admin/mobile`,
      userLabel: null,
      avatarUrl: null,
    });
  }

  // DMs ativas (agrega por thread)
  const dmsByThread = new Map<string, { count: number; lastAt: string }>();
  for (const m of recentDms) {
    const cur = dmsByThread.get(m.thread_id);
    if (!cur) {
      dmsByThread.set(m.thread_id, { count: 1, lastAt: m.created_at });
    } else {
      cur.count += 1;
      if (m.created_at > cur.lastAt) cur.lastAt = m.created_at;
    }
  }

  for (const [tid, agg] of dmsByThread.entries()) {
    events.push({
      kind: "chat_active",
      id: `dm-${tid}-${agg.lastAt}`,
      at: agg.lastAt,
      title: "Conversa privada",
      subtitle: `${agg.count} ${agg.count === 1 ? "msg" : "msgs"} DM na última hora`,
      href: `/admin/mensagens/${tid}`,
      userLabel: null,
      avatarUrl: null,
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  const totalRevenue24h = payments.reduce((s, p) => s + p.amount_cents, 0);

  const initialStats = {
    paymentsCount24h: payments.length,
    revenueCents24h: totalRevenue24h,
    signupsCount24h: signups.length,
    newRoomsCount24h: newRooms.length,
    msgsLast5Min: msgsLast5Min ?? 0,
  };

  return (
    <MobileAdminDashboard
      initialEvents={events}
      initialStats={initialStats}
    />
  );
}

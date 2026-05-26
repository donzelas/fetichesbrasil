import Link from "next/link";
import {
  Activity,
  BarChart3,
  CalendarClock,
  Crown,
  DollarSign,
  FileText,
  Flame,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Music2,
  Newspaper,
  Radio,
  ShoppingBag,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalPremium },
    { count: totalRooms },
    { count: totalFeatured },
    { count: totalUserRooms },
    { count: totalDmThreads },
    { count: totalFeaturedCards },
    { count: pendingPosts },
    { count: approvedPosts },
    { count: totalRoomImages },
    { count: liveRoomMessages },
    { count: liveDmMessages },
    { count: pendingTiktok },
    { count: postedTiktok },
    { count: totalFetishes },
    { count: fetishesWithSeo },
    { count: pageViews24h },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", false),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_premium", true)
      .eq("is_admin", false),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("is_featured", true)
      .is("deleted_at", null),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .not("owner_id", "is", null)
      .is("deleted_at", null),
    supabase
      .from("dm_threads")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("featured_fetish_cards")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .is("deleted_at", null),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .not("image_path", "is", null),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", tenMinutesAgo),
    supabase
      .from("dm_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", tenMinutesAgo),
    supabase
      .from("tiktok_scripts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase
      .from("tiktok_scripts")
      .select("*", { count: "exact", head: true })
      .in("status", ["posted", "posted_inbox"]),
    supabase.from("fetishes").select("*", { count: "exact", head: true }),
    supabase
      .from("fetishes")
      .select("*", { count: "exact", head: true })
      .not("seo_content", "is", null),
    supabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .gte("viewed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq("is_admin_view", false),
  ]);

  const [revenueSummaryRes, paymentsByPlanRes] = await Promise.all([
    supabase.rpc("admin_revenue_summary"),
    supabase.rpc("admin_payments_by_plan"),
  ]);

  const revenue = revenueSummaryRes.data?.[0] ?? {
    total_revenue_cents: 0,
    total_payments: 0,
    revenue_30d_cents: 0,
    payments_30d: 0,
    unique_buyers: 0,
  };
  const paymentsByPlan = paymentsByPlanRes.data ?? [];

  const liveTotal = (liveRoomMessages ?? 0) + (liveDmMessages ?? 0);

  const sections: {
    title: string;
    items: {
      href: string;
      title: string;
      desc: string;
      badge?: { count: number; tone: "primary" | "amber" };
      icon?: typeof Users;
    }[];
  }[] = [
    {
      title: "Comunidade & Moderação",
      items: [
        {
          href: "/admin/usuarios",
          title: "Usuários",
          desc: `${totalUsers ?? 0} cadastrados · promover Premium, banir, ver detalhes.`,
          icon: Users,
        },
        {
          href: "/admin/posts",
          title: "Moderar Blog",
          desc: "Aprovar/rejeitar posts da comunidade, excluir comentários.",
          badge:
            (pendingPosts ?? 0) > 0
              ? { count: pendingPosts ?? 0, tone: "amber" }
              : undefined,
          icon: Newspaper,
        },
      ],
    },
    {
      title: "Conversas",
      items: [
        {
          href: "/admin/salas",
          title: "Gerenciar salas",
          desc: `${totalRooms ?? 0} ativas · destacar, deletar problemáticas.`,
          icon: MessageSquare,
        },
        {
          href: "/admin/salas/usuarios",
          title: "Salas de assinantes",
          desc: "Salas criadas pela comunidade Premium — moderar/remover.",
          badge:
            (totalUserRooms ?? 0) > 0
              ? { count: totalUserRooms ?? 0, tone: "primary" }
              : undefined,
          icon: UserPlus,
        },
        {
          href: "/admin/mensagens",
          title: "Chats individuais",
          desc: `${totalDmThreads ?? 0} conversas · ver mensagens e imagens (mesmo expiradas).`,
          icon: MessageCircle,
        },
        {
          href: "/admin/salas-imagens",
          title: "Imagens das salas",
          desc: "Auditoria de fotos enviadas nas salas (visíveis após expiração 15s).",
          badge:
            (totalRoomImages ?? 0) > 0
              ? { count: totalRoomImages ?? 0, tone: "primary" }
              : undefined,
          icon: ImageIcon,
        },
      ],
    },
    {
      title: "Conteúdo & Monetização",
      items: [
        {
          href: "/admin/destaques",
          title: "Cards de destaque",
          desc: `${totalFeaturedCards ?? 0} ativos · editar carrossel da home.`,
          icon: Flame,
        },
        {
          href: "/admin/planos",
          title: "Planos Premium",
          desc: "Criar/editar planos por valor e duração (PIX Mercado Pago).",
          icon: Tag,
        },
      ],
    },
    {
      title: "Tráfego & Crescimento",
      items: [
        {
          href: "/admin/tiktok",
          title: "TikTok IA",
          desc: `${postedTiktok ?? 0} publicado(s) · roteiros gerados por IA, aprovação manual.`,
          badge:
            (pendingTiktok ?? 0) > 0
              ? { count: pendingTiktok ?? 0, tone: "amber" }
              : undefined,
          icon: Music2,
        },
        {
          href: "/admin/seo",
          title: "SEO IA",
          desc: `${fetishesWithSeo ?? 0}/${totalFetishes ?? 0} fetiches com conteúdo único · artigos de 1000+ palavras pro Google.`,
          badge:
            (totalFetishes ?? 0) - (fetishesWithSeo ?? 0) > 0
              ? { count: (totalFetishes ?? 0) - (fetishesWithSeo ?? 0), tone: "amber" }
              : undefined,
          icon: FileText,
        },
        {
          href: "/admin/analytics",
          title: "Analytics",
          desc: `${pageViews24h ?? 0} visualizações nas últimas 24h · quem acessa, de onde, qual dispositivo.`,
          badge:
            (pageViews24h ?? 0) > 0
              ? { count: pageViews24h ?? 0, tone: "primary" }
              : undefined,
          icon: BarChart3,
        },
      ],
    },
  ];

  const stats = [
    { label: "Usuários totais", value: totalUsers ?? 0, icon: Users },
    { label: "Premium", value: totalPremium ?? 0, icon: Crown },
    { label: "Salas ativas", value: totalRooms ?? 0, icon: MessageSquare },
    { label: "Salas destaque", value: totalFeatured ?? 0, icon: Flame },
    { label: "Salas assinantes", value: totalUserRooms ?? 0, icon: UserPlus },
    {
      label: "Posts pendentes",
      value: pendingPosts ?? 0,
      icon: Newspaper,
      highlight: (pendingPosts ?? 0) > 0,
    },
    { label: "Posts aprovados", value: approvedPosts ?? 0, icon: Newspaper },
    { label: "Chats individuais", value: totalDmThreads ?? 0, icon: MessageCircle },
    { label: "Imagens em salas", value: totalRoomImages ?? 0, icon: ImageIcon },
    { label: "Cards destaque", value: totalFeaturedCards ?? 0, icon: ImageIcon },
    {
      label: "TikTok pendentes",
      value: pendingTiktok ?? 0,
      icon: Music2,
      highlight: (pendingTiktok ?? 0) > 0,
    },
    { label: "TikTok publicados", value: postedTiktok ?? 0, icon: Music2 },
  ];

  return (
    <div className="container max-w-6xl space-y-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Admin</h1>
          <p className="text-muted-foreground">Gestão geral da plataforma.</p>
        </div>
      </div>

      {/* ─── HERO: MONITOR AO VIVO ───────────────────────────── */}
      <Link href="/admin/ao-vivo" className="block">
        <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent transition hover:border-primary/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary">
                <Radio className="h-7 w-7" />
                <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Monitor ao Vivo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Acompanhe em tempo real conversas ativas em salas e DMs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Últimos 10min
                </p>
                <p className="flex items-baseline gap-1.5 text-3xl font-bold">
                  {liveTotal}
                  <span className="text-xs font-medium text-muted-foreground">
                    {liveTotal === 1 ? "mensagem" : "mensagens"}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {liveRoomMessages ?? 0} em salas · {liveDmMessages ?? 0} em DMs
                </p>
              </div>
              <Activity className="hidden h-10 w-10 text-primary/40 sm:block" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* ─── RECEITA & VENDAS POR PLANO ──────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 1: Receita total */}
        <Link href="/admin/planos" className="group block">
          <Card className="relative h-full overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent transition hover:border-emerald-500/60">
            <CardContent className="space-y-4 py-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">
                    Receita total
                  </p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight">
                    {brl(Number(revenue.total_revenue_cents))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(revenue.total_payments)} pagamento(s) ·{" "}
                    {Number(revenue.unique_buyers)} comprador(es) único(s)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-emerald-500/15 pt-3">
                <div className="rounded-lg bg-card/40 p-3">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Últimos 30 dias
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {brl(Number(revenue.revenue_30d_cents))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {Number(revenue.payments_30d)} pagamento(s)
                  </p>
                </div>
                <div className="rounded-lg bg-card/40 p-3">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    Ticket médio
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {Number(revenue.total_payments) > 0
                      ? brl(
                          Math.round(
                            Number(revenue.total_revenue_cents) /
                              Number(revenue.total_payments)
                          )
                        )
                      : brl(0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    por pagamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Vendas por plano */}
        <Card className="h-full">
          <CardContent className="space-y-3 py-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Vendas por plano</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {paymentsByPlan.length}{" "}
                {paymentsByPlan.length === 1 ? "plano vendido" : "planos vendidos"}
              </span>
            </div>
            {paymentsByPlan.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Nenhum pagamento confirmado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {paymentsByPlan.map((row, i) => {
                  const pct =
                    Number(revenue.total_payments) > 0
                      ? Math.round(
                          (Number(row.qtd) / Number(revenue.total_payments)) * 100
                        )
                      : 0;
                  return (
                    <div
                      key={`${row.plan_id ?? "removed"}-${i}`}
                      className="space-y-1 rounded-lg border border-border/40 bg-card/30 p-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {row.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {row.duration_days
                              ? `${row.duration_days} dias`
                              : "—"}
                            {row.price_cents != null && (
                              <>
                                {" · "}
                                {brl(Number(row.price_cents))}
                              </>
                            )}
                            {row.payment_method && (
                              <>
                                {" · "}
                                <span className="uppercase">
                                  {row.payment_method}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold tabular-nums leading-tight">
                            {Number(row.qtd)}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                              {Number(row.qtd) === 1 ? "venda" : "vendas"}
                            </span>
                          </p>
                          <p className="text-xs font-semibold tabular-nums text-emerald-400">
                            {brl(Number(row.revenue_cents))}
                          </p>
                        </div>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── STATS COMPACTAS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const isHighlight =
            "highlight" in s && (s as { highlight?: boolean }).highlight;
          return (
            <Card
              key={s.label}
              className={
                isHighlight
                  ? "border-amber-500/50 ring-1 ring-amber-500/30"
                  : undefined
              }
            >
              <CardContent className="flex items-center gap-2 py-3">
                <div
                  className={
                    isHighlight
                      ? "rounded-lg bg-amber-500/15 p-1.5"
                      : "rounded-lg bg-primary/10 p-1.5"
                  }
                >
                  <s.icon
                    className={
                      isHighlight
                        ? "h-4 w-4 text-amber-500"
                        : "h-4 w-4 text-primary"
                    }
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="text-lg font-bold leading-tight">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── SEÇÕES DE NAVEGAÇÃO ─────────────────────────────── */}
      {sections.map((sec) => (
        <section key={sec.title} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {sec.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sec.items.map((item) => {
              const Icon = item.icon ?? MessageSquare;
              const amber = item.badge?.tone === "amber";
              return (
                <Link key={item.href} href={item.href} className="group">
                  <Card
                    className={
                      amber
                        ? "h-full border-amber-500/40 transition hover:border-amber-500/70"
                        : "h-full transition hover:border-primary/50"
                    }
                  >
                    <CardContent className="space-y-2 py-5">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={
                            amber
                              ? "h-4 w-4 text-amber-500"
                              : "h-4 w-4 text-primary/70"
                          }
                        />
                        <h3 className="flex-1 font-semibold group-hover:text-primary">
                          {item.title}
                        </h3>
                        {item.badge && (
                          <span
                            className={
                              amber
                                ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600"
                                : "rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
                            }
                          >
                            {item.badge.count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

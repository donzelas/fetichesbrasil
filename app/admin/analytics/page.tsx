import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Building2,
  Eye,
  Globe,
  LogIn,
  Map,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsRangeSelector } from "@/components/admin/AnalyticsRangeSelector";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ days?: string }>;
}

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  PT: "Portugal",
  AR: "Argentina",
  ES: "Espanha",
  MX: "México",
  CO: "Colômbia",
  CL: "Chile",
  PE: "Peru",
  UY: "Uruguai",
  PY: "Paraguai",
  DE: "Alemanha",
  FR: "França",
  IT: "Itália",
  UK: "Reino Unido",
  GB: "Reino Unido",
};

const BR_STATES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function prettyRegion(country: string, region: string): string {
  if (country === "BR" && BR_STATES[region]) return BR_STATES[region];
  return region;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const days = Math.min(90, Math.max(1, Number(sp.days) || 7));
  const supabase = await createClient();

  const [
    totalsRes,
    topPagesRes,
    topReferrersRes,
    byCountryRes,
    byRegionRes,
    byCityRes,
    byDeviceRes,
    byHourRes,
    byDayRes,
    botsRes,
  ] = await Promise.all([
    supabase.rpc("analytics_totals", { p_days: days }),
    supabase.rpc("analytics_top_pages", { p_days: days, p_limit: 20 }),
    supabase.rpc("analytics_top_referrers", { p_days: days, p_limit: 15 }),
    supabase.rpc("analytics_by_country", { p_days: days }),
    supabase.rpc("analytics_by_region", { p_days: days }),
    supabase.rpc("analytics_by_city", { p_days: days }),
    supabase.rpc("analytics_by_device", { p_days: days }),
    supabase.rpc("analytics_by_hour"),
    supabase.rpc("analytics_by_day", { p_days: days }),
    supabase.rpc("analytics_bots", { p_days: days }),
  ]);

  const totals = totalsRes.data?.[0];
  const topPages = topPagesRes.data ?? [];
  const topReferrers = topReferrersRes.data ?? [];
  const byCountry = byCountryRes.data ?? [];
  const byRegion = byRegionRes.data ?? [];
  const byCity = byCityRes.data ?? [];
  const byDevice = byDeviceRes.data ?? [];
  const byHour = byHourRes.data ?? [];
  const byDay = byDayRes.data ?? [];
  const bots = botsRes.data ?? [];

  // Agrega devices
  const devicesAgg = byDevice.reduce<Record<string, number>>((acc, d) => {
    acc[d.device_type] = (acc[d.device_type] ?? 0) + Number(d.views);
    return acc;
  }, {});

  // Top browsers
  const browsersAgg = byDevice.reduce<Record<string, number>>((acc, d) => {
    acc[d.browser] = (acc[d.browser] ?? 0) + Number(d.views);
    return acc;
  }, {});

  const totalCountryViews = byCountry.reduce((s, c) => s + Number(c.views), 0);
  const maxHourView = Math.max(1, ...byHour.map((h) => Number(h.views)));
  const maxDayView = Math.max(1, ...byDay.map((d) => Number(d.views)));

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Quem acessa, de onde, e que páginas visita. Privacy-friendly (sem cookies,
            IP anonimizado). Apenas tráfego não-admin.
          </p>
        </div>
        <AnalyticsRangeSelector current={days} />
      </header>

      {/* Cards de totais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Eye}
          label="Visualizações"
          value={fmt(totals?.total_views)}
          sub={`em ${days}d`}
        />
        <StatCard
          icon={Users}
          label="Visitantes únicos"
          value={fmt(totals?.unique_visitors)}
          sub={`por IP (anonimizado)`}
        />
        <StatCard
          icon={Globe}
          label="Países"
          value={fmt(totals?.countries)}
          sub={`alcance geo`}
        />
        <StatCard
          icon={LogIn}
          label="Views logados"
          value={fmt(totals?.authenticated_views)}
          sub={`usuários ativos`}
        />
      </div>

      {/* Gráficos de tendência */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-sm font-semibold">Últimas 24 horas (por hora)</h2>
            {byHour.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sem dados ainda
              </p>
            ) : (
              <div className="flex h-32 items-end gap-1">
                {byHour.map((h) => {
                  const pct = (Number(h.views) / maxHourView) * 100;
                  const hour = new Date(h.hour).getHours();
                  return (
                    <div
                      key={h.hour}
                      className="group flex flex-1 flex-col items-center"
                      title={`${hour}h - ${h.views} views`}
                    >
                      <div className="relative flex h-full w-full items-end">
                        <div
                          className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="mt-1 text-[9px] text-muted-foreground">
                        {hour}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-sm font-semibold">Tendência (últimos {days} dias)</h2>
            {byDay.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sem dados ainda
              </p>
            ) : (
              <div className="flex h-32 items-end gap-0.5">
                {byDay.map((d) => {
                  const pct = (Number(d.views) / maxDayView) * 100;
                  const dia = new Date(d.day).getDate();
                  return (
                    <div
                      key={d.day}
                      className="group flex flex-1 flex-col items-center"
                      title={`dia ${dia} - ${d.views} views / ${d.uniques} uniques`}
                    >
                      <div className="relative flex h-full w-full items-end">
                        <div
                          className="w-full rounded-t bg-emerald-500/70 transition group-hover:bg-emerald-500"
                          style={{ height: `${pct}%` }}
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

      {/* Top páginas + Referrers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-sm font-semibold">Top páginas</h2>
            {topPages.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Sem dados ainda
              </p>
            ) : (
              <div className="space-y-1.5">
                {topPages.map((p) => (
                  <Row
                    key={p.path}
                    label={
                      <Link
                        href={p.path}
                        target="_blank"
                        className="truncate hover:text-primary hover:underline"
                      >
                        {p.path}
                      </Link>
                    }
                    value={p.views}
                    sub={`${p.uniques} unique`}
                    max={Math.max(...topPages.map((x) => Number(x.views)))}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-sm font-semibold">Top referrers (de onde vem)</h2>
            {topReferrers.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Sem dados ainda
              </p>
            ) : (
              <div className="space-y-1.5">
                {topReferrers.map((r) => (
                  <Row
                    key={r.referrer}
                    label={<span className="truncate">{r.referrer}</span>}
                    value={r.views}
                    max={Math.max(...topReferrers.map((x) => Number(x.views)))}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Países + Devices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-sm font-semibold">Países (geo)</h2>
            {byCountry.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Sem dados de geo (Netlify envia headers em produção)
              </p>
            ) : (
              <div className="space-y-1.5">
                {byCountry.map((c) => {
                  const pct = Math.round(
                    (Number(c.views) / Math.max(1, totalCountryViews)) * 100
                  );
                  return (
                    <Row
                      key={c.country}
                      label={
                        <span>
                          <span className="font-mono mr-2 text-[10px] text-muted-foreground">
                            {c.country}
                          </span>
                          {COUNTRY_NAMES[c.country] ?? c.country}
                        </span>
                      }
                      value={c.views}
                      sub={`${pct}%`}
                      max={Math.max(...byCountry.map((x) => Number(x.views)))}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                Top regiões (UF / estado)
              </h2>
            </div>
            {byRegion.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Sem dados de região ainda — aguarde alguns acessos novos pra
                Netlify enviar a geo detalhada.
              </p>
            ) : (
              <div className="space-y-1.5">
                {byRegion.map((r) => (
                  <Row
                    key={`${r.country}-${r.region}`}
                    label={
                      <span className="truncate">
                        <span className="font-mono mr-2 text-[10px] text-muted-foreground">
                          {r.country}/{r.region}
                        </span>
                        {prettyRegion(r.country, r.region)}
                      </span>
                    }
                    value={r.views}
                    sub={`${r.uniques} unique`}
                    max={Math.max(...byRegion.map((x) => Number(x.views)))}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cidades + Dispositivos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Top cidades</h2>
            </div>
            {byCity.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Sem dados de cidade ainda — aguarde alguns acessos novos.
              </p>
            ) : (
              <div className="space-y-1.5">
                {byCity.map((c) => (
                  <Row
                    key={`${c.country}-${c.region}-${c.city}`}
                    label={
                      <span className="truncate">
                        <span className="font-semibold">{c.city}</span>
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          {c.country}/{c.region}
                        </span>
                      </span>
                    }
                    value={c.views}
                    sub={`${c.uniques} unique`}
                    max={Math.max(...byCity.map((x) => Number(x.views)))}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 py-5">
            <h2 className="text-sm font-semibold">Dispositivos</h2>
            <div className="grid grid-cols-3 gap-2">
              <DeviceBox
                icon={Smartphone}
                label="Mobile"
                value={devicesAgg.mobile ?? 0}
              />
              <DeviceBox
                icon={Tablet}
                label="Tablet"
                value={devicesAgg.tablet ?? 0}
              />
              <DeviceBox
                icon={Monitor}
                label="Desktop"
                value={devicesAgg.desktop ?? 0}
              />
            </div>
            <div className="space-y-1.5 border-t border-border/30 pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Top browsers</p>
              {Object.entries(browsersAgg)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([browser, views]) => (
                  <Row
                    key={browser}
                    label={<span className="truncate">{browser}</span>}
                    value={views}
                    max={Math.max(...Object.values(browsersAgg))}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bots */}
      {bots.length > 0 && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Crawlers / Bots ({bots.length} tipos)
              </h2>
              <Badge variant="secondary" className="ml-auto">
                separado do tráfego real
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Inclui Googlebot, Bingbot, Twitterbot, WhatsApp, etc. Muitas visitas de
              bots = SEO funcionando.
            </p>
            <div className="space-y-1.5">
              {bots.map((b) => (
                <Row
                  key={b.browser}
                  label={<span className="truncate">{b.browser}</span>}
                  value={b.views}
                  sub={`${b.paths} páginas distintas`}
                  max={Math.max(...bots.map((x) => Number(x.views)))}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function DeviceBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Smartphone;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 p-3 text-center">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-1 text-lg font-bold tabular-nums">{fmt(value)}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  max,
}: {
  label: React.ReactNode;
  value: number | string | bigint;
  sub?: string;
  max: number;
}) {
  const numValue = typeof value === "string" ? parseInt(value) : Number(value);
  const pct = max > 0 ? (numValue / max) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2 text-xs">
        <div className="min-w-0 flex-1">{label}</div>
        {sub && <span className="shrink-0 text-muted-foreground">{sub}</span>}
        <span className="shrink-0 font-mono tabular-nums">{fmt(value)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("h-full rounded-full bg-primary/50")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function fmt(n: number | string | bigint | undefined | null): string {
  if (n === null || n === undefined) return "0";
  const num = typeof n === "string" ? parseInt(n) : Number(n);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("pt-BR").format(num);
}

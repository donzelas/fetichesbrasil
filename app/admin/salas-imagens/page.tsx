import Link from "next/link";
import { ChevronRight, ImageIcon, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface RoomLite {
  id: string;
  name: string;
  owner_id: string | null;
  deleted_at: string | null;
}

interface ImageMessageRow {
  id: string;
  room_id: string;
  user_id: string;
  image_path: string;
  expires_at: string | null;
  created_at: string;
}

type RangeKey = "24h" | "7d" | "30d" | "all";

const RANGES: { id: RangeKey; label: string; hours: number | null }[] = [
  { id: "24h", label: "Hoje", hours: 24 },
  { id: "7d", label: "7 dias", hours: 24 * 7 },
  { id: "30d", label: "30 dias", hours: 24 * 30 },
  { id: "all", label: "Tudo", hours: null },
];

function parseRange(input: string | undefined): RangeKey {
  const valid = RANGES.map((r) => r.id);
  return (valid as string[]).includes(input ?? "")
    ? (input as RangeKey)
    : "all";
}

export default async function AdminRoomImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const supabase = await createClient();

  const hours = RANGES.find((r) => r.id === range)?.hours ?? null;
  const sinceIso = hours
    ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    : null;

  // Query 1 — todas mensagens com image_path no período
  let query = supabase
    .from("messages")
    .select("id, room_id, user_id, image_path, expires_at, created_at")
    .not("image_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const { data: rowsRaw, error: rowsErr } = await query;
  if (rowsErr) {
    console.error("[admin/salas-imagens] erro ao buscar mensagens:", rowsErr);
  }
  const rows = (rowsRaw ?? []) as ImageMessageRow[];

  // ─── Diagnóstico ─────────────────────────────────────────
  // Roda com Service Role (bypass de RLS) para mostrar a verdade absoluta.
  type DebugRow = { label: string; value: string; ok: boolean };
  const debug: DebugRow[] = [];
  let adminAvailable = false;
  try {
    const admin = createAdminClient();
    adminAvailable = true;

    const [
      { count: cTotalMessages, error: eTotalMessages },
      { count: cImagePath, error: eImagePath },
      { count: cImageUrlLegacy, error: eImageUrlLegacy },
      { count: cExpired, error: eExpired },
      { count: cBucketObjects, error: eBucketObjects },
    ] = await Promise.all([
      admin
        .from("messages")
        .select("*", { count: "exact", head: true }),
      admin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .not("image_path", "is", null),
      admin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .not("image_url", "is", null),
      admin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .not("image_path", "is", null)
        .lt("expires_at", new Date().toISOString()),
      // Conta objetos no bucket direto na tabela storage.objects
      admin
        .schema("storage")
        .from("objects")
        .select("*", { count: "exact", head: true })
        .eq("bucket_id", "room-images"),
    ]);

    debug.push(
      {
        label: "Mensagens (total)",
        value:
          eTotalMessages != null
            ? `erro: ${eTotalMessages.message}`
            : String(cTotalMessages ?? 0),
        ok: eTotalMessages == null,
      },
      {
        label: "Com image_path (novo padrão)",
        value:
          eImagePath != null
            ? `erro: ${eImagePath.message}`
            : String(cImagePath ?? 0),
        ok: eImagePath == null && (cImagePath ?? 0) > 0,
      },
      {
        label: "Com image_url (legado / 0001)",
        value:
          eImageUrlLegacy != null
            ? `erro: ${eImageUrlLegacy.message}`
            : String(cImageUrlLegacy ?? 0),
        ok: eImageUrlLegacy == null,
      },
      {
        label: "Já expiradas (image_path)",
        value:
          eExpired != null
            ? `erro: ${eExpired.message}`
            : String(cExpired ?? 0),
        ok: eExpired == null,
      },
      {
        label: "Arquivos no bucket room-images",
        value:
          eBucketObjects != null
            ? `erro: ${eBucketObjects.message}`
            : String(cBucketObjects ?? 0),
        ok: eBucketObjects == null,
      },
    );
  } catch (e) {
    debug.push({
      label: "Service Role",
      value:
        e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY ausente",
      ok: false,
    });
  }

  if (rowsErr) {
    debug.push({
      label: "Erro listagem (server client)",
      value: rowsErr.message,
      ok: false,
    });
  }

  // Query 2 — salas referenciadas (em separado, robusto contra deleted_at
  // e contra problemas de embedding/RLS no PostgREST)
  const roomIds = Array.from(new Set(rows.map((r) => r.room_id)));
  const roomById = new Map<string, RoomLite>();
  if (roomIds.length > 0) {
    const { data: roomsRaw } = await supabase
      .from("chat_rooms")
      .select("id, name, owner_id, deleted_at")
      .in("id", roomIds);
    for (const r of roomsRaw ?? []) roomById.set(r.id, r as RoomLite);
  }

  type RoomAgg = {
    room: RoomLite;
    total: number;
    expired: number;
    lastAt: string;
  };
  const aggMap = new Map<string, RoomAgg>();
  const now = Date.now();

  for (const r of rows) {
    const room =
      roomById.get(r.room_id) ??
      ({
        id: r.room_id,
        name: "(sala desconhecida)",
        owner_id: null,
        deleted_at: null,
      } as RoomLite);
    const existing = aggMap.get(room.id);
    const isExpired =
      r.expires_at !== null && new Date(r.expires_at).getTime() < now;
    if (existing) {
      existing.total += 1;
      if (isExpired) existing.expired += 1;
      if (r.created_at > existing.lastAt) existing.lastAt = r.created_at;
    } else {
      aggMap.set(room.id, {
        room,
        total: 1,
        expired: isExpired ? 1 : 0,
        lastAt: r.created_at,
      });
    }
  }

  const aggregated = [...aggMap.values()].sort((a, b) =>
    a.lastAt < b.lastAt ? 1 : -1
  );

  const totalImages = rows.length;
  const totalExpired = rows.filter(
    (r) => r.expires_at && new Date(r.expires_at).getTime() < now
  ).length;

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Imagens das salas
        </h1>
        <p className="text-muted-foreground">
          {aggregated.length}{" "}
          {aggregated.length === 1
            ? "sala com imagens"
            : "salas com imagens"}{" "}
          · {totalImages} {totalImages === 1 ? "imagem" : "imagens"}
          {totalExpired > 0 && (
            <>
              {" "}
              ({totalExpired} já expirada{totalExpired === 1 ? "" : "s"} para
              usuários comuns)
            </>
          )}
          · Admin enxerga todas as imagens, inclusive expiradas.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Diagnóstico</p>
            <span className="text-xs text-muted-foreground">
              {adminAvailable
                ? "via Service Role"
                : "Service Role indisponível"}
            </span>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {debug.map((d) => (
              <div
                key={d.label}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-xs",
                  d.ok
                    ? "border-border/40 bg-background/40"
                    : "border-destructive/40 bg-destructive/5 text-destructive"
                )}
              >
                <span className="font-medium text-foreground/80">
                  {d.label}
                </span>
                <span className="font-mono">{d.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Para usar o sistema novo, &quot;Com image_path&quot; precisa ser
            &gt; 0. Se &quot;Com image_url (legado)&quot; tiver número, são
            mensagens da v1 que nunca foram realmente usadas — não aparecem aqui.
          </p>
        </CardContent>
      </Card>

      <nav className="flex flex-wrap gap-1 border-b border-border/60">
        {RANGES.map((r) => {
          const active = r.id === range;
          return (
            <Link
              key={r.id}
              href={`/admin/salas-imagens?range=${r.id}`}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {aggregated.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma imagem enviada no período selecionado.
              </div>
            )}

            {aggregated.map((a) => (
              <Link
                key={a.room.id}
                href={`/admin/salas-imagens/${a.room.id}?range=${range}`}
                className="flex items-center justify-between gap-3 p-4 transition hover:bg-muted/30"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {a.room.name}
                      {a.room.deleted_at && (
                        <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                          sala excluída
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Última imagem {formatRelativeTime(a.lastAt)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-primary">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {a.total}
                  </span>
                  {a.expired > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      {a.expired} expirada{a.expired === 1 ? "" : "s"}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

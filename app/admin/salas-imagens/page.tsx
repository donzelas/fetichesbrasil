import Link from "next/link";
import { ChevronRight, ImageIcon, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

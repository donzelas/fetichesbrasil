import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEED_BUCKET = "feed-images";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Endpoint protegido que serve imagens do feed com marca d'água dinâmica.
 *
 * Pipeline:
 *  1. Valida sessão (usuário logado).
 *  2. Valida autorização: a imagem precisa pertencer a um post aprovado, ao próprio
 *     usuário, ou o requisitante precisa ser admin.
 *  3. Baixa o JPEG do Supabase Storage com service role.
 *  4. Aplica overlay com @username do VIEWER em dois cantos da imagem.
 *  5. Devolve JPEG com cache privado de 5 min (cada usuário vê uma versão única).
 *
 * O resultado é uma imagem "fingerprintada": se vazar, dá pra rastrear quem foi.
 */
export async function GET(
  _req: Request,
  { params }: RouteContext
): Promise<Response> {
  const { path: parts } = await params;
  const storagePath = parts.map((p) => decodeURIComponent(p)).join("/");

  if (!storagePath || storagePath.includes("..")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, is_admin")
    .eq("id", user.id)
    .single();

  const handle =
    profile?.username?.trim() ||
    profile?.display_name?.trim() ||
    `id-${user.id.slice(0, 6)}`;

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, author_id, status")
    .contains("image_paths", [storagePath])
    .is("deleted_at", null)
    .limit(1);

  const post = posts?.[0];
  if (!post) {
    return new NextResponse("Not found", { status: 404 });
  }

  const canView =
    post.status === "approved" ||
    post.author_id === user.id ||
    !!profile?.is_admin;

  if (!canView) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage
    .from(FEED_BUCKET)
    .download(storagePath);

  if (error || !blob) {
    return new NextResponse("Image unavailable", { status: 404 });
  }

  const inputBuffer = Buffer.from(await blob.arrayBuffer());

  try {
    const output = await applyFingerprint(inputBuffer, handle);

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300, must-revalidate",
        "X-Watermark": "fetichesbrasil",
        "X-Robots-Tag": "noindex, noimageindex, nofollow",
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    console.error("[feed-image] watermark failed", err);
    return new NextResponse("Processing error", { status: 500 });
  }
}

/**
 * Aplica overlay SVG com @username em duas posições (topo-esquerdo e
 * inferior-direito). A tarja principal "FETICHESBRASIL.COM.BR" já vem
 * gravada na imagem original via canvas no upload.
 */
async function applyFingerprint(input: Buffer, handle: string): Promise<Buffer> {
  const pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 1280;
  const height = meta.height ?? 1280;

  const handleText = `@${escapeXml(handle).slice(0, 28)}`;
  const fontPx = Math.max(14, Math.round(width * 0.024));
  const padX = Math.round(fontPx * 0.5);
  const padY = Math.round(fontPx * 0.3);
  const approxCharW = fontPx * 0.55;
  const boxW = Math.ceil(handleText.length * approxCharW) + padX * 2;
  const boxH = fontPx + padY * 2;
  const margin = Math.max(10, Math.round(fontPx * 0.6));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        .bg { fill: rgba(0,0,0,0.65); }
        .br { fill: none; stroke: rgba(236,72,153,0.9); stroke-width: ${Math.max(
          1,
          Math.round(fontPx * 0.06)
        )}; }
        .tx {
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 800;
          font-size: ${fontPx}px;
          fill: #ffffff;
          letter-spacing: 0.5px;
        }
      </style>

      <!-- topo esquerdo -->
      <rect class="bg" x="${margin}" y="${margin}" rx="6" ry="6"
            width="${boxW}" height="${boxH}" />
      <rect class="br" x="${margin}" y="${margin}" rx="6" ry="6"
            width="${boxW}" height="${boxH}" />
      <text class="tx" x="${margin + padX}" y="${margin + padY + fontPx * 0.82}">${handleText}</text>

      <!-- inferior direito -->
      <rect class="bg" x="${width - boxW - margin}" y="${height - boxH - margin}"
            rx="6" ry="6" width="${boxW}" height="${boxH}" />
      <rect class="br" x="${width - boxW - margin}" y="${height - boxH - margin}"
            rx="6" ry="6" width="${boxW}" height="${boxH}" />
      <text class="tx"
            x="${width - boxW - margin + padX}"
            y="${height - boxH - margin + padY + fontPx * 0.82}">${handleText}</text>
    </svg>
  `;

  return await pipeline
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

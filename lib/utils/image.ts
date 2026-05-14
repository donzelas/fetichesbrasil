"use client";

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
  watermark?: boolean | WatermarkOptions;
}

export interface WatermarkOptions {
  text?: string;
  bandOpacity?: number;
  fontScale?: number;
}

/**
 * Lê um File de imagem, redimensiona para caber em `maxDimension` (px no maior lado)
 * e re-codifica em JPEG (ou WebP) com qualidade configurável. Mantém EXIF strippado.
 *
 * Default: 1280px / JPEG 0.8 → tipicamente 80–250kB.
 *
 * Quando `watermark` é truthy (default true), grava uma tarja opaca com o texto
 * `FETICHESBRASIL.COM.BR` no centro e no canto inferior esquerdo da imagem,
 * cobrindo qualquer marca d'água preexistente.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<Blob> {
  const {
    maxDimension = 1280,
    quality = 0.8,
    mimeType = "image/jpeg",
    watermark = true,
  } = opts;

  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo não é uma imagem.");
  }

  const bitmap = await loadBitmap(file);

  const { width, height } = fitInside(bitmap.width, bitmap.height, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  ctx.drawImage(bitmap, 0, 0, width, height);

  if ("close" in bitmap && typeof (bitmap as ImageBitmap).close === "function") {
    (bitmap as ImageBitmap).close();
  }

  if (watermark) {
    applyWatermark(canvas, typeof watermark === "object" ? watermark : {});
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar blob."))),
      mimeType,
      quality
    )
  );

  return blob;
}

/**
 * Desenha uma tarja opaca colada no texto (sem extensão extra), alinhada
 * à direita e verticalmente centralizada.
 *
 * A largura do retângulo é exatamente a largura do texto + um pequeno
 * padding mínimo. O tamanho da fonte é mantido (controlado por `fontScale`).
 *
 * Fundo opaco (alpha ≥ 0.85) cobre completamente qualquer marca preexistente.
 */
export function applyWatermark(
  canvas: HTMLCanvasElement,
  opts: WatermarkOptions = {}
) {
  const {
    text = "FETICHESBRASIL.COM.BR",
    bandOpacity = 0.88,
    fontScale = 0.028,
  } = opts;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const fontPx = Math.max(12, Math.round(W * fontScale));
  const padX = Math.round(fontPx * 1.6);
  const padY = Math.round(fontPx * 0.05);

  ctx.font = `800 ${fontPx}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const bandW = textW + padX * 2;
  const bandH = fontPx + padY * 2;

  const margin = 0;
  const left = W - margin - bandW;
  const top = H / 2 - bandH / 2;

  ctx.save();

  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = Math.max(3, fontPx * 0.25);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, fontPx * 0.05);

  ctx.fillStyle = `rgba(0, 0, 0, ${bandOpacity})`;
  ctx.fillRect(left, top, bandW, bandH);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const grad = ctx.createLinearGradient(left, 0, left + bandW, 0);
  grad.addColorStop(0, "rgba(236, 72, 153, 0.95)");
  grad.addColorStop(1, "rgba(168, 85, 247, 0.95)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(1, Math.round(fontPx * 0.08));
  ctx.strokeRect(left, top, bandW, bandH);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(text, left + bandW / 2, H / 2);
  ctx.restore();
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fallback
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Falha ao carregar imagem."));
      i.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function fitInside(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w / h;
  if (w >= h) {
    return { width: max, height: Math.round(max / ratio) };
  }
  return { width: Math.round(max * ratio), height: max };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

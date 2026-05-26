"""
Monta video final 9:16 (1080x1920) com b-rolls + audio + legendas
usando FFmpeg, e sobe o MP4 final pro Supabase Storage (bucket
'tiktok-videos') para o admin poder baixar/preview pelo painel.

Le configuracoes de legenda da tabela tiktok_settings (singleton)
e aplica override do video_config (jsonb) do proprio script se existir.

Uso:
    python montar_video.py <script_id>
"""
import mimetypes
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

from utils.supabase_client import get_client
from utils.logger import log
from utils.progress import set_progress, finish_pipeline

load_dotenv()

OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/output"))
STORAGE_BUCKET = "tiktok-videos"

# Defaults usados se nao houver tiktok_settings (failsafe)
DEFAULT_CONFIG = {
    "font_name": "Arial",
    "font_size": 22,
    "font_bold": True,
    "font_color": "FFFFFF",
    "outline_color": "000000",
    "outline_width": 3,
    "shadow": 0,
    "alignment": 2,
    "margin_v": 280,
    "margin_l": 60,
    "margin_r": 60,
    "video_width": 1080,
    "video_height": 1920,
    "video_fps": 30,
    "video_crf": 21,
}


def carregar_config(sb, script: dict) -> dict:
    """Carrega tiktok_settings + override por script."""
    config = dict(DEFAULT_CONFIG)
    try:
        resp = sb.table("tiktok_settings").select("*").single().execute()
        if resp.data:
            for k in DEFAULT_CONFIG:
                if k in resp.data and resp.data[k] is not None:
                    config[k] = resp.data[k]
    except Exception as e:
        log(f"aviso: nao foi possivel ler tiktok_settings ({e}), usando defaults")

    override = script.get("video_config") or {}
    if isinstance(override, dict):
        config.update(override)
    return config


def hex_to_ass(hex_str: str) -> str:
    """Converte FFFFFF para formato ASS &HBBGGRR."""
    h = hex_str.strip().lstrip("#").upper().zfill(6)
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H00{b}{g}{r}"


def obter_duracao(arquivo: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(arquivo),
        ],
        text=True,
    )
    return float(out.strip())


def concatenar_brolls(broll_paths: list[str], duracao_total: float, destino: Path, config: dict):
    """Pre-processa cada b-roll cortando pra duracao certa e padronizando
    resolucao/fps, depois concatena. Muito mais rapido que concat com
    re-encoding total porque cada clip e processado isoladamente."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    qtd = len(broll_paths)
    if qtd == 0:
        raise RuntimeError("nenhum b-roll fornecido")

    w = int(config["video_width"])
    h = int(config["video_height"])
    fps = int(config["video_fps"])

    # Cada clip dura igual o tempo necessario pra cobrir o audio + 1s buffer
    duracao_por_clip = (duracao_total + 1.0) / qtd
    duracao_por_clip = max(2.0, min(8.0, duracao_por_clip))  # entre 2 e 8s

    log(f"  pre-processando {qtd} clips ({duracao_por_clip:.1f}s cada)")

    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},fps={fps},setsar=1"
    )

    clips_processados: list[Path] = []
    for i, p in enumerate(broll_paths):
        clip_dest = OUTPUT_DIR / f"_clip_{destino.stem}_{i}.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-ss", "0",
            "-t", f"{duracao_por_clip:.2f}",
            "-i", str(p),
            "-vf", vf,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
            "-pix_fmt", "yuv420p",
            "-an",
            str(clip_dest),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        clips_processados.append(clip_dest)

    log(f"  concatenando clips...")
    lista_txt = OUTPUT_DIR / f"concat_{destino.stem}.txt"
    with open(lista_txt, "w", encoding="utf-8") as f:
        for clip in clips_processados:
            f.write(f"file '{clip.as_posix()}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(lista_txt),
        "-c", "copy",
        str(destino),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Limpa clips temporarios
    for clip in clips_processados:
        clip.unlink(missing_ok=True)
    lista_txt.unlink(missing_ok=True)


def montar_final(broll_concat: Path, audio: Path, srt: Path, destino: Path, config: dict):
    srt_escape = str(srt.as_posix()).replace(":", "\\:").replace("'", "\\'")

    # PlayResX/PlayResY fixam a escala das margens. Sem isso, ASS usa
    # PlayResY=288 default e MarginV=140 cai no MEIO do video. Por isso
    # o bug das legendas no centro.
    w = int(config["video_width"])
    h = int(config["video_height"])
    fps = int(config["video_fps"])
    crf = int(config["video_crf"])

    style_parts = [
        f"Fontname={config['font_name']}",
        f"Fontsize={int(config['font_size'])}",
        f"Bold={1 if config.get('font_bold') else 0}",
        "BorderStyle=1",
        f"Outline={int(config['outline_width'])}",
        f"Shadow={int(config['shadow'])}",
        f"Alignment={int(config['alignment'])}",
        f"MarginV={int(config['margin_v'])}",
        f"MarginL={int(config['margin_l'])}",
        f"MarginR={int(config['margin_r'])}",
        f"PrimaryColour={hex_to_ass(config['font_color'])}",
        f"OutlineColour={hex_to_ass(config['outline_color'])}",
        f"PlayResX={w}",
        f"PlayResY={h}",
    ]
    force_style = ",".join(style_parts)
    sub_filter = f"subtitles='{srt_escape}':force_style='{force_style}'"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(broll_concat),
        "-i", str(audio),
        "-vf", sub_filter,
        "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
        "-r", str(fps),
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        str(destino),
    ]
    subprocess.run(cmd, check=True)


def main(script_id: str):
    sb = get_client()
    resp = sb.table("tiktok_scripts").select("*").eq("id", script_id).single().execute()
    script = resp.data
    if not script:
        log(f"script {script_id} nao encontrado")
        return

    try:
        set_progress(script_id, "Montando vídeo com FFmpeg...")

        audio = Path(script["audio_path"])
        srt = Path(script["srt_path"])
        brolls = script["broll_paths"] or []

        if not audio.exists():
            raise FileNotFoundError(f"audio nao existe: {audio}")
        if not srt.exists():
            raise FileNotFoundError(f"srt nao existe: {srt}")
        if not brolls:
            raise RuntimeError("nenhum b-roll baixado")

        duracao = obter_duracao(audio)
        log(f"audio dura {duracao:.1f}s, montando com {len(brolls)} b-rolls")

        config = carregar_config(sb, script)
        log(
            f"config: {config['video_width']}x{config['video_height']} "
            f"fonte={config['font_name']} tam={config['font_size']} "
            f"align={config['alignment']} mV={config['margin_v']}"
        )

        concat = OUTPUT_DIR / f"{script_id}_broll.mp4"
        final = OUTPUT_DIR / f"{script_id}_final.mp4"

        concatenar_brolls(brolls, duracao, concat, config)

        set_progress(script_id, "Renderizando legendas no vídeo...")
        montar_final(concat, audio, srt, final, config)

        # Upload pro Supabase Storage para o admin poder ver/baixar
        set_progress(script_id, "Subindo vídeo pro storage...")
        storage_path = f"{script_id}/final.mp4"
        log(f"subindo pro storage: {storage_path}")
        with open(final, "rb") as f:
            sb.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=f.read(),
                file_options={
                    "content-type": mimetypes.guess_type(str(final))[0] or "video/mp4",
                    "upsert": "true",
                },
            )

        sb.table("tiktok_scripts").update(
            {
                "video_path": storage_path,
                "status": "ready_to_post",
                "progress_message": None,
            }
        ).eq("id", script_id).execute()
        log(f"video final em {final} (storage: {storage_path})")
    except Exception as e:
        sb.table("tiktok_scripts").update(
            {"status": "failed", "failure_reason": f"montar_video: {e}"}
        ).eq("id", script_id).execute()
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python montar_video.py <script_id>")
        sys.exit(1)
    main(sys.argv[1])

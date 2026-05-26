"""
Transcreve o audio gerado em SRT usando Groq Whisper API
(whisper-large-v3-turbo, gratuito, sem precisar container).

Fallback automatico pro container faster-whisper local se WHISPER_URL
estiver definida e Groq falhar.

Uso:
    python transcrever.py <script_id>
"""
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

from utils.supabase_client import get_client
from utils.logger import log
from utils.progress import set_progress

load_dotenv()

GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = os.environ.get("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")

WHISPER_LOCAL_URL = os.environ.get("WHISPER_URL")  # opcional, fallback


def _format_srt_time(segundos: float) -> str:
    horas = int(segundos // 3600)
    minutos = int((segundos % 3600) // 60)
    secs = int(segundos % 60)
    ms = int(round((segundos - int(segundos)) * 1000))
    return f"{horas:02d}:{minutos:02d}:{secs:02d},{ms:03d}"


def _segments_to_srt(segments: list[dict], words_per_chunk: int = 5, uppercase: bool = True) -> str:
    """Converte segments do Whisper (verbose_json) em SRT.
    Quebra segments longos em linhas curtas pra ficar estilo TikTok
    (legenda aparecendo conforme fala)."""
    linhas: list[str] = []
    idx = 1
    tam_chunk = max(2, int(words_per_chunk))
    for seg in segments:
        texto = (seg.get("text") or "").strip()
        if not texto:
            continue
        start = float(seg["start"])
        end = float(seg["end"])

        palavras = texto.split()
        if len(palavras) <= tam_chunk + 1:
            chunks = [(start, end, texto)]
        else:
            n_chunks = (len(palavras) + tam_chunk - 1) // tam_chunk
            dur_chunk = (end - start) / n_chunks
            chunks = []
            for i in range(n_chunks):
                cs = start + i * dur_chunk
                ce = start + (i + 1) * dur_chunk
                chunk_palavras = palavras[i * tam_chunk : (i + 1) * tam_chunk]
                chunks.append((cs, ce, " ".join(chunk_palavras)))

        for cs, ce, txt in chunks:
            linhas.append(str(idx))
            linhas.append(f"{_format_srt_time(cs)} --> {_format_srt_time(ce)}")
            linhas.append(txt.upper() if uppercase else txt)
            linhas.append("")
            idx += 1
    return "\n".join(linhas)


def carregar_legenda_config(sb) -> tuple[int, bool]:
    """Retorna (words_per_chunk, uppercase) da tabela tiktok_settings."""
    try:
        resp = sb.table("tiktok_settings").select("words_per_chunk, uppercase").single().execute()
        if resp.data:
            return (
                int(resp.data.get("words_per_chunk") or 5),
                bool(resp.data.get("uppercase", True)),
            )
    except Exception:
        pass
    return (5, True)


def transcrever_via_groq(audio_path: Path, words_per_chunk: int, uppercase: bool) -> str:
    """Retorna SRT convertendo verbose_json da Groq Whisper API."""
    key = os.environ["GROQ_API_KEY"]
    with open(audio_path, "rb") as f:
        r = requests.post(
            GROQ_WHISPER_URL,
            headers={"Authorization": f"Bearer {key}"},
            files={"file": (audio_path.name, f, "audio/mpeg")},
            data={
                "model": GROQ_WHISPER_MODEL,
                "language": "pt",
                "response_format": "verbose_json",
                "temperature": "0",
            },
            timeout=120,
        )
    r.raise_for_status()
    data = r.json()
    segments = data.get("segments") or []
    if not segments:
        return data.get("text", "")
    return _segments_to_srt(segments, words_per_chunk, uppercase)


def transcrever_via_local(audio_path: Path) -> str:
    """Fallback: container faster-whisper rodando localmente."""
    if not WHISPER_LOCAL_URL:
        raise RuntimeError("WHISPER_URL nao configurada para fallback local")
    with open(audio_path, "rb") as f:
        r = requests.post(
            WHISPER_LOCAL_URL,
            params={"output": "srt", "language": "pt", "task": "transcribe"},
            files={"audio_file": f},
            timeout=600,
        )
    r.raise_for_status()
    return r.text


def main(script_id: str):
    sb = get_client()
    resp = sb.table("tiktok_scripts").select("*").eq("id", script_id).single().execute()
    script = resp.data
    if not script or not script.get("audio_path"):
        log(f"audio nao encontrado pro script {script_id}")
        return

    try:
        set_progress(script_id, "Transcrevendo áudio (gerando legendas)...")

        audio_path = Path(script["audio_path"])
        words_per_chunk, uppercase = carregar_legenda_config(sb)
        log(f"transcrevendo {audio_path} (chunks={words_per_chunk}, upper={uppercase})")

        try:
            srt_text = transcrever_via_groq(audio_path, words_per_chunk, uppercase)
            log(f"transcrito via Groq ({GROQ_WHISPER_MODEL})")
        except Exception as e:
            log(f"Groq falhou ({e}), tentando container local")
            srt_text = transcrever_via_local(audio_path)
            log("transcrito via container local")

        srt_path = audio_path.with_suffix(".srt")
        srt_path.write_text(srt_text, encoding="utf-8")
        sb.table("tiktok_scripts").update(
            {"srt_path": str(srt_path), "status": "srt_done"}
        ).eq("id", script_id).execute()
        log(f"srt salvo em {srt_path}")
    except Exception as e:
        sb.table("tiktok_scripts").update(
            {"status": "failed", "failure_reason": f"transcrever: {e}"}
        ).eq("id", script_id).execute()
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python transcrever.py <script_id>")
        sys.exit(1)
    main(sys.argv[1])

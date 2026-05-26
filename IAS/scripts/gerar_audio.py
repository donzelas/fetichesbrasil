"""
Gera audio MP3 a partir do roteiro usando Microsoft Edge-TTS.
Sem rate limit, vozes neurais brasileiras, custo zero.

Uso:
    python gerar_audio.py <script_id>
"""
import asyncio
import os
import sys
from pathlib import Path

import edge_tts
from dotenv import load_dotenv

from utils.supabase_client import get_client
from utils.logger import log
from utils.progress import set_progress

load_dotenv()

OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/output"))


async def gerar_mp3(texto: str, voz: str, saida: Path, taxa: str = "+15%"):
    communicate = edge_tts.Communicate(text=texto, voice=voz, rate=taxa)
    await communicate.save(str(saida))


def montar_texto(script: dict) -> str:
    partes = [
        (script.get("hook") or "").strip(),
        (script.get("corpo") or "").strip(),
        (script.get("cta") or "").strip(),
    ]
    return ". ".join(p for p in partes if p)


async def main(script_id: str):
    sb = get_client()
    resp = sb.table("tiktok_scripts").select("*").eq("id", script_id).single().execute()
    script = resp.data
    if not script:
        log(f"script {script_id} nao encontrado")
        return

    set_progress(script_id, "Gerando áudio com voz neural...", status="processing")

    try:
        texto = montar_texto(script)
        voz = script.get("voz") or "pt-BR-FranciscaNeural"

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        saida = OUTPUT_DIR / f"{script_id}.mp3"

        log(f"gerando audio com voz {voz} ({len(texto)} chars)")
        await gerar_mp3(texto, voz, saida)

        sb.table("tiktok_scripts").update(
            {"audio_path": str(saida), "status": "audio_done"}
        ).eq("id", script_id).execute()
        log(f"audio salvo em {saida}")
    except Exception as e:
        sb.table("tiktok_scripts").update(
            {"status": "failed", "failure_reason": f"gerar_audio: {e}"}
        ).eq("id", script_id).execute()
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python gerar_audio.py <script_id>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))

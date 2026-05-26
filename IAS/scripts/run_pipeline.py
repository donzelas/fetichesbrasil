"""
Executa o pipeline completo de producao de video para um script_id.
Util pra testar sem precisar do n8n rodando.

Pula a etapa de postar no TikTok se TIKTOK_ACCESS_TOKEN nao estiver
configurado (deixa o video em ready_to_post pro admin baixar pelo painel).

Uso:
    python run_pipeline.py <script_id>
    python run_pipeline.py --next      # pega o proximo aprovado e roda
"""
import os
import sys
import asyncio
from pathlib import Path

from dotenv import load_dotenv

from utils.supabase_client import get_client
from utils.logger import log
from utils.progress import start_pipeline

load_dotenv()

import gerar_audio
import baixar_broll
import transcrever
import montar_video


def pegar_proximo_aprovado() -> str | None:
    sb = get_client()
    resp = (
        sb.table("tiktok_scripts")
        .select("id, titulo")
        .eq("status", "approved")
        .order("approved_at", desc=False)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return None
    log(f"proximo aprovado: {resp.data[0]['titulo']}")
    return resp.data[0]["id"]


def main(script_id: str | None):
    if not script_id:
        script_id = pegar_proximo_aprovado()
        if not script_id:
            log("nenhum script com status=approved")
            return

    log(f"=== PIPELINE PARA {script_id} ===")
    start_pipeline(script_id)

    log("\n--- 1/4: GERANDO AUDIO ---")
    asyncio.run(gerar_audio.main(script_id))

    log("\n--- 2/4: BAIXANDO B-ROLL ---")
    baixar_broll.main(script_id)

    log("\n--- 3/4: TRANSCREVENDO ---")
    transcrever.main(script_id)

    log("\n--- 4/4: MONTANDO VIDEO ---")
    montar_video.main(script_id)

    log("\n=== PIPELINE COMPLETO ===")
    log("Video pronto em /output e no bucket tiktok-videos.")

    if os.environ.get("TIKTOK_ACCESS_TOKEN"):
        log("\n--- BONUS: POSTANDO NO TIKTOK ---")
        import postar_tiktok
        postar_tiktok.main(script_id)
    else:
        log("TIKTOK_ACCESS_TOKEN nao configurado - pulando postagem.")
        log("Admin pode baixar o video pelo painel /admin/tiktok.")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    if arg == "--next":
        main(None)
    else:
        main(arg)

"""
Posta video pronto no TikTok via Content Posting API.

IMPORTANTE: Por padrao, contas nao auditadas so podem usar o
endpoint "/inbox/video/init/" - o video cai na caixa de entrada
do TikTok pra usuario revisar e publicar manualmente.

Pra publicar direto sem revisao manual, sua app precisa ser
auditada pelo TikTok com o escopo "video.publish".

Uso:
    python postar_tiktok.py <script_id>
"""
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

from utils.supabase_client import get_client
from utils.logger import log

load_dotenv()

TIKTOK_BASE = "https://open.tiktokapis.com/v2"
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/output"))


def init_inbox_upload(token: str, video_size: int) -> dict:
    """Inicia upload no inbox (sem auditoria)."""
    url = f"{TIKTOK_BASE}/post/publish/inbox/video/init/"
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": video_size,
                "chunk_size": video_size,
                "total_chunk_count": 1,
            }
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["data"]


def upload_chunk(upload_url: str, video_path: Path):
    size = video_path.stat().st_size
    with open(video_path, "rb") as f:
        r = requests.put(
            upload_url,
            data=f,
            headers={
                "Content-Type": "video/mp4",
                "Content-Length": str(size),
                "Content-Range": f"bytes 0-{size - 1}/{size}",
            },
            timeout=600,
        )
    r.raise_for_status()


def main(script_id: str):
    sb = get_client()
    resp = sb.table("tiktok_scripts").select("*").eq("id", script_id).single().execute()
    script = resp.data
    if not script:
        log(f"script {script_id} nao encontrado")
        return

    # video local fica em OUTPUT_DIR/<script_id>_final.mp4
    # (o video_path no DB e o storage_path no Supabase)
    video = OUTPUT_DIR / f"{script_id}_final.mp4"
    if not video.exists():
        raise FileNotFoundError(
            f"arquivo local nao existe: {video}. "
            f"Rode montar_video.py {script_id} primeiro."
        )

    token = os.environ["TIKTOK_ACCESS_TOKEN"]

    try:
        log(f"iniciando upload no tiktok inbox ({video.stat().st_size} bytes)")
        init = init_inbox_upload(token, video.stat().st_size)
        upload_chunk(init["upload_url"], video)

        log("upload concluido. video aguarda revisao manual no app TikTok.")
        sb.table("tiktok_scripts").update(
            {
                "status": "posted_inbox",
                "tiktok_publish_id": init["publish_id"],
                "posted_at": "now()",
            }
        ).eq("id", script_id).execute()

        fetiche_id = script.get("fetiche_id")
        if fetiche_id:
            sb.table("fetishes").update({"used_in_tiktok_at": "now()"}).eq(
                "id", fetiche_id
            ).execute()
    except Exception as e:
        sb.table("tiktok_scripts").update(
            {"status": "failed", "failure_reason": f"postar_tiktok: {e}"}
        ).eq("id", script_id).execute()
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python postar_tiktok.py <script_id>")
        sys.exit(1)
    main(sys.argv[1])

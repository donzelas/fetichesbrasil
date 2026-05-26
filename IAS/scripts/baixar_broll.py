"""
Baixa videos de b-roll do Pexels baseado nas tags do roteiro.

- Cacheia por tag pra reusar entre videos (economiza rate limit)
- Sortea pagina aleatoria do Pexels (1-5) pra trazer variedade
- Apos baixar, embaralha o cache da tag e seleciona aleatorio
- Assim videos sobre mesmo tema NAO ficam iguais

Uso:
    python baixar_broll.py <script_id>
"""
import os
import random
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

from utils.supabase_client import get_client
from utils.logger import log
from utils.progress import set_progress

load_dotenv()

PEXELS_URL = "https://api.pexels.com/videos/search"
PIXABAY_URL = "https://pixabay.com/api/videos/"
CACHE_DIR = Path(os.environ.get("BROLL_CACHE_DIR", "/broll_cache"))
QTD_POR_TAG = 3
QTD_MAX_TOTAL = 5
MAX_PEXELS_PAGES = 5


def buscar_no_pexels(tag: str, qtd: int) -> list[dict]:
    headers = {"Authorization": os.environ["PEXELS_API_KEY"]}
    # Pagina aleatoria 1-5 pra trazer videos diferentes a cada chamada
    page = random.randint(1, MAX_PEXELS_PAGES)
    params = {
        "query": tag,
        "per_page": qtd,
        "page": page,
        "orientation": "portrait",
        "size": "medium",
    }
    r = requests.get(PEXELS_URL, headers=headers, params=params, timeout=15)
    r.raise_for_status()
    videos = []
    for v in r.json().get("videos", []):
        files = sorted(v["video_files"], key=lambda f: abs(f.get("height", 0) - 1280))
        if files:
            videos.append({"id": v["id"], "url": files[0]["link"]})
    # Se nao retornou nada (pagina muito alta), tenta pagina 1
    if not videos and page > 1:
        params["page"] = 1
        r = requests.get(PEXELS_URL, headers=headers, params=params, timeout=15)
        r.raise_for_status()
        for v in r.json().get("videos", []):
            files = sorted(v["video_files"], key=lambda f: abs(f.get("height", 0) - 1280))
            if files:
                videos.append({"id": v["id"], "url": files[0]["link"]})
    return videos


def selecionar_do_cache(tag_dir: Path, qtd: int) -> list[Path]:
    """Pega arquivos ja baixados na pasta da tag, embaralhados."""
    if not tag_dir.exists():
        return []
    arquivos = [p for p in tag_dir.glob("*.mp4") if p.stat().st_size > 0]
    random.shuffle(arquivos)
    return arquivos[:qtd]


def buscar_no_pixabay(tag: str, qtd: int) -> list[dict]:
    params = {
        "key": os.environ["PIXABAY_API_KEY"],
        "q": tag,
        "per_page": max(3, qtd),
        "video_type": "all",
    }
    r = requests.get(PIXABAY_URL, params=params, timeout=15)
    r.raise_for_status()
    videos = []
    for v in r.json().get("hits", [])[:qtd]:
        url = v["videos"].get("medium", {}).get("url") or v["videos"].get("small", {}).get("url")
        if url:
            videos.append({"id": v["id"], "url": url})
    return videos


def baixar(url: str, destino: Path) -> Path | None:
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    try:
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            destino.parent.mkdir(parents=True, exist_ok=True)
            with open(destino, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        return destino
    except Exception as e:
        log(f"falha ao baixar {url}: {e}")
        return None


def main(script_id: str):
    sb = get_client()
    resp = sb.table("tiktok_scripts").select("*").eq("id", script_id).single().execute()
    script = resp.data
    if not script:
        log(f"script {script_id} nao encontrado")
        return

    try:
        tags = list(script.get("broll_tags") or [])
        random.shuffle(tags)  # ordem aleatoria das tags

        if not tags:
            raise RuntimeError("script nao tem broll_tags definidas")

        set_progress(script_id, f"Baixando b-rolls do Pexels ({len(tags)} tags)...")

        paths: list[str] = []

        # 1) Baixa novos do Pexels (com pagina aleatoria pra variar)
        for tag in tags:
            tag_dir = CACHE_DIR / tag.replace(" ", "_").lower()
            try:
                videos = buscar_no_pexels(tag, QTD_POR_TAG)
            except Exception as e:
                log(f"pexels falhou para '{tag}' ({e}), tentando pixabay")
                try:
                    videos = buscar_no_pixabay(tag, QTD_POR_TAG)
                except Exception as e2:
                    log(f"pixabay tambem falhou para '{tag}' ({e2})")
                    videos = []
            for v in videos:
                destino = tag_dir / f"{v['id']}.mp4"
                baixar(v["url"], destino)

        # 2) Escolhe ALEATORIAMENTE do cache (incluindo os novos baixados)
        #    Assim cada video usa b-rolls diferentes mesmo com tags iguais
        seen: set[str] = set()
        for tag in tags:
            if len(paths) >= QTD_MAX_TOTAL:
                break
            tag_dir = CACHE_DIR / tag.replace(" ", "_").lower()
            candidatos = selecionar_do_cache(tag_dir, qtd=2)
            for p in candidatos:
                if len(paths) >= QTD_MAX_TOTAL:
                    break
                key = str(p)
                if key in seen:
                    continue
                seen.add(key)
                paths.append(key)
                log(f"selecionado: {p.name} (tag: {tag})")

        if not paths:
            raise RuntimeError(
                "nenhum b-roll baixado - tags podem ser muito especificas. "
                f"Tags: {tags}"
            )

        sb.table("tiktok_scripts").update(
            {"broll_paths": paths, "status": "broll_done"}
        ).eq("id", script_id).execute()
        log(f"total {len(paths)} b-rolls prontos")
    except Exception as e:
        sb.table("tiktok_scripts").update(
            {"status": "failed", "failure_reason": f"baixar_broll: {e}"}
        ).eq("id", script_id).execute()
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python baixar_broll.py <script_id>")
        sys.exit(1)
    main(sys.argv[1])

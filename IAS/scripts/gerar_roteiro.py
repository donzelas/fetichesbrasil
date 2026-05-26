"""
Gera roteiro de TikTok em algospeak BR usando Groq (Llama 3.3 70B).
Fallback automatico pra Gemini se Groq estourar rate limit.

Uso:
    python gerar_roteiro.py
    python gerar_roteiro.py --fetiche-id <uuid>
    python gerar_roteiro.py --tema "depilacao"
    python gerar_roteiro.py --tema "primeira vez" --categoria "Tabu"
"""
import argparse
import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
import google.generativeai as genai

from utils.supabase_client import get_client
from utils.logger import log

load_dotenv()

GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "roteiro_tiktok_master.txt"


def pegar_proximo_fetiche():
    """Pega 1 fetiche que ainda nao virou roteiro TikTok."""
    sb = get_client()
    resp = (
        sb.table("fetishes")
        .select("id, name, slug, category:categories(name)")
        .is_("used_in_tiktok_at", "null")
        .limit(1)
        .execute()
    )
    if not resp.data:
        log("nenhum fetiche disponivel - todos ja foram usados")
        return None
    return resp.data[0]


def pegar_fetiche_por_id(fetiche_id: str):
    """Pega fetiche especifico por UUID."""
    sb = get_client()
    resp = (
        sb.table("fetishes")
        .select("id, name, slug, category:categories(name)")
        .eq("id", fetiche_id)
        .single()
        .execute()
    )
    return resp.data


def montar_tema_custom(tema: str, categoria: str | None = None) -> dict:
    """Cria um fetiche-like dict pra temas que nao estao na lista oficial."""
    return {
        "id": None,
        "name": tema,
        "slug": None,
        "category": {"name": categoria or "Tema livre"},
    }


def montar_prompt(fetiche: dict) -> str:
    template = PROMPT_PATH.read_text(encoding="utf-8")
    categoria = fetiche["category"]["name"] if fetiche.get("category") else "Geral"
    return template.format(
        nome_fetiche=fetiche["name"],
        categoria=categoria,
    )


def gerar_com_groq(prompt: str) -> str:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.9,
        max_tokens=1500,
    )
    return resp.choices[0].message.content or ""


def gerar_com_gemini(prompt: str) -> str:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(GEMINI_MODEL)
    resp = model.generate_content(prompt)
    return resp.text or ""


def gerar_roteiro(prompt: str) -> tuple[str, str, str]:
    """Retorna (raw_text, provider, model)."""
    try:
        log("tentando groq...")
        return gerar_com_groq(prompt), "groq", GROQ_MODEL
    except Exception as e:
        log(f"groq falhou ({e}), fallback gemini")
        time.sleep(2)
        return gerar_com_gemini(prompt), "gemini", GEMINI_MODEL


def extrair_json(raw: str) -> dict:
    inicio = raw.find("{")
    fim = raw.rfind("}") + 1
    if inicio < 0 or fim <= 0:
        raise ValueError(f"JSON nao encontrado na resposta: {raw[:200]}")
    return json.loads(raw[inicio:fim])


def salvar_roteiro(fetiche_id: str, roteiro: dict, provider: str, model: str):
    sb = get_client()
    sb.table("tiktok_scripts").insert(
        {
            "fetiche_id": fetiche_id,
            "titulo": roteiro["titulo"],
            "hook": roteiro["hook"],
            "corpo": roteiro["corpo"],
            "cta": roteiro["cta"],
            "hashtags": roteiro["hashtags"],
            "broll_tags": roteiro["broll_tags"],
            "voz": roteiro.get("voz", "pt-BR-FranciscaNeural"),
            "llm_provider": provider,
            "llm_model": model,
            "status": "pending_approval",
        }
    ).execute()


def main(fetiche_id: str | None = None, tema: str | None = None, categoria: str | None = None):
    if tema:
        fetiche = montar_tema_custom(tema, categoria)
        log(f"gerando roteiro para tema livre: {tema}")
    elif fetiche_id:
        fetiche = pegar_fetiche_por_id(fetiche_id)
        if not fetiche:
            log(f"fetiche {fetiche_id} nao encontrado")
            return
        log(f"gerando roteiro para fetiche escolhido: {fetiche['name']}")
    else:
        fetiche = pegar_proximo_fetiche()
        if not fetiche:
            return
        log(f"gerando roteiro para fetiche sorteado: {fetiche['name']}")

    prompt = montar_prompt(fetiche)
    raw, provider, model = gerar_roteiro(prompt)
    roteiro = extrair_json(raw)
    salvar_roteiro(fetiche["id"], roteiro, provider, model)
    log(f"roteiro salvo via {provider}/{model}: {roteiro['titulo']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetiche-id", help="UUID do fetiche especifico")
    parser.add_argument("--tema", help="Tema livre (qualquer assunto, nao precisa estar na lista)")
    parser.add_argument("--categoria", help="Categoria para o tema livre (ex: Tabu, BDSM)")
    args = parser.parse_args()
    main(fetiche_id=args.fetiche_id, tema=args.tema, categoria=args.categoria)

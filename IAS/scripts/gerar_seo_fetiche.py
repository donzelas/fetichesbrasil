"""
Gera conteudo SEO unico (~1500 palavras) para uma ou todas as
paginas de fetiche, usando Groq Llama 3.3 70B com fallback Gemini.

Uso:
    python gerar_seo_fetiche.py --slug dominacao
    python gerar_seo_fetiche.py --pending         # gera so os faltantes
    python gerar_seo_fetiche.py --all --force     # regenera todos
    python gerar_seo_fetiche.py --pending --limit 5

Rate limit Groq: 30 req/min. Pra 100 fetiches leva ~4 minutos.
"""
import argparse
import json
import os
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
PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "seo_fetiche_master.txt"

# Pra nao bater no rate limit (30 req/min do Groq)
DELAY_BETWEEN_CALLS = 2.5


def gerar_com_groq(prompt: str) -> str:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=8000,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or ""


def gerar_com_gemini(prompt: str) -> str:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(GEMINI_MODEL)
    resp = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.8,
            "max_output_tokens": 8000,
            "response_mime_type": "application/json",
        },
    )
    return resp.text or ""


def gerar_seo(prompt: str) -> tuple[str, str, str]:
    try:
        return gerar_com_groq(prompt), "groq", GROQ_MODEL
    except Exception as e:
        log(f"  groq falhou ({type(e).__name__}: {e}), fallback gemini")
        time.sleep(2)
        return gerar_com_gemini(prompt), "gemini", GEMINI_MODEL


def montar_prompt(fetiche: dict, template: str) -> str:
    categoria = (
        fetiche.get("category", {}).get("name")
        if fetiche.get("category")
        else "Geral"
    )
    return template.format(
        nome_fetiche=fetiche["name"],
        categoria=categoria,
        slug=fetiche["slug"],
    )


def processar_fetiche(fetiche: dict, template: str, force: bool):
    sb = get_client()
    if fetiche.get("seo_content") and not force:
        log(f"[skip] {fetiche['slug']} (ja tem conteudo)")
        return False

    log(f"[gen] {fetiche['name']} ({fetiche['slug']})...")
    prompt = montar_prompt(fetiche, template)
    try:
        raw, provider, model = gerar_seo(prompt)
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        log(f"  ERRO json invalido: {e}")
        return False
    except Exception as e:
        log(f"  ERRO geracao: {e}")
        return False

    seo_content = {
        "intro": data.get("intro", ""),
        "sections": data.get("sections", []),
        "faqs": data.get("faqs", []),
        "internal_links_hint": data.get("internal_links_hint", []),
    }

    sb.table("fetishes").update(
        {
            "seo_title": data.get("seo_title"),
            "seo_description": data.get("seo_description"),
            "seo_keywords": data.get("seo_keywords"),
            "seo_content": seo_content,
            "seo_generated_at": "now()",
            "seo_llm_provider": provider,
            "seo_llm_model": model,
        }
    ).eq("id", fetiche["id"]).execute()

    palavras = len(
        " ".join(
            [seo_content["intro"]]
            + [s.get("body", "") for s in seo_content["sections"]]
        ).split()
    )
    log(f"  OK via {provider} ({palavras} palavras)")
    return True


def pegar_fetiches(modo: str, slug: str | None, limite: int | None):
    sb = get_client()
    q = sb.table("fetishes").select(
        "id, name, slug, category:categories(name), seo_content"
    )
    if modo == "slug":
        q = q.eq("slug", slug)
    elif modo == "pending":
        q = q.is_("seo_content", "null")
    q = q.order("sort_order")
    if limite:
        q = q.limit(limite)
    return q.execute().data or []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Gerar apenas um fetiche especifico")
    parser.add_argument("--all", action="store_true", help="Todos os fetiches")
    parser.add_argument("--pending", action="store_true", help="So os sem conteudo SEO")
    parser.add_argument("--force", action="store_true", help="Regerar mesmo se ja tem")
    parser.add_argument("--limit", type=int, help="Limita quantidade (debug)")
    args = parser.parse_args()

    if not args.slug and not args.all and not args.pending:
        log("ERRO: passe --slug X, --all ou --pending")
        return

    modo = "slug" if args.slug else ("pending" if args.pending else "all")
    fetiches = pegar_fetiches(modo, args.slug, args.limit)

    if not fetiches:
        log("nenhum fetiche encontrado pra esse criterio")
        return

    template = PROMPT_PATH.read_text(encoding="utf-8")

    log(f"vai processar {len(fetiches)} fetiches (modo: {modo})")
    log("")

    gerados = 0
    falhados = 0
    inicio = time.time()
    for i, f in enumerate(fetiches, 1):
        try:
            ok = processar_fetiche(f, template, args.force)
            if ok:
                gerados += 1
            if i < len(fetiches):
                time.sleep(DELAY_BETWEEN_CALLS)
        except KeyboardInterrupt:
            log("interrompido pelo usuario")
            break
        except Exception as e:
            falhados += 1
            log(f"  ERRO inesperado: {e}")

    elapsed = time.time() - inicio
    log("")
    log(f"=== FIM ===")
    log(f"Gerados: {gerados}/{len(fetiches)}, falhas: {falhados}")
    log(f"Tempo total: {elapsed:.1f}s")


if __name__ == "__main__":
    main()

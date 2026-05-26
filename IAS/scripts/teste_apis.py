"""
Testa rapidamente as APIs configuradas no .env sem precisar do stack
Docker rodando. Use ANTES de subir os containers.

Uso (do PowerShell, dentro de IAS):
    python -m pip install -r scripts\requirements.txt
    python scripts\teste_apis.py
"""
import os
import sys
import json
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("ERRO: instale dependencias primeiro:")
    print("  python -m pip install -r scripts/requirements.txt")
    sys.exit(1)

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

OK = "[OK]   "
FAIL = "[FAIL] "
SKIP = "[SKIP] "


def teste_groq():
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        print(f"{SKIP}Groq - GROQ_API_KEY nao definida")
        return
    try:
        from groq import Groq
        client = Groq(api_key=key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Diga apenas: ola"}],
            max_tokens=10,
        )
        msg = resp.choices[0].message.content
        print(f"{OK}Groq respondeu: '{msg.strip()}'")
    except Exception as e:
        print(f"{FAIL}Groq: {e}")


def teste_gemini():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print(f"{SKIP}Gemini - GEMINI_API_KEY nao definida")
        return
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        model_name = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
        model = genai.GenerativeModel(model_name)
        resp = model.generate_content("Diga apenas: ola")
        print(f"{OK}Gemini ({model_name}) respondeu: '{resp.text.strip()}'")
    except Exception as e:
        print(f"{FAIL}Gemini: {e}")


def teste_pexels():
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        print(f"{SKIP}Pexels - PEXELS_API_KEY nao definida")
        print(f"       Gere em: https://www.pexels.com/api/new/")
        return
    try:
        import requests
        r = requests.get(
            "https://api.pexels.com/videos/search",
            headers={"Authorization": key},
            params={"query": "nature", "per_page": 1},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        qtd = len(data.get("videos", []))
        print(f"{OK}Pexels respondeu: {qtd} video(s) retornado(s)")
    except Exception as e:
        print(f"{FAIL}Pexels: {e}")


def teste_pixabay():
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        print(f"{SKIP}Pixabay - PIXABAY_API_KEY nao definida (opcional)")
        return
    try:
        import requests
        r = requests.get(
            "https://pixabay.com/api/videos/",
            params={"key": key, "q": "nature", "per_page": 3},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        qtd = len(data.get("hits", []))
        print(f"{OK}Pixabay respondeu: {qtd} video(s) retornado(s)")
    except Exception as e:
        print(f"{FAIL}Pixabay: {e}")


def teste_edge_tts():
    try:
        import edge_tts, asyncio
        async def gerar():
            saida = Path(__file__).parent / "_teste.mp3"
            comm = edge_tts.Communicate(
                text="ola, teste de voz neural brasileira",
                voice="pt-BR-FranciscaNeural",
            )
            await comm.save(str(saida))
            tamanho = saida.stat().st_size
            saida.unlink()
            return tamanho
        tamanho = asyncio.run(gerar())
        print(f"{OK}Edge-TTS gerou audio de {tamanho} bytes")
    except Exception as e:
        print(f"{FAIL}Edge-TTS: {e}")


def teste_supabase():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(f"{SKIP}Supabase - credenciais nao definidas")
        return
    try:
        from supabase import create_client
        sb = create_client(url, key)
        resp = sb.table("categories").select("id").limit(1).execute()
        qtd = len(resp.data)
        print(f"{OK}Supabase respondeu: {qtd} categoria(s) retornada(s)")
    except Exception as e:
        print(f"{FAIL}Supabase: {e}")


def teste_telegram():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        print(f"{SKIP}Telegram - credenciais nao definidas")
        print(f"       Crie bot via @BotFather, anote token")
        print(f"       Pegue chat_id via @userinfobot")
        return
    try:
        import requests
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat, "text": "[IAS] teste de conexao OK"},
            timeout=15,
        )
        r.raise_for_status()
        print(f"{OK}Telegram - mensagem enviada (cheque seu chat)")
    except Exception as e:
        print(f"{FAIL}Telegram: {e}")


def main():
    print()
    print("=" * 50)
    print("Testando APIs do IAS")
    print("=" * 50)
    print()

    teste_groq()
    teste_gemini()
    teste_pexels()
    teste_pixabay()
    teste_edge_tts()
    teste_supabase()
    teste_telegram()

    print()
    print("=" * 50)
    print("[SKIP] = nao configurado ainda (preencha .env)")
    print("[FAIL] = configurado mas com erro (cheque a key)")
    print("[OK]   = funcionando")
    print("=" * 50)


if __name__ == "__main__":
    main()

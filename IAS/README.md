# Sistema de Automacao IAS - Fetiches Brasil

Pipeline automatizado de geracao e publicacao de conteudo TikTok para o
projeto Fetiches Brasil, 100% gratuito, rodando em notebook Windows
dedicado (i5 8GB).

## Stack

- **Infraestrutura**: Notebook i5 8GB Windows + Cloudflare Tunnel
- **Orquestracao**: n8n self-hosted (Docker)
- **LLM**: Groq (Llama 3.3 70B) com fallback Google Gemini
- **TTS**: Microsoft Edge-TTS (sem rate limit, vozes BR)
- **Video**: FFmpeg + b-rolls do Pexels
- **Transcricao**: faster-whisper local (container)
- **Agendamento**: Postiz self-hosted
- **Distribuicao**: TikTok Content Posting API
- **Monitoramento**: Uptime Kuma + Telegram bot

## Fluxo geral

1. Cron n8n dispara 2x/dia (9h e 21h BR)
2. Groq gera roteiro em algospeak BR e salva no Supabase como
   `pending_approval`
3. Admin abre `/admin/tiktok` no site e ve o roteiro
4. Admin clica "Aprovar" -> site chama webhook do n8n
5. n8n roda o pipeline: gera audio (Edge-TTS), baixa b-roll (Pexels),
   transcreve (Whisper), monta video (FFmpeg), posta no TikTok
6. Status do roteiro vai atualizando em tempo real no painel admin
7. Metricas semanais voltam pro Supabase

## Estrutura

```
IAS/
  README.md
  .env.example
  .gitignore

  docker/
    docker-compose.yml        # n8n + postiz + whisper + uptime
  
  scripts/
    requirements.txt
    gerar_roteiro.py          # Groq + fallback Gemini
    gerar_audio.py            # Edge-TTS
    baixar_broll.py           # Pexels API
    transcrever.py            # Whisper container
    montar_video.py           # FFmpeg
    postar_tiktok.py          # TikTok API
    utils/
      supabase_client.py
      logger.py

  prompts/
    roteiro_tiktok_master.txt # prompt mestre da IA
    moderacao.txt             # safety check

  n8n/
    README.md                 # como importar workflow

  setup/
    01_preparacao_notebook.md
    02_instalar_softwares.ps1
    03_configurar_energia.ps1
    04_subir_docker.ps1
    05_cloudflare_tunnel.md
    06_health_check.ps1
    07_auto_start.md

  migracao/
    checklist_transferencia.md
    backup_restore.ps1
```

## Onde comecar

Construir agora neste PC para testar, depois mover pro notebook
secundario. Siga a ordem dos arquivos em `setup/`:

1. `setup/01_preparacao_notebook.md`
2. `setup/02_instalar_softwares.ps1`
3. `setup/03_configurar_energia.ps1`
4. `setup/04_subir_docker.ps1`
5. `setup/05_cloudflare_tunnel.md`
6. `setup/06_health_check.ps1`
7. `setup/07_auto_start.md`

Antes disso, crie o `.env` baseado no `.env.example` e preencha
todas as keys necessarias.

## Variaveis de ambiente

Veja `.env.example` para a lista completa. Resumo das contas que
voce precisa criar (todas gratuitas, sem cartao):

- Groq Console (https://console.groq.com)
- Google AI Studio (https://aistudio.google.com)
- Pexels API (https://www.pexels.com/api/)
- Pixabay API (https://pixabay.com/api/docs/) - opcional, fallback
- TikTok for Developers (https://developers.tiktok.com)
- Cloudflare (https://dash.cloudflare.com) - pra expor n8n publicamente

Adicionalmente, no `.env` do SITE Fetiches Brasil (raiz, nao IAS):

```
N8N_TIKTOK_WEBHOOK_URL=https://n8n.seudominio/webhook/tiktok-pipeline
N8N_WEBHOOK_SECRET=mesma-string-aleatoria-do-IAS
```

## Migracao pro notebook secundario

Quando estiver tudo pronto e funcionando neste PC, siga
`migracao/checklist_transferencia.md` para mover o setup
sem perder dados.

## Custo mensal

| Item                       | Custo         |
|----------------------------|---------------|
| Dominio (.xyz Cloudflare)  | ~R$ 1/mes     |
| Energia eletrica (i5 24/7) | R$ 12-18/mes  |
| Internet (ja tem)          | R$ 0 incr.    |
| **Total**                  | **R$ 13-19**  |

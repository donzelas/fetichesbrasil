# n8n Workflows - IAS Fetiches Brasil

Arquitetura: aprovacao 100% via painel admin do proprio site
Fetiches Brasil (sem Telegram).

```
+---------------------------+
| Notebook 24/7 (Docker)    |
|                           |
|  +-----------------+      |     gera roteiros
|  |    n8n (5678)   | <----+---- cron (Schedule Trigger)
|  +-----------------+      |     -> Groq -> Supabase
|         ^                 |
|         | webhook         |
+---------+-----------------+
          |
          | POST /webhook/tiktok-pipeline
          |   { script_id: "uuid", secret: "..." }
          |
+---------+-------------------+
| Site fetichesbrasil.com.br  |
|                             |
|   /admin/tiktok             |
|   (admin clica Aprovar)     |
|        |                    |
|        v                    |
|   POST /api/admin/tiktok/   |
|        trigger/[id]         |
+-----------------------------+
```

## Pre-requisitos

1. Migration `0021_tiktok_automation.sql` aplicada no Supabase
2. `.env` do IAS preenchido (Groq, Pexels, Supabase)
3. `.env` do site Fetiches Brasil tambem com:
   - `N8N_TIKTOK_WEBHOOK_URL=https://n8n.seudominio/webhook/tiktok-pipeline`
   - `N8N_WEBHOOK_SECRET=mesma-string-do-IAS`
4. n8n acessivel em http://localhost:5678
5. Conta TikTok Developer (depois)

## Schema Supabase

Ja foi criado pela migration `0021_tiktok_automation.sql`. Tabelas:
- `tiktok_scripts` - roteiros + status pipeline
- `tiktok_metrics` - views/likes/etc apos publicacao
- bucket `tiktok-videos` (privado, admin-only)
- coluna `used_in_tiktok_at` em `fetishes`

## Workflow 1: Gerar Roteiro Diario

Objetivo: 2x por dia, gerar 1 roteiro novo via Groq e salvar como
`pending_approval` no Supabase. Admin recebe notificacao via realtime
no painel `/admin/tiktok`.

| # | Tipo | Nome | Configuracao |
|---|------|------|--------------|
| 1 | Schedule Trigger | Cron Diario | Cron: `0 12,0 * * *` (9h e 21h BR / UTC-3) |
| 2 | Execute Command | Gerar Roteiro | `python3 /scripts/gerar_roteiro.py` |

Pronto. So 2 nodes. O script Python ja:
- Busca fetiche sem uso (`used_in_tiktok_at IS NULL`)
- Chama Groq (fallback Gemini)
- Salva roteiro com status `pending_approval`

O admin ve no /admin/tiktok automaticamente.

## Workflow 2: Pipeline de Producao (Webhook)

Objetivo: quando admin aprova um roteiro, este workflow recebe o ID
via webhook e roda toda a producao.

| # | Tipo | Nome | Configuracao |
|---|------|------|--------------|
| 1 | Webhook Trigger | Receber Aprovacao | Path: `tiktok-pipeline`, Method: POST |
| 2 | IF | Verificar Secret | `{{ $request.headers["x-webhook-secret"] }} == {{ $env.N8N_WEBHOOK_SECRET }}` |
| 3 | Set | Extrair script_id | `script_id = {{ $json.body.script_id }}` |
| 4 | Execute Command | Gerar Audio | `python3 /scripts/gerar_audio.py {{ $json.script_id }}` |
| 5 | Execute Command | Baixar B-roll | `python3 /scripts/baixar_broll.py {{ $json.script_id }}` |
| 6 | Execute Command | Transcrever | `python3 /scripts/transcrever.py {{ $json.script_id }}` |
| 7 | Execute Command | Montar Video | `python3 /scripts/montar_video.py {{ $json.script_id }}` |
| 8 | Execute Command | Postar TikTok | `python3 /scripts/postar_tiktok.py {{ $json.script_id }}` |

IMPORTANTE: cada Execute Command precisa rodar dentro do container n8n
com Python disponivel. Garanta que o `docker-compose.yml` monta a
pasta `/scripts` e tem Python instalado (a imagem base do n8n nao tem).

Opcao melhor: criar um **container worker separado** que recebe os
comandos via HTTP. Isso ja esta planejado em uma proxima iteracao.

POR AGORA: pra testar, voce pode trocar os Execute Command por:
- **HTTP Request** nodes que chamam endpoints num worker FastAPI
- Ou rodar os scripts manualmente no host com PowerShell

Cada script ja atualiza o `status` no Supabase, entao o /admin/tiktok
mostra o progresso em tempo real.

## Workflow 3: Coletar Metricas (semanal)

Objetivo: 1x por semana, busca metricas dos videos postados nos
ultimos 7 dias via TikTok API.

| # | Tipo | Nome | Configuracao |
|---|------|------|--------------|
| 1 | Schedule Trigger | Semanal | Cron: `0 10 * * 1` (segunda 10h) |
| 2 | Supabase | Videos Recentes | tiktok_scripts WHERE posted_at > now() - 7 days |
| 3 | Split In Batches | Por Video | Loop sobre cada video |
| 4 | HTTP Request | TikTok Video Info | GET https://open.tiktokapis.com/v2/video/query/ |
| 5 | Supabase | Inserir Metrica | INSERT INTO tiktok_metrics |

Configure depois que tiver TikTok API auditada.

## Credenciais no n8n

Acesse n8n > Credentials > New e cadastre:

1. **HTTP Header Auth** (TikTok Access Token)
   - Header Name: `Authorization`
   - Header Value: `Bearer {{ $env.TIKTOK_ACCESS_TOKEN }}`

## Variaveis de ambiente no n8n

Settings > Environments (ou diretamente no `docker-compose.yml`),
crie variaveis a partir do `.env`:

```
GROQ_API_KEY
GEMINI_API_KEY
PEXELS_API_KEY
PIXABAY_API_KEY
TIKTOK_ACCESS_TOKEN
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
N8N_WEBHOOK_SECRET
```

## Configurar webhook URL no site Fetiches Brasil

Adicione no `.env` do site (raiz do projeto, NAO o do IAS):

```
N8N_TIKTOK_WEBHOOK_URL=http://localhost:5678/webhook/tiktok-pipeline
N8N_WEBHOOK_SECRET=mesma-string-aleatoria-do-IAS
```

Se o site rodar na Netlify e o n8n rodar local, voce vai precisar
de uma URL publica do n8n. Solucoes:
- **Cloudflare Tunnel** (recomendado, ja documentado em `setup/05_*`)
- ngrok temporario pra testes
- VPS publica rodando o n8n

## Como exportar workflows pra backup

Apos criar tudo no n8n:

1. n8n > Workflows > seleciona o workflow
2. Menu (...) > Download
3. Salva em `IAS/n8n/workflow_X.json`
4. Commita no Git (sem credenciais, e seguro)

## Testando manualmente

Antes de deixar no automatico:

1. Roda manualmente o Workflow 1 ("Execute Workflow")
2. Confirma que um novo roteiro aparece em `/admin/tiktok`
3. No painel admin, clica "Aprovar"
4. Workflow 2 deve disparar via webhook
5. Acompanha o status mudando no painel: processing -> audio_done
   -> broll_done -> srt_done -> ready_to_post -> posted_inbox

Se algum erro, status vira `failed` e mostra o `failure_reason`
no painel. Clica "Reprocessar" pra tentar de novo.

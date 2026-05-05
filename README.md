# Fetiches Brasil

Plataforma adulta consensual brasileira com sistema freemium de salas de chat.
Apenas para maiores de 18 anos.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + componentes inspirados em shadcn/ui (Radix)
- **Supabase** (Postgres + Auth + Realtime + RLS)
- **`@supabase/ssr`** para autenticação cookie-based em SSR

## Funcionalidades

- 🔥 Home com 9 categorias e ~94 fetiches
- ✨ Seção "Salas em Destaque" (curadoria manual via admin)
- 🏆 Top 15 salas mais acessadas em tempo real
- 💬 Chat em tempo real (Supabase Realtime)
- 👥 Lista de presença online (Supabase Presence)
- 🔒 Bloqueio de conteúdo para usuários FREE com modal de conversão
- 👑 Sistema Premium binário (free vs premium)
- 🛏️ Premium pode criar 1 sala por mês (após deletar a anterior)
- ⚙️ Painel admin para destacar salas e promover usuários a Premium
- 🔞 Age gate obrigatório
- ⚖️ RLS rígido no banco (impossível burlar via API direta)

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- Conta no Supabase (https://supabase.com)
- (Opcional) Vercel para deploy

### 2. Clonar e instalar

```bash
git clone https://github.com/donzelas/fetichesbrasil.git
cd fetichesbrasil
npm install
```

### 3. Configurar Supabase

1. Acesse o painel do seu projeto Supabase.
2. Vá em **SQL Editor** e execute, **na ordem**, os arquivos em `supabase/migrations/`:
   - `0001_init.sql`
   - `0002_triggers.sql`
   - `0003_rls.sql`
   - `0004_seed_categories.sql`
   - `0005_realtime.sql`

> Alternativamente, com a CLI: `supabase db push`

3. Vá em **Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA expor no client!)

### 4. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

E preencha com seus valores. Gere também um `CRON_SECRET` aleatório.

### 5. Rodar

```bash
npm run dev
```

Acesse `http://localhost:3000`.

### 6. Criar primeiro usuário admin

1. Crie uma conta normal pela interface (`/signup`).
2. No SQL Editor do Supabase rode:

```sql
update public.profiles
   set is_admin = true, is_premium = true
 where username = 'SEU_USERNAME';
```

3. Acesse `/admin` para gerenciar destaques e usuários.

## Deploy na Vercel

1. Suba o repositório no GitHub.
2. Importe na Vercel (https://vercel.com/new).
3. Configure as variáveis de ambiente (mesmas do `.env.local`).
4. Deploy automático em cada push.

> O `vercel.json` já configura o cron que atualiza `active_users_count` a cada minuto.

## Estrutura do projeto

```
fetiches-brasil/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, signup, reset
│   ├── admin/                    # Painel admin
│   ├── api/                      # Route handlers
│   ├── auth/callback/            # OAuth callback
│   ├── perfil/                   # Perfil do usuário
│   ├── premium/                  # Página de planos
│   └── salas/                    # Listagem e chat das salas
├── components/
│   ├── chat/                     # MessageList, MessageInput, Presence
│   ├── home/                     # Sections da home
│   ├── layout/                   # Header, Footer, AgeGate
│   ├── rooms/                    # RoomCard, UnlockModal, SwitchRoomModal
│   └── ui/                       # Components base (Button, Card, Dialog...)
├── hooks/                        # useUser e demais hooks
├── lib/
│   ├── supabase/                 # Clients (browser/server/admin/middleware)
│   └── utils/                    # cn, format, etc
├── supabase/migrations/          # SQL versionado
├── types/database.ts             # Tipos do banco
└── middleware.ts                 # Refresh de sessão + proteção de rotas
```

## Modelo de dados (resumo)

- `profiles` (1:1 com `auth.users`) — `is_premium`, `is_admin`, `current_room_id`
- `categories` → `fetishes` (1:N)
- `chat_rooms` → `messages` (1:N)
- `room_participants` (snapshot de presença para ordenação)

## Regras de negócio

| Regra | Implementação |
|---|---|
| Premium binário | `profiles.is_premium` |
| 1 sala por usuário | Trigger `validate_room_creation` |
| 1 sala por mês | Compara com `last_room_created_at` |
| Free vê nome, premium vê conteúdo | RLS em `messages` e `room_participants` |
| Trocar de sala | RPC `join_room` |
| Sair de sala | RPC `leave_current_room` |
| Soft delete | RPC `soft_delete_room` |
| Destaque | Admin altera `is_featured` |

## Stripe (futuro)

A integração com Stripe foi adiada por escolha de produto. Hoje o botão "Quero ser Premium"
abre um modal "Em breve". A administração pode promover usuários manualmente via `/admin/usuarios`.

Quando integrar:

1. Criar produto e preço recorrente no Stripe Dashboard.
2. Substituir `ComingSoonButton` por um link para o Stripe Checkout (`stripe.checkout.sessions.create`).
3. Criar Edge Function ou Route Handler `/api/webhook/stripe` que escuta `checkout.session.completed`
   e atualiza `profiles.is_premium = true` + `premium_since`.

## Licença

Privado. Todos os direitos reservados.

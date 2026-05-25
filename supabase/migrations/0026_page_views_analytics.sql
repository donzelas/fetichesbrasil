-- =====================================================
-- 0026: Tabela page_views (analytics proprio LGPD-friendly)
-- - Sem cookies de tracking
-- - IP nao armazenado em raw (apenas hash)
-- - Geo via headers do Netlify/Cloudflare (nao precisa MaxMind)
-- - Admin-only no painel
-- =====================================================

create table if not exists public.page_views (
  id              uuid primary key default gen_random_uuid(),
  path            text not null,
  full_url        text,
  referrer        text,
  user_agent      text,
  ip_hash         text,
  country         text,
  region          text,
  city            text,
  device_type     text check (device_type in ('mobile','tablet','desktop','bot','unknown')),
  browser         text,
  os              text,
  user_id         uuid references public.profiles(id) on delete set null,
  session_id      text,
  is_authenticated boolean not null default false,
  is_admin_view   boolean not null default false,
  viewed_at       timestamptz not null default now()
);

-- Indexes pra dashboard
create index if not exists page_views_viewed_at_idx
  on public.page_views (viewed_at desc);

create index if not exists page_views_path_idx
  on public.page_views (path, viewed_at desc);

create index if not exists page_views_country_idx
  on public.page_views (country, viewed_at desc)
  where country is not null;

create index if not exists page_views_user_idx
  on public.page_views (user_id, viewed_at desc)
  where user_id is not null;

create index if not exists page_views_session_idx
  on public.page_views (session_id, viewed_at desc)
  where session_id is not null;

create index if not exists page_views_device_idx
  on public.page_views (device_type, viewed_at desc);

-- =====================================================
-- RLS
-- =====================================================
alter table public.page_views enable row level security;

-- INSERT: qualquer um (anon/auth) pode inserir
-- Importante: validacao do conteudo e feita na route handler
drop policy if exists "page_views_insert_any" on public.page_views;
create policy "page_views_insert_any" on public.page_views
  for insert to anon, authenticated
  with check (true);

-- SELECT: apenas admin
drop policy if exists "page_views_select_admin" on public.page_views;
create policy "page_views_select_admin" on public.page_views
  for select to authenticated
  using (public.is_admin());

-- DELETE: apenas admin (limpeza/GDPR request)
drop policy if exists "page_views_delete_admin" on public.page_views;
create policy "page_views_delete_admin" on public.page_views
  for delete to authenticated
  using (public.is_admin());

-- =====================================================
-- Limpeza automatica de logs antigos (>180 dias)
-- Pra evitar tabela crescer demais
-- =====================================================
create or replace function public.cleanup_old_page_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.page_views
  where viewed_at < now() - interval '180 days';
end;
$$;

grant execute on function public.cleanup_old_page_views() to authenticated;

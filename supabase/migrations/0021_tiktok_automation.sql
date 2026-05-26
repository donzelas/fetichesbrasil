-- =====================================================
-- 0021: Sistema IAS - geração e publicação automatizada
--       de conteúdo TikTok (pipeline n8n + Groq + Edge-TTS)
--       Toda aprovação/rejeição acontece em /admin/tiktok
-- =====================================================

-- 1. Coluna em fetishes pra rastrear uso no TikTok ---
alter table public.fetishes
  add column if not exists used_in_tiktok_at timestamptz;

create index if not exists fetishes_unused_tiktok_idx
  on public.fetishes (used_in_tiktok_at)
  where used_in_tiktok_at is null;

-- 2. Tabela principal: tiktok_scripts -----------------
create table if not exists public.tiktok_scripts (
  id                  uuid primary key default gen_random_uuid(),
  fetiche_id          uuid references public.fetishes(id) on delete set null,

  -- Roteiro gerado pela IA
  titulo              text not null check (char_length(titulo) between 1 and 200),
  hook                text not null,
  corpo               text not null,
  cta                 text not null,
  hashtags            text[] not null default '{}'::text[],
  broll_tags          text[] not null default '{}'::text[],
  voz                 text not null default 'pt-BR-FranciscaNeural',

  -- Modelo de IA utilizado (debug/auditoria)
  llm_provider        text,
  llm_model           text,

  -- Arquivos gerados pelo pipeline (paths no Supabase Storage)
  audio_path          text,
  srt_path            text,
  broll_paths         text[] default '{}'::text[],
  video_path          text,   -- mp4 final no bucket tiktok-videos

  -- Workflow / estado
  status              text not null default 'pending_approval' check (status in (
                        'pending_approval',
                        'approved',
                        'rejected',
                        'processing',
                        'audio_done',
                        'broll_done',
                        'srt_done',
                        'ready_to_post',
                        'posted_inbox',
                        'posted',
                        'failed'
                      )),
  rejection_reason    text,
  failure_reason      text,

  -- Aprovação manual no admin
  approved_by         uuid references public.profiles(id) on delete set null,
  approved_at         timestamptz,

  -- TikTok response
  tiktok_publish_id   text,
  tiktok_video_id     text,
  tiktok_share_url    text,
  posted_at           timestamptz,

  -- Timestamps
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists tiktok_scripts_status_idx
  on public.tiktok_scripts (status, created_at desc);

create index if not exists tiktok_scripts_pending_idx
  on public.tiktok_scripts (created_at desc)
  where status = 'pending_approval';

create index if not exists tiktok_scripts_posted_idx
  on public.tiktok_scripts (posted_at desc)
  where status in ('posted','posted_inbox');

-- Trigger updated_at
create or replace function public.touch_tiktok_script_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_tiktok_script on public.tiktok_scripts;
create trigger trg_touch_tiktok_script
before update on public.tiktok_scripts
for each row execute function public.touch_tiktok_script_updated_at();

-- 3. Tabela de métricas -------------------------------
create table if not exists public.tiktok_metrics (
  id                  uuid primary key default gen_random_uuid(),
  script_id           uuid not null references public.tiktok_scripts(id) on delete cascade,
  views               int not null default 0,
  likes               int not null default 0,
  comments            int not null default 0,
  shares              int not null default 0,
  watch_time_avg      float not null default 0,
  fyp_views_pct       float not null default 0,
  collected_at        timestamptz not null default now()
);

create index if not exists tiktok_metrics_script_idx
  on public.tiktok_metrics (script_id, collected_at desc);

-- 4. RLS - apenas admins acessam ---------------------
alter table public.tiktok_scripts enable row level security;
alter table public.tiktok_metrics enable row level security;

drop policy if exists "tiktok_scripts_admin_all" on public.tiktok_scripts;
create policy "tiktok_scripts_admin_all" on public.tiktok_scripts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tiktok_metrics_admin_all" on public.tiktok_metrics;
create policy "tiktok_metrics_admin_all" on public.tiktok_metrics
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. RPCs de moderação --------------------------------

-- Aprova um roteiro (admin). Status vira 'approved'
-- e dispara o pipeline (n8n vai polling ou via webhook do app).
create or replace function public.approve_tiktok_script(p_script_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  update public.tiktok_scripts
     set status = 'approved',
         approved_by = v_user_id,
         approved_at = now(),
         rejection_reason = null
   where id = p_script_id
     and status in ('pending_approval','rejected','failed');
end;
$$;

-- Rejeita um roteiro com motivo
create or replace function public.reject_tiktok_script(p_script_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  if char_length(coalesce(p_reason, '')) < 3 then
    raise exception 'Informe um motivo (3+ caracteres).';
  end if;
  update public.tiktok_scripts
     set status = 'rejected',
         rejection_reason = p_reason,
         approved_by = v_user_id,
         approved_at = now()
   where id = p_script_id;
end;
$$;

-- Permite reprocessar (volta pra approved se estava failed)
create or replace function public.retry_tiktok_script(p_script_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  update public.tiktok_scripts
     set status = 'approved',
         failure_reason = null
   where id = p_script_id
     and status in ('failed','posted_inbox');
end;
$$;

-- Hard delete (admin)
create or replace function public.delete_tiktok_script(p_script_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  delete from public.tiktok_scripts where id = p_script_id;
end;
$$;

grant execute on function public.approve_tiktok_script(uuid)         to authenticated;
grant execute on function public.reject_tiktok_script(uuid, text)    to authenticated;
grant execute on function public.retry_tiktok_script(uuid)           to authenticated;
grant execute on function public.delete_tiktok_script(uuid)          to authenticated;

-- 6. Storage bucket privado pra videos finais ---------
insert into storage.buckets (id, name, public)
values ('tiktok-videos', 'tiktok-videos', false)
on conflict (id) do update set public = false;

-- SELECT: apenas admin
drop policy if exists "tiktok_videos_select_admin" on storage.objects;
create policy "tiktok_videos_select_admin"
on storage.objects for select
to authenticated
using (
  bucket_id = 'tiktok-videos' and public.is_admin()
);

-- INSERT: apenas admin (worker IAS usa service_role que bypassa RLS)
drop policy if exists "tiktok_videos_insert_admin" on storage.objects;
create policy "tiktok_videos_insert_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tiktok-videos' and public.is_admin()
);

drop policy if exists "tiktok_videos_delete_admin" on storage.objects;
create policy "tiktok_videos_delete_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tiktok-videos' and public.is_admin()
);

-- 7. Realtime: admin observa mudancas em tempo real ----
do $$
begin
  begin
    alter publication supabase_realtime add table public.tiktok_scripts;
  exception when duplicate_object then null; end;
end$$;

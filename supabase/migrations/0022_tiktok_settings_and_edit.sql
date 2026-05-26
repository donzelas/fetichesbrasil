-- =====================================================
-- 0022: Edicao manual de roteiros + configuracoes globais
-- =====================================================

-- 1. Coluna video_config (override por video) ----------
alter table public.tiktok_scripts
  add column if not exists video_config jsonb;

-- 2. Tabela tiktok_settings (singleton, defaults globais) -----
create table if not exists public.tiktok_settings (
  id              boolean primary key default true check (id),
  -- Legenda
  font_name       text not null default 'Arial',
  font_size       int  not null default 22,
  font_bold       boolean not null default true,
  font_color      text not null default 'FFFFFF',
  outline_color   text not null default '000000',
  outline_width   int  not null default 3,
  shadow          int  not null default 0,
  alignment       int  not null default 2 check (alignment between 1 and 9),
  margin_v        int  not null default 280,
  margin_l        int  not null default 60,
  margin_r        int  not null default 60,
  uppercase       boolean not null default true,
  words_per_chunk int  not null default 5,
  -- Defaults de IA
  default_voz     text not null default 'pt-BR-FranciscaNeural',
  default_voz_rate text not null default '+15%',
  default_llm     text not null default 'groq',
  default_llm_model text not null default 'llama-3.3-70b-versatile',
  -- Defaults de video
  video_width     int  not null default 1080,
  video_height    int  not null default 1920,
  video_fps       int  not null default 30,
  video_crf       int  not null default 21,
  -- Cron
  cron_enabled    boolean not null default false,
  cron_hours      int[]  not null default array[9,21],
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null
);

-- Seed singleton
insert into public.tiktok_settings (id) values (true)
on conflict (id) do nothing;

-- Trigger updated_at
create or replace function public.touch_tiktok_settings()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_tiktok_settings on public.tiktok_settings;
create trigger trg_touch_tiktok_settings
before update on public.tiktok_settings
for each row execute function public.touch_tiktok_settings();

-- 3. RLS - apenas admin ----------
alter table public.tiktok_settings enable row level security;

drop policy if exists "tiktok_settings_admin_all" on public.tiktok_settings;
create policy "tiktok_settings_admin_all" on public.tiktok_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. RPC update_tiktok_script (edicao manual pelo admin) ----
create or replace function public.update_tiktok_script(
  p_script_id  uuid,
  p_titulo     text,
  p_hook       text,
  p_corpo      text,
  p_cta        text,
  p_hashtags   text[],
  p_broll_tags text[],
  p_voz        text,
  p_video_config jsonb default null
)
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
  if char_length(coalesce(p_titulo, '')) < 1 then
    raise exception 'Titulo nao pode ficar em branco.';
  end if;
  update public.tiktok_scripts
     set titulo       = p_titulo,
         hook         = p_hook,
         corpo        = p_corpo,
         cta          = p_cta,
         hashtags     = coalesce(p_hashtags, '{}'::text[]),
         broll_tags   = coalesce(p_broll_tags, '{}'::text[]),
         voz          = p_voz,
         video_config = p_video_config
   where id = p_script_id;
end;
$$;

-- 5. RPC update_tiktok_settings -----
create or replace function public.update_tiktok_settings(p_data jsonb)
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

  update public.tiktok_settings
     set font_name        = coalesce(p_data->>'font_name', font_name),
         font_size        = coalesce((p_data->>'font_size')::int, font_size),
         font_bold        = coalesce((p_data->>'font_bold')::boolean, font_bold),
         font_color       = coalesce(p_data->>'font_color', font_color),
         outline_color    = coalesce(p_data->>'outline_color', outline_color),
         outline_width    = coalesce((p_data->>'outline_width')::int, outline_width),
         shadow           = coalesce((p_data->>'shadow')::int, shadow),
         alignment        = coalesce((p_data->>'alignment')::int, alignment),
         margin_v         = coalesce((p_data->>'margin_v')::int, margin_v),
         margin_l         = coalesce((p_data->>'margin_l')::int, margin_l),
         margin_r         = coalesce((p_data->>'margin_r')::int, margin_r),
         uppercase        = coalesce((p_data->>'uppercase')::boolean, uppercase),
         words_per_chunk  = coalesce((p_data->>'words_per_chunk')::int, words_per_chunk),
         default_voz      = coalesce(p_data->>'default_voz', default_voz),
         default_voz_rate = coalesce(p_data->>'default_voz_rate', default_voz_rate),
         default_llm      = coalesce(p_data->>'default_llm', default_llm),
         default_llm_model= coalesce(p_data->>'default_llm_model', default_llm_model),
         video_width      = coalesce((p_data->>'video_width')::int, video_width),
         video_height     = coalesce((p_data->>'video_height')::int, video_height),
         video_fps        = coalesce((p_data->>'video_fps')::int, video_fps),
         video_crf        = coalesce((p_data->>'video_crf')::int, video_crf),
         cron_enabled     = coalesce((p_data->>'cron_enabled')::boolean, cron_enabled),
         updated_by       = v_user_id
   where id = true;
end;
$$;

grant execute on function public.update_tiktok_script(uuid, text, text, text, text, text[], text[], text, jsonb) to authenticated;
grant execute on function public.update_tiktok_settings(jsonb) to authenticated;

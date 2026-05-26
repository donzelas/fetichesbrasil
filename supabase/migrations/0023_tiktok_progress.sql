-- =====================================================
-- 0023: Coluna progress_message para mostrar progresso
--       em tempo real no painel /admin/tiktok
-- =====================================================

alter table public.tiktok_scripts
  add column if not exists progress_message text,
  add column if not exists progress_started_at timestamptz;

create index if not exists tiktok_scripts_progress_idx
  on public.tiktok_scripts (status, progress_started_at desc)
  where status in (
    'approved','processing','audio_done',
    'broll_done','srt_done','ready_to_post'
  );

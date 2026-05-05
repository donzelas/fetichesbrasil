-- =====================================================
-- 0005_realtime.sql — Habilita Realtime nas tabelas necessárias
-- =====================================================

-- Adiciona tabelas à publication do Realtime (cria se não existir)
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_rooms;

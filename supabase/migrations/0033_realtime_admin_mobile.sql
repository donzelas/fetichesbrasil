-- =====================================================
-- 0033: Habilita realtime nas tabelas usadas pelo Admin Mobile
--
-- /admin/mobile assina INSERT em tempo real pra notificar:
--   - payments  -> "+R$ X,XX comprou Plano Y"
--   - profiles  -> "@fulano se cadastrou"
-- (messages, chat_rooms, dm_messages ja estavam habilitadas)
-- =====================================================

do $$
begin
  -- Idempotente: so adiciona se nao estiver na publication
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

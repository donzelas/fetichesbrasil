-- =====================================================
-- 0018: Agendamento automático de expire_premiums()
-- =====================================================
-- Habilita pg_cron e agenda a função public.expire_premiums() (definida em
-- 0016) para rodar a cada hora. Isso revoga Premium dos usuários cujo
-- premium_expires_at já passou.
--
-- pg_cron precisa estar habilitado no painel (Database → Extensions) caso
-- ainda não esteja. O CREATE EXTENSION abaixo é idempotente.

create extension if not exists pg_cron with schema extensions;

-- Remove agendamento anterior (caso esta migration seja reaplicada).
do $$
declare
  v_job_id integer;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'expire-premiums-hourly';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

-- Agenda execução horária no minuto 7 (evita pico das :00).
select cron.schedule(
  'expire-premiums-hourly',
  '7 * * * *',
  $$select public.expire_premiums();$$
);

comment on extension pg_cron is
  'Agendador interno do Postgres. Job expire-premiums-hourly revoga Premium expirado a cada hora.';

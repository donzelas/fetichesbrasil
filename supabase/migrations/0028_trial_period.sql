-- =====================================================
-- 0028: Sistema de trial gratuito de 1 hora
--
-- - Todo usuario novo ganha 1h de acesso completo ao chat
-- - Contagem comeca no cadastro (created_at)
-- - Timer corre fixo (mesmo offline)
-- - Apos expirar, bloqueia mensagens/salas (modal pra Premium)
-- - Premium e Admin nunca sao afetados
-- - Usuarios free ja existentes ganham +1h agora (reset)
-- =====================================================

-- 1. Coluna trial_started_at ---------------------------
alter table public.profiles
  add column if not exists trial_started_at timestamptz;

create index if not exists profiles_trial_idx
  on public.profiles (trial_started_at desc)
  where trial_started_at is not null;

-- 2. Trigger pra novos usuarios -----------------------
-- Sempre que um profile e criado, marca trial_started_at = now()
create or replace function public.set_trial_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_started_at is null then
    new.trial_started_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_trial_on_signup on public.profiles;
create trigger trg_set_trial_on_signup
before insert on public.profiles
for each row execute function public.set_trial_on_signup();

-- 3. Atualiza usuarios existentes free pra ganharem 1h ---
-- Premium nao precisa (eles nao sao afetados pelo trial)
update public.profiles
   set trial_started_at = now()
 where trial_started_at is null
   and coalesce(is_premium, false) = false
   and coalesce(is_admin, false)   = false;

-- Premium e admin: marca como ja foi gasto (so por completeness)
update public.profiles
   set trial_started_at = created_at
 where trial_started_at is null;

-- 4. Funcoes helper -----------------------------------

-- Duracao do trial em segundos (1 hora)
create or replace function public.trial_duration_seconds()
returns int
language sql
immutable
as $$
  select 3600;
$$;

-- Retorna true se usuario logado esta no periodo de trial ativo
-- Premium e admin: ja tem acesso por outro caminho, nao precisa trial
create or replace function public.is_in_trial()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and trial_started_at is not null
       and trial_started_at + interval '1 hour' > now()
  );
$$;

-- Segundos restantes do trial (negativo se expirou). Usado no countdown.
create or replace function public.trial_seconds_left()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      extract(
        epoch from (
          (trial_started_at + interval '1 hour') - now()
        )
      )::int,
      0
    )
  from public.profiles
  where id = auth.uid();
$$;

grant execute on function public.is_in_trial()             to authenticated;
grant execute on function public.trial_seconds_left()      to authenticated;
grant execute on function public.trial_duration_seconds()  to anon, authenticated;

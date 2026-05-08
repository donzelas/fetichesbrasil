-- =====================================================
-- 0016: Planos Premium + histórico de pagamentos (Stripe)
-- =====================================================

-- 1. profiles.premium_expires_at -----------------------
alter table public.profiles
  add column if not exists premium_expires_at timestamptz;

create index if not exists profiles_premium_expires_idx
  on public.profiles (premium_expires_at)
  where premium_expires_at is not null;

-- 2. Tabela: plans -------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  payment_method text not null check (payment_method in ('pix', 'credit_card')),
  duration_days integer not null check (duration_days > 0),
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_active_idx
  on public.plans (is_active, sort_order)
  where is_active = true;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- 3. Tabela: payments ----------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  amount_cents integer not null,
  payment_method text not null check (payment_method in ('pix', 'credit_card')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'expired')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_session_idx on public.payments (stripe_session_id);
create index if not exists payments_intent_idx on public.payments (stripe_payment_intent_id);
create index if not exists payments_subscription_idx on public.payments (stripe_subscription_id);

-- 4. RLS plans -----------------------------------------
alter table public.plans enable row level security;

drop policy if exists "plans_read_active_or_admin" on public.plans;
create policy "plans_read_active_or_admin"
  on public.plans for select
  to authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "plans_admin_all" on public.plans;
create policy "plans_admin_all"
  on public.plans for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. RLS payments --------------------------------------
alter table public.payments enable row level security;

drop policy if exists "payments_user_or_admin_read" on public.payments;
create policy "payments_user_or_admin_read"
  on public.payments for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- INSERT/UPDATE só via service-role (webhook). Sem policies públicas.

-- 6. Função pra revogar Premium expirado ---------------
create or replace function public.expire_premiums()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.profiles
     set is_premium = false,
         premium_expires_at = null,
         premium_since = null
   where is_premium = true
     and premium_expires_at is not null
     and premium_expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_premiums() from public;
grant execute on function public.expire_premiums() to service_role;

-- 7. Função pra marcar Premium pós-pagamento (chamada pelo webhook)
create or replace function public.grant_premium(
  p_user_id uuid,
  p_duration_days int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_current_expires timestamptz;
  v_new_expires timestamptz;
begin
  select premium_expires_at into v_current_expires
    from public.profiles where id = p_user_id;

  -- Se já tem Premium ativo, soma a duração ao que sobra. Senão, parte de agora.
  v_new_expires := greatest(coalesce(v_current_expires, v_now), v_now)
                   + (p_duration_days || ' days')::interval;

  update public.profiles
     set is_premium = true,
         premium_since = coalesce(premium_since, v_now),
         premium_expires_at = v_new_expires
   where id = p_user_id;
end;
$$;

revoke all on function public.grant_premium(uuid, int) from public;
grant execute on function public.grant_premium(uuid, int) to service_role;

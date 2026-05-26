-- =====================================================
-- 0032: RPCs de receita pro painel admin
--   - admin_revenue_summary: total + ultimos 30d
--   - admin_payments_by_plan: breakdown por plano
-- Conta apenas pagamentos com status = 'paid'
-- =====================================================

create or replace function public.admin_revenue_summary()
returns table (
  total_revenue_cents bigint,
  total_payments bigint,
  revenue_30d_cents bigint,
  payments_30d bigint,
  unique_buyers bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0)::bigint as total_revenue_cents,
    count(*) filter (where status = 'paid')::bigint as total_payments,
    coalesce(sum(amount_cents) filter (where status = 'paid' and coalesce(paid_at, created_at) > now() - interval '30 days'), 0)::bigint as revenue_30d_cents,
    count(*) filter (where status = 'paid' and coalesce(paid_at, created_at) > now() - interval '30 days')::bigint as payments_30d,
    count(distinct user_id) filter (where status = 'paid')::bigint as unique_buyers
  from public.payments;
$$;

create or replace function public.admin_payments_by_plan()
returns table (
  plan_id uuid,
  title text,
  duration_days int,
  price_cents int,
  payment_method text,
  qtd bigint,
  revenue_cents bigint,
  last_payment_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.plan_id,
    coalesce(pl.title, '(plano removido)') as title,
    pl.duration_days,
    pl.price_cents,
    pl.payment_method,
    count(*)::bigint as qtd,
    sum(p.amount_cents)::bigint as revenue_cents,
    max(coalesce(p.paid_at, p.created_at)) as last_payment_at
  from public.payments p
  left join public.plans pl on pl.id = p.plan_id
  where p.status = 'paid'
  group by p.plan_id, pl.title, pl.duration_days, pl.price_cents, pl.payment_method
  order by qtd desc, revenue_cents desc;
$$;

revoke all on function public.admin_revenue_summary() from public;
revoke all on function public.admin_payments_by_plan() from public;
grant execute on function public.admin_revenue_summary() to authenticated;
grant execute on function public.admin_payments_by_plan() to authenticated;

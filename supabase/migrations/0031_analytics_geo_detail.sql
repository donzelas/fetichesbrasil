-- =====================================================
-- 0031: RPCs de analytics por regiao (UF) e cidade
-- Reaproveita filtros padrao (sem admin, sem bot)
-- =====================================================

-- Por regiao (estado/UF)
create or replace function public.analytics_by_region(p_days int default 7)
returns table (
  country text,
  region text,
  views bigint,
  uniques bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(country, '?') as country,
    coalesce(region, '?') as region,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
    and region is not null
  group by country, region
  order by views desc
  limit 30;
$$;

-- Por cidade
create or replace function public.analytics_by_city(p_days int default 7)
returns table (
  country text,
  region text,
  city text,
  views bigint,
  uniques bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(country, '?') as country,
    coalesce(region, '?') as region,
    coalesce(city, '?') as city,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
    and city is not null
  group by country, region, city
  order by views desc
  limit 30;
$$;

grant execute on function public.analytics_by_region(int) to authenticated;
grant execute on function public.analytics_by_city(int) to authenticated;

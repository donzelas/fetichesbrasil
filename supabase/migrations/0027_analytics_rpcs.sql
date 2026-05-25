-- =====================================================
-- 0027: RPCs de agregacao para dashboard /admin/analytics
-- Roda em SQL no Postgres (muito mais rapido que queries
-- separadas via SDK).
-- =====================================================

-- 1. Totais (cards do topo)
create or replace function public.analytics_totals(p_days int default 7)
returns table (
  total_views bigint,
  unique_sessions bigint,
  unique_visitors bigint,
  authenticated_views bigint,
  countries bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint as total_views,
    count(distinct session_id)::bigint as unique_sessions,
    count(distinct ip_hash)::bigint as unique_visitors,
    count(*) filter (where is_authenticated)::bigint as authenticated_views,
    count(distinct country)::bigint as countries
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot');
$$;

-- 2. Top paginas
create or replace function public.analytics_top_pages(
  p_days int default 7,
  p_limit int default 20
)
returns table (path text, views bigint, uniques bigint)
language sql
security definer
set search_path = public
as $$
  select
    path,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
  group by path
  order by views desc
  limit p_limit;
$$;

-- 3. Top referrers
create or replace function public.analytics_top_referrers(
  p_days int default 7,
  p_limit int default 15
)
returns table (referrer text, views bigint)
language sql
security definer
set search_path = public
as $$
  select
    case
      when referrer is null or referrer = '' then '(direto)'
      else regexp_replace(referrer, '^https?://(?:www\.)?([^/]+).*', '\1')
    end as referrer,
    count(*)::bigint as views
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
  group by 1
  order by views desc
  limit p_limit;
$$;

-- 4. Por pais
create or replace function public.analytics_by_country(p_days int default 7)
returns table (country text, views bigint, uniques bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(country, '?') as country,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
  group by country
  order by views desc
  limit 20;
$$;

-- 5. Por device/browser/os
create or replace function public.analytics_by_device(p_days int default 7)
returns table (
  device_type text,
  browser text,
  os text,
  views bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(device_type, 'unknown') as device_type,
    coalesce(browser, '?') as browser,
    coalesce(os, '?') as os,
    count(*)::bigint as views
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
  group by 1, 2, 3
  order by views desc
  limit 30;
$$;

-- 6. Por hora (ultimas 24h, pra grafico de barras)
create or replace function public.analytics_by_hour()
returns table (hour timestamptz, views bigint, uniques bigint)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc('hour', viewed_at) as hour,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where viewed_at > now() - interval '24 hours'
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
  group by 1
  order by 1;
$$;

-- 7. Por dia (ultimos 30 dias, pra grafico de tendencia)
create or replace function public.analytics_by_day(p_days int default 30)
returns table (day date, views bigint, uniques bigint)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc('day', viewed_at)::date as day,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and not is_admin_view
    and (device_type is null or device_type <> 'bot')
  group by 1
  order by 1;
$$;

-- 8. Bots (separado, util pra ver se SEO esta funcionando)
create or replace function public.analytics_bots(p_days int default 7)
returns table (browser text, views bigint, paths bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(browser, 'unknown bot') as browser,
    count(*)::bigint as views,
    count(distinct path)::bigint as paths
  from public.page_views
  where viewed_at > now() - (p_days::text || ' days')::interval
    and device_type = 'bot'
  group by 1
  order by views desc
  limit 15;
$$;

grant execute on function public.analytics_totals(int) to authenticated;
grant execute on function public.analytics_top_pages(int, int) to authenticated;
grant execute on function public.analytics_top_referrers(int, int) to authenticated;
grant execute on function public.analytics_by_country(int) to authenticated;
grant execute on function public.analytics_by_device(int) to authenticated;
grant execute on function public.analytics_by_hour() to authenticated;
grant execute on function public.analytics_by_day(int) to authenticated;
grant execute on function public.analytics_bots(int) to authenticated;

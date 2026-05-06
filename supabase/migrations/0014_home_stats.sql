-- =====================================================
-- 0014: Stats globais para os cards CHAT/BLOG da home
-- =====================================================

-- Função: total de usuários online (soma active_users_count das salas vivas)
create or replace function public.global_online_users()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(active_users_count), 0)::int
    from public.chat_rooms
   where deleted_at is null;
$$;

-- Função: salas ativas (não deletadas)
create or replace function public.global_active_rooms()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.chat_rooms
   where deleted_at is null;
$$;

-- Função: posts aprovados nas últimas 24h
create or replace function public.blog_posts_today()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.blog_posts
   where status = 'approved'
     and deleted_at is null
     and approved_at > now() - interval '24 hours';
$$;

grant execute on function public.global_online_users()  to anon, authenticated;
grant execute on function public.global_active_rooms()  to anon, authenticated;
grant execute on function public.blog_posts_today()     to anon, authenticated;

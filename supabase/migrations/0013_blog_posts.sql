-- =====================================================
-- 0013: Blog da comunidade (posts + comentários + likes + denúncias)
-- =====================================================

-- =====================================================
-- 1. Tabela: blog_posts
-- =====================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  fetish_id uuid references public.fetishes(id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  content text not null check (char_length(content) between 1 and 6000),
  image_paths text[] not null default '{}'::text[],
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  like_count int not null default 0,
  comment_count int not null default 0,
  is_pinned boolean not null default false,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint blog_posts_max_5_images check (array_length(image_paths, 1) is null or array_length(image_paths, 1) <= 5)
);

create index if not exists blog_posts_status_idx on public.blog_posts (status, last_activity_at desc) where deleted_at is null;
create index if not exists blog_posts_author_idx on public.blog_posts (author_id, created_at desc);
create index if not exists blog_posts_fetish_idx on public.blog_posts (fetish_id) where deleted_at is null;
create index if not exists blog_posts_pinned_idx on public.blog_posts (is_pinned, last_activity_at desc) where status = 'approved' and deleted_at is null;

-- =====================================================
-- 2. Tabela: blog_post_comments
-- =====================================================
create table if not exists public.blog_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null
);

create index if not exists blog_post_comments_post_created_idx on public.blog_post_comments (post_id, created_at asc) where deleted_at is null;
create index if not exists blog_post_comments_author_idx on public.blog_post_comments (author_id);

-- =====================================================
-- 3. Tabela: blog_post_likes
-- =====================================================
create table if not exists public.blog_post_likes (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists blog_post_likes_user_idx on public.blog_post_likes (user_id);

-- =====================================================
-- 4. Tabela: blog_post_reports (denúncias específicas de post)
-- =====================================================
create table if not exists public.blog_post_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.blog_posts(id) on delete cascade,
  comment_id uuid references public.blog_post_comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blog_post_reports_target check (post_id is not null or comment_id is not null)
);

create index if not exists blog_post_reports_unresolved_idx on public.blog_post_reports (resolved) where resolved = false;

-- =====================================================
-- 5. Triggers de contador e timestamps
-- =====================================================
create or replace function public.touch_blog_post_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_blog_post on public.blog_posts;
create trigger trg_touch_blog_post
before update on public.blog_posts
for each row execute function public.touch_blog_post_updated_at();

-- Like count
create or replace function public.blog_like_count_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.blog_posts set like_count = like_count + 1, last_activity_at = now()
     where id = new.post_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.blog_posts set like_count = greatest(like_count - 1, 0)
     where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_blog_like_count_ins on public.blog_post_likes;
create trigger trg_blog_like_count_ins
after insert on public.blog_post_likes
for each row execute function public.blog_like_count_change();

drop trigger if exists trg_blog_like_count_del on public.blog_post_likes;
create trigger trg_blog_like_count_del
after delete on public.blog_post_likes
for each row execute function public.blog_like_count_change();

-- Comment count
create or replace function public.blog_comment_count_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.blog_posts
       set comment_count = comment_count + 1,
           last_activity_at = now()
     where id = new.post_id;
    return new;
  elsif TG_OP = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.blog_posts
         set comment_count = greatest(comment_count - 1, 0)
       where id = new.post_id;
    elsif old.deleted_at is not null and new.deleted_at is null then
      update public.blog_posts
         set comment_count = comment_count + 1
       where id = new.post_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_blog_comment_count_ins on public.blog_post_comments;
create trigger trg_blog_comment_count_ins
after insert on public.blog_post_comments
for each row execute function public.blog_comment_count_change();

drop trigger if exists trg_blog_comment_count_upd on public.blog_post_comments;
create trigger trg_blog_comment_count_upd
after update on public.blog_post_comments
for each row execute function public.blog_comment_count_change();

-- =====================================================
-- 6. RLS
-- =====================================================
alter table public.blog_posts enable row level security;
alter table public.blog_post_comments enable row level security;
alter table public.blog_post_likes enable row level security;
alter table public.blog_post_reports enable row level security;

-- blog_posts
drop policy if exists "blog_posts_select" on public.blog_posts;
create policy "blog_posts_select" on public.blog_posts
  for select to authenticated
  using (
    public.is_admin()
    or author_id = auth.uid()
    or (status = 'approved' and deleted_at is null)
  );

drop policy if exists "blog_posts_insert" on public.blog_posts;
create policy "blog_posts_insert" on public.blog_posts
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "blog_posts_update_admin" on public.blog_posts;
create policy "blog_posts_update_admin" on public.blog_posts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "blog_posts_delete_admin" on public.blog_posts;
create policy "blog_posts_delete_admin" on public.blog_posts
  for delete to authenticated
  using (public.is_admin());

-- blog_post_comments
drop policy if exists "blog_comments_select" on public.blog_post_comments;
create policy "blog_comments_select" on public.blog_post_comments
  for select to authenticated
  using (
    public.is_admin()
    or author_id = auth.uid()
    or (deleted_at is null and exists (
      select 1 from public.blog_posts p
       where p.id = post_id
         and p.status = 'approved'
         and p.deleted_at is null
    ))
  );

drop policy if exists "blog_comments_insert" on public.blog_post_comments;
create policy "blog_comments_insert" on public.blog_post_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.blog_posts p
       where p.id = post_id
         and p.status = 'approved'
         and p.deleted_at is null
    )
  );

drop policy if exists "blog_comments_update_admin" on public.blog_post_comments;
create policy "blog_comments_update_admin" on public.blog_post_comments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "blog_comments_delete_admin" on public.blog_post_comments;
create policy "blog_comments_delete_admin" on public.blog_post_comments
  for delete to authenticated
  using (public.is_admin());

-- blog_post_likes
drop policy if exists "blog_likes_select" on public.blog_post_likes;
create policy "blog_likes_select" on public.blog_post_likes
  for select to authenticated
  using (true);

drop policy if exists "blog_likes_insert_self" on public.blog_post_likes;
create policy "blog_likes_insert_self" on public.blog_post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.blog_posts p
       where p.id = post_id and p.status = 'approved' and p.deleted_at is null
    )
  );

drop policy if exists "blog_likes_delete_self" on public.blog_post_likes;
create policy "blog_likes_delete_self" on public.blog_post_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- blog_post_reports
drop policy if exists "blog_reports_select_admin" on public.blog_post_reports;
create policy "blog_reports_select_admin" on public.blog_post_reports
  for select to authenticated
  using (public.is_admin() or reporter_id = auth.uid());

drop policy if exists "blog_reports_insert_self" on public.blog_post_reports;
create policy "blog_reports_insert_self" on public.blog_post_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "blog_reports_update_admin" on public.blog_post_reports;
create policy "blog_reports_update_admin" on public.blog_post_reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================
-- 7. RPCs
-- =====================================================

-- Cria post sempre como pending. Free=1/24h, Premium=5/24h, Admin sem limite.
create or replace function public.create_blog_post(
  p_title text,
  p_content text,
  p_fetish_id uuid,
  p_image_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_premium boolean;
  v_is_admin boolean;
  v_limit int;
  v_recent int;
  v_post_id uuid;
begin
  if v_user_id is null then
    raise exception 'Você precisa estar logado.';
  end if;

  if char_length(coalesce(p_title, '')) < 3 then
    raise exception 'Título precisa ter pelo menos 3 caracteres.';
  end if;
  if char_length(coalesce(p_content, '')) < 1 then
    raise exception 'A descrição não pode ficar em branco.';
  end if;
  if array_length(coalesce(p_image_paths, '{}'::text[]), 1) > 5 then
    raise exception 'No máximo 5 imagens por post.';
  end if;

  select is_premium, is_admin into v_is_premium, v_is_admin
    from public.profiles where id = v_user_id;

  if coalesce(v_is_admin, false) then
    v_limit := 999;
  elsif coalesce(v_is_premium, false) then
    v_limit := 5;
  else
    v_limit := 1;
  end if;

  select count(*) into v_recent
    from public.blog_posts
   where author_id = v_user_id
     and created_at > now() - interval '24 hours';

  if v_recent >= v_limit then
    raise exception 'Limite diário de posts atingido (% nas últimas 24h).', v_limit;
  end if;

  insert into public.blog_posts (author_id, fetish_id, title, content, image_paths, status)
  values (v_user_id, p_fetish_id, p_title, p_content, coalesce(p_image_paths, '{}'::text[]), 'pending')
  returning id into v_post_id;

  return v_post_id;
end;
$$;

-- Toggle like
create or replace function public.toggle_blog_post_like(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existed boolean;
begin
  if v_user_id is null then
    raise exception 'Você precisa estar logado.';
  end if;

  if not exists (select 1 from public.blog_posts where id = p_post_id and status = 'approved' and deleted_at is null) then
    raise exception 'Post indisponível.';
  end if;

  delete from public.blog_post_likes
   where post_id = p_post_id and user_id = v_user_id
   returning true into v_existed;

  if v_existed is null then
    insert into public.blog_post_likes (post_id, user_id) values (p_post_id, v_user_id);
    return true;
  end if;
  return false;
end;
$$;

-- Comentário
create or replace function public.add_blog_comment(p_post_id uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_recent int;
  v_comment_id uuid;
begin
  if v_user_id is null then
    raise exception 'Você precisa estar logado.';
  end if;

  if char_length(coalesce(p_content, '')) < 1 or char_length(p_content) > 1000 then
    raise exception 'Comentário entre 1 e 1000 caracteres.';
  end if;

  if not exists (select 1 from public.blog_posts where id = p_post_id and status = 'approved' and deleted_at is null) then
    raise exception 'Post indisponível.';
  end if;

  select is_admin into v_is_admin from public.profiles where id = v_user_id;

  if not coalesce(v_is_admin, false) then
    select count(*) into v_recent
      from public.blog_post_comments
     where author_id = v_user_id
       and created_at > now() - interval '1 hour';
    if v_recent >= 30 then
      raise exception 'Você comentou muito rápido. Tente novamente daqui a pouco.';
    end if;
  end if;

  insert into public.blog_post_comments (post_id, author_id, content)
  values (p_post_id, v_user_id, p_content)
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

-- Soft delete do próprio post
create or replace function public.soft_delete_my_blog_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Você precisa estar logado.';
  end if;
  update public.blog_posts
     set deleted_at = now()
   where id = p_post_id
     and author_id = v_user_id
     and deleted_at is null;
end;
$$;

-- Aprovar (admin)
create or replace function public.approve_blog_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  update public.blog_posts
     set status = 'approved',
         approved_by = v_user_id,
         approved_at = now(),
         rejection_reason = null,
         last_activity_at = now()
   where id = p_post_id;
end;
$$;

-- Rejeitar (admin)
create or replace function public.reject_blog_post(p_post_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  if char_length(coalesce(p_reason, '')) < 3 then
    raise exception 'Informe um motivo (3+ caracteres).';
  end if;
  update public.blog_posts
     set status = 'rejected',
         rejection_reason = p_reason,
         approved_by = v_user_id,
         approved_at = now()
   where id = p_post_id;
end;
$$;

-- Excluir comentário (admin)
create or replace function public.delete_blog_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  update public.blog_post_comments
     set deleted_at = now(), deleted_by = v_user_id
   where id = p_comment_id and deleted_at is null;
end;
$$;

-- Pinar (admin)
create or replace function public.pin_blog_post(p_post_id uuid, p_pin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = v_user_id and is_admin = true) then
    raise exception 'Apenas admins.';
  end if;
  update public.blog_posts set is_pinned = coalesce(p_pin, false) where id = p_post_id;
end;
$$;

-- Denunciar post/comentário
create or replace function public.report_blog(
  p_post_id uuid,
  p_comment_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Você precisa estar logado.';
  end if;
  if p_post_id is null and p_comment_id is null then
    raise exception 'Informe post ou comentário.';
  end if;
  if char_length(coalesce(p_reason, '')) < 3 then
    raise exception 'Motivo precisa ter ao menos 3 caracteres.';
  end if;
  insert into public.blog_post_reports (reporter_id, post_id, comment_id, reason)
  values (v_user_id, p_post_id, p_comment_id, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_blog_post(text, text, uuid, text[]) to authenticated;
grant execute on function public.toggle_blog_post_like(uuid)                to authenticated;
grant execute on function public.add_blog_comment(uuid, text)               to authenticated;
grant execute on function public.soft_delete_my_blog_post(uuid)             to authenticated;
grant execute on function public.approve_blog_post(uuid)                    to authenticated;
grant execute on function public.reject_blog_post(uuid, text)               to authenticated;
grant execute on function public.delete_blog_comment(uuid)                  to authenticated;
grant execute on function public.pin_blog_post(uuid, boolean)               to authenticated;
grant execute on function public.report_blog(uuid, uuid, text)              to authenticated;

-- =====================================================
-- 8. Storage bucket privado: feed-images
-- =====================================================
insert into storage.buckets (id, name, public)
values ('feed-images', 'feed-images', false)
on conflict (id) do update set public = false;

-- Convenção de path: <user_id>/<random>.jpg
-- Leitura permitida pra:
--  - admin
--  - autor do post (incluindo pendentes/rejeitados)
--  - qualquer authenticated se a imagem está em post APROVADO

drop policy if exists "feed_images_select" on storage.objects;
create policy "feed_images_select" on storage.objects for select
to authenticated
using (
  bucket_id = 'feed-images'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.blog_posts p
       where p.author_id::text = split_part(name, '/', 1)
         and p.status = 'approved'
         and p.deleted_at is null
         and (name = any (p.image_paths))
    )
  )
);

drop policy if exists "feed_images_insert" on storage.objects;
create policy "feed_images_insert" on storage.objects for insert
to authenticated
with check (
  bucket_id = 'feed-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "feed_images_delete" on storage.objects;
create policy "feed_images_delete" on storage.objects for delete
to authenticated
using (
  bucket_id = 'feed-images'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

-- =====================================================
-- 9. Realtime publication
-- =====================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.blog_posts;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.blog_post_comments;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.blog_post_likes;
  exception when duplicate_object then null; end;
end$$;

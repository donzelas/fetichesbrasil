-- =====================================================
-- 0001_init.sql — Schema base do Fetiches Brasil
-- =====================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- profiles (1:1 com auth.users)
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  is_premium boolean not null default false,
  premium_since timestamptz,
  is_admin boolean not null default false,
  current_room_id uuid,
  last_room_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_is_premium_idx on public.profiles (is_premium) where is_premium = true;
create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

-- =====================================================
-- categories (categorias-mãe)
-- =====================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  emoji text,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_sort_idx on public.categories (sort_order);

-- =====================================================
-- fetishes (filhos das categorias)
-- =====================================================
create table public.fetishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index fetishes_category_idx on public.fetishes (category_id);
create index fetishes_sort_idx on public.fetishes (sort_order);

-- =====================================================
-- chat_rooms
-- =====================================================
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  fetish_id uuid references public.fetishes(id) on delete set null,
  name text not null,
  description text,
  unlock_message text not null default 'Esta sala é exclusiva para usuários PREMIUM. Assine agora para acessar chats privados, imagens e salas exclusivas.',
  is_premium_only boolean not null default true,
  is_featured boolean not null default false,
  active_users_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index chat_rooms_owner_idx on public.chat_rooms (owner_id);
create index chat_rooms_fetish_idx on public.chat_rooms (fetish_id);
create index chat_rooms_featured_idx on public.chat_rooms (is_featured) where is_featured = true and deleted_at is null;
create index chat_rooms_active_idx on public.chat_rooms (active_users_count desc) where deleted_at is null;
create index chat_rooms_deleted_idx on public.chat_rooms (deleted_at);

-- FK de profiles.current_room_id → chat_rooms.id (depois de criar chat_rooms)
alter table public.profiles
  add constraint profiles_current_room_fk
  foreign key (current_room_id) references public.chat_rooms(id) on delete set null;

-- =====================================================
-- messages
-- =====================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now(),
  check (content is not null or image_url is not null)
);

create index messages_room_created_idx on public.messages (room_id, created_at desc);
create index messages_user_idx on public.messages (user_id);

-- =====================================================
-- room_participants (snapshot — Presence é a fonte primária)
-- =====================================================
create table public.room_participants (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index room_participants_user_idx on public.room_participants (user_id);

-- =====================================================
-- updated_at trigger genérico
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

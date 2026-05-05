-- =====================================================
-- 0002_triggers.sql — Lógica de negócio
-- =====================================================

-- =====================================================
-- 1. Auto-criar profile ao registrar via Supabase Auth
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- 2. Atualizar last_activity_at quando chega mensagem
-- =====================================================
create or replace function public.touch_room_on_message()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.chat_rooms
     set last_activity_at = now()
   where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_room on public.messages;
create trigger messages_touch_room
after insert on public.messages
for each row execute function public.touch_room_on_message();

-- =====================================================
-- 3. Validação ao criar sala
--    - Usuário deve ser premium
--    - Só pode ter 1 sala ATIVA (não soft-deleted)
--    - Última criação tem que ser > 30 dias
-- =====================================================
create or replace function public.validate_room_creation()
returns trigger
language plpgsql
security definer
as $$
declare
  v_is_premium boolean;
  v_last_created timestamptz;
  v_active_count int;
begin
  select is_premium, last_room_created_at
    into v_is_premium, v_last_created
    from public.profiles
   where id = new.owner_id;

  if not coalesce(v_is_premium, false) then
    raise exception 'Apenas usuários PREMIUM podem criar salas';
  end if;

  select count(*) into v_active_count
    from public.chat_rooms
   where owner_id = new.owner_id and deleted_at is null;

  if v_active_count >= 1 then
    raise exception 'Você já possui uma sala ativa. Delete-a antes de criar outra.';
  end if;

  if v_last_created is not null and v_last_created > (now() - interval '30 days') then
    raise exception 'Você só pode criar uma sala a cada 30 dias. Próxima disponível em: %',
      to_char(v_last_created + interval '30 days', 'DD/MM/YYYY');
  end if;

  update public.profiles
     set last_room_created_at = now()
   where id = new.owner_id;

  return new;
end;
$$;

drop trigger if exists chat_rooms_validate on public.chat_rooms;
create trigger chat_rooms_validate
before insert on public.chat_rooms
for each row execute function public.validate_room_creation();

-- =====================================================
-- 4. Helpers para checagem de claims em RLS
-- =====================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_premium from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_room_owner(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.chat_rooms
     where id = p_room_id and owner_id = auth.uid()
  );
$$;

-- =====================================================
-- 5. RPC: leave_current_room (limpa current_room_id)
-- =====================================================
create or replace function public.leave_current_room()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.room_participants
   where user_id = auth.uid();

  update public.profiles
     set current_room_id = null
   where id = auth.uid();
end;
$$;

-- =====================================================
-- 6. RPC: join_room (atomicamente troca de sala)
-- =====================================================
create or replace function public.join_room(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_is_premium boolean;
  v_room_premium_only boolean;
  v_room_deleted timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select is_premium_only, deleted_at
    into v_room_premium_only, v_room_deleted
    from public.chat_rooms
   where id = p_room_id;

  if v_room_deleted is not null then
    raise exception 'Sala não existe ou foi removida';
  end if;

  select is_premium into v_is_premium
    from public.profiles where id = auth.uid();

  if v_room_premium_only and not coalesce(v_is_premium, false) then
    raise exception 'Esta sala é exclusiva para usuários PREMIUM';
  end if;

  delete from public.room_participants
   where user_id = auth.uid();

  insert into public.room_participants (room_id, user_id)
  values (p_room_id, auth.uid())
  on conflict (room_id, user_id) do nothing;

  update public.profiles
     set current_room_id = p_room_id
   where id = auth.uid();
end;
$$;

-- =====================================================
-- 7. RPC: soft_delete_room
-- =====================================================
create or replace function public.soft_delete_room(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not (public.is_room_owner(p_room_id) or public.is_admin()) then
    raise exception 'Sem permissão';
  end if;

  update public.chat_rooms
     set deleted_at = now()
   where id = p_room_id and deleted_at is null;

  update public.profiles
     set current_room_id = null
   where current_room_id = p_room_id;

  delete from public.room_participants where room_id = p_room_id;
end;
$$;

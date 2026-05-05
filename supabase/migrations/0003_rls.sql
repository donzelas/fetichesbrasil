-- =====================================================
-- 0003_rls.sql — Row Level Security
-- =====================================================

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.fetishes          enable row level security;
alter table public.chat_rooms        enable row level security;
alter table public.messages          enable row level security;
alter table public.room_participants enable row level security;

-- =====================================================
-- profiles
-- =====================================================
create policy "profiles_select_public"
on public.profiles for select
to anon, authenticated
using (true);

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  -- usuários comuns NÃO podem se promover sozinhos
  and is_admin = (select is_admin from public.profiles where id = auth.uid())
  and is_premium = (select is_premium from public.profiles where id = auth.uid())
);

create policy "profiles_admin_full"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================
-- categories / fetishes (público read, admin escreve)
-- =====================================================
create policy "categories_select_public"
on public.categories for select
to anon, authenticated
using (true);

create policy "categories_admin_write"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "fetishes_select_public"
on public.fetishes for select
to anon, authenticated
using (true);

create policy "fetishes_admin_write"
on public.fetishes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================
-- chat_rooms
-- =====================================================
-- Todos veem (incluindo anônimos) — nome e metadata são públicos.
-- O bloqueio de CONTEÚDO acontece em messages e room_participants.
create policy "chat_rooms_select_public"
on public.chat_rooms for select
to anon, authenticated
using (deleted_at is null);

-- Admin vê tudo, inclusive deletadas
create policy "chat_rooms_admin_select_all"
on public.chat_rooms for select
to authenticated
using (public.is_admin());

-- Insert: só usuário premium (validação extra no trigger)
create policy "chat_rooms_insert_premium"
on public.chat_rooms for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_premium()
);

-- Update: dono ou admin
-- (is_featured só pode ser alterado por admin — checado abaixo)
create policy "chat_rooms_update_owner"
on public.chat_rooms for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and is_featured = (select is_featured from public.chat_rooms cr where cr.id = chat_rooms.id)
);

create policy "chat_rooms_update_admin"
on public.chat_rooms for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "chat_rooms_delete_owner_or_admin"
on public.chat_rooms for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

-- =====================================================
-- messages — só premium e dono da sala
-- =====================================================
create policy "messages_select_premium_or_owner"
on public.messages for select
to authenticated
using (
  public.is_premium()
  or public.is_room_owner(room_id)
  or public.is_admin()
);

create policy "messages_insert_premium"
on public.messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and (public.is_premium() or public.is_room_owner(room_id))
  and exists (
    select 1 from public.chat_rooms r
     where r.id = room_id
       and r.deleted_at is null
  )
);

create policy "messages_delete_self_or_admin"
on public.messages for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- =====================================================
-- room_participants — só premium / próprio user
-- =====================================================
create policy "room_participants_select_premium"
on public.room_participants for select
to authenticated
using (public.is_premium() or public.is_admin());

create policy "room_participants_insert_self_premium"
on public.room_participants for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_premium()
);

create policy "room_participants_delete_self"
on public.room_participants for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- =====================================================
-- Permissões de execução para os helpers e RPCs
-- =====================================================
grant execute on function public.is_admin()                  to anon, authenticated;
grant execute on function public.is_premium()                to anon, authenticated;
grant execute on function public.is_room_owner(uuid)         to anon, authenticated;
grant execute on function public.join_room(uuid)             to authenticated;
grant execute on function public.leave_current_room()        to authenticated;
grant execute on function public.soft_delete_room(uuid)      to authenticated;

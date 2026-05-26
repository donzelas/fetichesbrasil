-- =====================================================
-- 0029: Atualiza RLS pra considerar trial ativo
--
-- Onde antes era: is_premium() OR is_admin()
-- Agora vira:    is_premium() OR is_admin() OR is_in_trial()
--
-- Tabelas afetadas:
--   - messages (SELECT, INSERT)
--   - room_participants (SELECT, INSERT)
--   - chat_rooms (sem mudanca - listagem ja era publica)
--
-- IMPORTANTE: chat_rooms.deleted_at filtra deletadas mas a
-- listagem em si fica publica. Quem bloqueia conteudo e
-- messages. Bloquear listagem confunde SEO/Googlebot.
-- =====================================================

-- =====================================================
-- messages
-- =====================================================
drop policy if exists "messages_select_premium_or_owner" on public.messages;
create policy "messages_select_premium_or_owner"
on public.messages for select
to authenticated
using (
  public.is_premium()
  or public.is_room_owner(room_id)
  or public.is_admin()
  or public.is_in_trial()
);

drop policy if exists "messages_insert_premium" on public.messages;
create policy "messages_insert_premium"
on public.messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_premium()
    or public.is_room_owner(room_id)
    or public.is_in_trial()
  )
  and exists (
    select 1 from public.chat_rooms r
     where r.id = room_id
       and r.deleted_at is null
  )
);

-- =====================================================
-- room_participants
-- =====================================================
drop policy if exists "room_participants_select_premium" on public.room_participants;
create policy "room_participants_select_premium"
on public.room_participants for select
to authenticated
using (
  public.is_premium()
  or public.is_admin()
  or public.is_in_trial()
);

drop policy if exists "room_participants_insert_self_premium" on public.room_participants;
create policy "room_participants_insert_self_premium"
on public.room_participants for insert
to authenticated
with check (
  user_id = auth.uid()
  and (public.is_premium() or public.is_in_trial())
);

-- =====================================================
-- RPC join_room: precisa permitir trial
-- (a funcao ja existe, vamos sobrescrever)
-- =====================================================
create or replace function public.join_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_premium boolean;
  v_is_admin boolean;
  v_is_in_trial boolean;
  v_room_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Voce precisa estar logado.';
  end if;

  select is_premium, is_admin
    into v_is_premium, v_is_admin
    from public.profiles where id = v_user_id;

  v_is_in_trial := public.is_in_trial();

  if not (coalesce(v_is_premium, false) or coalesce(v_is_admin, false) or v_is_in_trial) then
    raise exception 'Trial expirado. Vire Premium para continuar.';
  end if;

  select exists (
    select 1 from public.chat_rooms
     where id = p_room_id
       and deleted_at is null
  ) into v_room_exists;

  if not v_room_exists then
    raise exception 'Sala nao encontrada.';
  end if;

  -- Atualiza current_room_id
  update public.profiles
     set current_room_id = p_room_id
   where id = v_user_id;

  -- Insere/atualiza participacao
  insert into public.room_participants (room_id, user_id, joined_at, last_seen_at)
  values (p_room_id, v_user_id, now(), now())
  on conflict (room_id, user_id) do update
    set last_seen_at = now();
end;
$$;

grant execute on function public.join_room(uuid) to authenticated;

-- =====================================================
-- 0030: Sala visivel apenas se o dono esta ativo
--
-- Regras:
--   - owner_id IS NULL    -> sala do sistema (sempre ativa)
--   - is_admin = true     -> sempre ativa
--   - is_premium = true   -> sempre ativa
--   - is_in_trial = true  -> ativa durante a 1h
--   - resto               -> oculta (RLS esconde da listagem + bloqueia acesso direto)
--
-- Quando o dono volta a pagar Premium, a sala REAPARECE automaticamente
-- com todo o historico de mensagens intacto.
--
-- Cron diario faz soft-delete de salas com dono inativo ha > 30 dias
-- (zombies). O cascade da FK messages.room_id_fkey apaga as msgs junto.
-- =====================================================

-- 1. Helper: dono ativo? -------------------------------
create or replace function public.is_owner_active(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_owner is null then true
    else exists (
      select 1
        from public.profiles
       where id = p_owner
         and (
           coalesce(is_admin, false)
           or coalesce(is_premium, false)
           or (
             trial_started_at is not null
             and trial_started_at + interval '1 hour' > now()
           )
         )
    )
  end;
$$;

grant execute on function public.is_owner_active(uuid) to anon, authenticated;

-- 2. chat_rooms: nova policy de SELECT publica --------
drop policy if exists "chat_rooms_select_public" on public.chat_rooms;
create policy "chat_rooms_select_public"
on public.chat_rooms for select
to anon, authenticated
using (
  deleted_at is null
  and public.is_owner_active(owner_id)
);

-- Dono sempre ve a propria sala (mesmo quando esta oculta pra publico).
-- Permite mostrar banner "sua sala esta oculta - renove Premium".
drop policy if exists "chat_rooms_select_own" on public.chat_rooms;
create policy "chat_rooms_select_own"
on public.chat_rooms for select
to authenticated
using (
  owner_id = auth.uid()
  and deleted_at is null
);

-- 3. chat_rooms: INSERT aceita trial tambem -----------
drop policy if exists "chat_rooms_insert_premium" on public.chat_rooms;
drop policy if exists "chat_rooms_insert_premium_or_trial" on public.chat_rooms;
create policy "chat_rooms_insert_premium_or_trial"
on public.chat_rooms for insert
to authenticated
with check (
  owner_id = auth.uid()
  and (public.is_premium() or public.is_in_trial())
);

-- 4. messages: SELECT/INSERT exigem sala com dono ativo ----
-- Usuario nao pode ver/escrever em sala cujo dono esta inativo,
-- mesmo que ele proprio seja Premium. Quando o dono pagar de novo,
-- o acesso volta.
drop policy if exists "messages_select_premium_or_owner" on public.messages;
create policy "messages_select_premium_or_owner"
on public.messages for select
to authenticated
using (
  (
    public.is_premium()
    or public.is_room_owner(room_id)
    or public.is_admin()
    or public.is_in_trial()
  )
  and (
    -- admin ve tudo (inclusive zumbi); resto exige dono ativo
    public.is_admin()
    or exists (
      select 1 from public.chat_rooms r
       where r.id = room_id
         and r.deleted_at is null
         and public.is_owner_active(r.owner_id)
    )
  )
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
       and public.is_owner_active(r.owner_id)
  )
);

-- 5. room_participants: idem --------------------------
drop policy if exists "room_participants_select_premium" on public.room_participants;
create policy "room_participants_select_premium"
on public.room_participants for select
to authenticated
using (
  (
    public.is_premium()
    or public.is_admin()
    or public.is_in_trial()
  )
  and (
    public.is_admin()
    or exists (
      select 1 from public.chat_rooms r
       where r.id = room_id
         and r.deleted_at is null
         and public.is_owner_active(r.owner_id)
    )
  )
);

drop policy if exists "room_participants_insert_self_premium" on public.room_participants;
create policy "room_participants_insert_self_premium"
on public.room_participants for insert
to authenticated
with check (
  user_id = auth.uid()
  and (public.is_premium() or public.is_in_trial())
  and exists (
    select 1 from public.chat_rooms r
     where r.id = room_id
       and r.deleted_at is null
       and public.is_owner_active(r.owner_id)
  )
);

-- 6. RPC join_room: bloqueia se dono inativo ----------
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
  v_room_owner uuid;
  v_room_deleted timestamptz;
  v_owner_active boolean;
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

  select owner_id, deleted_at
    into v_room_owner, v_room_deleted
    from public.chat_rooms
   where id = p_room_id;

  if v_room_owner is null and v_room_deleted is null then
    -- sala do sistema, sempre ok
    null;
  elsif v_room_deleted is not null then
    raise exception 'Sala nao encontrada.';
  else
    v_owner_active := public.is_owner_active(v_room_owner);
    if not v_owner_active and not coalesce(v_is_admin, false) then
      raise exception 'Esta sala esta temporariamente indisponivel.';
    end if;
  end if;

  update public.profiles
     set current_room_id = p_room_id
   where id = v_user_id;

  insert into public.room_participants (room_id, user_id, joined_at)
  values (p_room_id, v_user_id, now())
  on conflict (room_id, user_id) do update
    set joined_at = excluded.joined_at;
end;
$$;

grant execute on function public.join_room(uuid) to authenticated;

-- 7. RPC pra dashboards: contar quantas salas do user estao ocultas
create or replace function public.my_hidden_rooms_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.chat_rooms r
   where r.owner_id = auth.uid()
     and r.deleted_at is null
     and not public.is_owner_active(r.owner_id);
$$;

grant execute on function public.my_hidden_rooms_count() to authenticated;

-- 8. Cron diario: soft-delete zumbis > 30 dias --------
-- Salas cujo dono esta inativo (sem premium, sem trial valido, sem admin)
-- ha mais de 30 dias sao soft-deletadas. O cascade da FK em messages
-- apaga o historico junto.
create or replace function public.cleanup_zombie_rooms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.chat_rooms r
     set deleted_at = now()
    from public.profiles p
   where r.owner_id is not null
     and r.deleted_at is null
     and r.owner_id = p.id
     and not coalesce(p.is_admin, false)
     and not coalesce(p.is_premium, false)
     and (p.trial_started_at is null or p.trial_started_at + interval '1 hour' < now())
     and (
       -- considera "30 dias inativo" se premium venceu ha > 30 dias
       -- OU se nunca foi premium e trial expirou ha > 30 dias
       (p.premium_expires_at is not null and p.premium_expires_at < now() - interval '30 days')
       or (p.premium_expires_at is null
           and p.trial_started_at is not null
           and p.trial_started_at + interval '1 hour' < now() - interval '30 days')
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.cleanup_zombie_rooms() from public;
grant execute on function public.cleanup_zombie_rooms() to service_role;

-- Remove agendamento anterior caso reaplicada
do $$
declare
  v_job_id integer;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'cleanup-zombie-rooms-daily';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

-- Agenda execucao diaria as 04:23 UTC (madrugada BR, fora de horario de pico)
select cron.schedule(
  'cleanup-zombie-rooms-daily',
  '23 4 * * *',
  $$select public.cleanup_zombie_rooms();$$
);

comment on function public.is_owner_active(uuid) is
  'True se sala deve estar visivel publicamente baseado no estado do dono.';
comment on function public.cleanup_zombie_rooms() is
  'Soft-delete em salas com dono inativo ha > 30 dias. Roda diariamente as 04:23 UTC.';

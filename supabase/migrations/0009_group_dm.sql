-- =====================================================
-- 0009: Multi-participantes nos DMs (chat individual vira chat de grupo)
-- =====================================================

-- 1. Tabela de participantes ----------------------------
create table if not exists public.dm_thread_participants (
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (thread_id, user_id)
);

create index if not exists dm_thread_participants_user_idx
  on public.dm_thread_participants (user_id);

-- 2. Backfill a partir das colunas user_a_id / user_b_id ---
insert into public.dm_thread_participants (thread_id, user_id, added_at)
select id, user_a_id, created_at from public.dm_threads where user_a_id is not null
on conflict (thread_id, user_id) do nothing;

insert into public.dm_thread_participants (thread_id, user_id, added_at)
select id, user_b_id, created_at from public.dm_threads where user_b_id is not null
on conflict (thread_id, user_id) do nothing;

-- 3. Solta constraints antigas para permitir threads >2 e legacy ---
alter table public.dm_threads drop constraint if exists dm_threads_canonical_pair;
alter table public.dm_threads drop constraint if exists dm_threads_unique_pair;
alter table public.dm_threads alter column user_a_id drop not null;
alter table public.dm_threads alter column user_b_id drop not null;

-- 4. RLS no participants ------------------------------------
alter table public.dm_thread_participants enable row level security;

drop policy if exists "dm_participants_select_member_or_admin" on public.dm_thread_participants;
create policy "dm_participants_select_member_or_admin"
on public.dm_thread_participants for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = public.dm_thread_participants.thread_id
       and p.user_id = auth.uid()
  )
);

drop policy if exists "dm_participants_insert_by_member" on public.dm_thread_participants;
create policy "dm_participants_insert_by_member"
on public.dm_thread_participants for insert
to authenticated
with check (
  exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = public.dm_thread_participants.thread_id
       and p.user_id = auth.uid()
  )
  or user_id = auth.uid()
);

-- 5. RLS de dm_threads usando participants ----------------
drop policy if exists "dm_threads_select_participants" on public.dm_threads;
create policy "dm_threads_select_participants"
on public.dm_threads for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = id and p.user_id = auth.uid()
  )
);

drop policy if exists "dm_threads_insert_participant" on public.dm_threads;
drop policy if exists "dm_threads_insert_authenticated" on public.dm_threads;
create policy "dm_threads_insert_authenticated"
on public.dm_threads for insert
to authenticated
with check (true);

-- 6. RLS de dm_messages usando participants ---------------
drop policy if exists "dm_messages_select_participants" on public.dm_messages;
create policy "dm_messages_select_participants"
on public.dm_messages for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = thread_id and p.user_id = auth.uid()
  )
);

drop policy if exists "dm_messages_insert_self" on public.dm_messages;
create policy "dm_messages_insert_self"
on public.dm_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = thread_id and p.user_id = auth.uid()
  )
);

drop policy if exists "dm_messages_update_read_recipient" on public.dm_messages;
create policy "dm_messages_update_read_recipient"
on public.dm_messages for update
to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = thread_id and p.user_id = auth.uid()
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id = thread_id and p.user_id = auth.uid()
  )
);

-- 7. Storage RLS dm-images via participants ---------------
drop policy if exists "dm_images_select_participants" on storage.objects;
create policy "dm_images_select_participants"
on storage.objects for select
to authenticated
using (
  bucket_id = 'dm-images'
  and (
    public.is_admin()
    or exists (
      select 1
        from public.dm_thread_participants p
       where p.thread_id::text = split_part(name, '/', 1)
         and p.user_id = auth.uid()
    )
  )
);

drop policy if exists "dm_images_insert_participants" on storage.objects;
create policy "dm_images_insert_participants"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dm-images'
  and split_part(name, '/', 2) = auth.uid()::text
  and exists (
    select 1
      from public.dm_thread_participants p
     where p.thread_id::text = split_part(name, '/', 1)
       and p.user_id = auth.uid()
  )
);

-- 8. RPC: open_dm_thread (mantém comportamento 1:1; cria thread + 2 participantes) ----
create or replace function public.open_dm_thread(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_thread_id uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if p_other_user_id is null or auth.uid() = p_other_user_id then
    raise exception 'Usuário inválido';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  -- Procura thread existente que tenha exatamente 2 participantes (eu + o outro)
  select t.id into v_thread_id
    from public.dm_threads t
   where (
           select count(*) from public.dm_thread_participants p where p.thread_id = t.id
         ) = 2
     and exists (
           select 1 from public.dm_thread_participants p
            where p.thread_id = t.id and p.user_id = auth.uid()
         )
     and exists (
           select 1 from public.dm_thread_participants p
            where p.thread_id = t.id and p.user_id = p_other_user_id
         )
   order by t.created_at asc
   limit 1;

  if v_thread_id is null then
    insert into public.dm_threads default values returning id into v_thread_id;
    insert into public.dm_thread_participants (thread_id, user_id, added_by)
    values
      (v_thread_id, auth.uid(),         auth.uid()),
      (v_thread_id, p_other_user_id,    auth.uid())
    on conflict (thread_id, user_id) do nothing;
  end if;

  return v_thread_id;
end;
$$;

-- 9. RPC: add_dm_participant (qualquer participante adiciona outro) ---
create or replace function public.add_dm_participant(p_thread_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if p_user_id is null then raise exception 'Usuário inválido'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  if not exists (
    select 1 from public.dm_thread_participants
     where thread_id = p_thread_id and user_id = auth.uid()
  ) then
    raise exception 'Você não participa desta conversa';
  end if;

  insert into public.dm_thread_participants (thread_id, user_id, added_by)
  values (p_thread_id, p_user_id, auth.uid())
  on conflict (thread_id, user_id) do nothing;
end;
$$;

grant execute on function public.add_dm_participant(uuid, uuid) to authenticated;

-- 10. Realtime ----------------------------------------------
alter publication supabase_realtime add table public.dm_thread_participants;

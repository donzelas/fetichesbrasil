-- =====================================================
-- 0007: Direct Messages (1:1) + User Reports
-- =====================================================

-- =====================================================
-- 1. Tabela: dm_threads (par canônico de usuários)
-- =====================================================
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint dm_threads_canonical_pair check (user_a_id < user_b_id),
  constraint dm_threads_unique_pair unique (user_a_id, user_b_id)
);

create index if not exists dm_threads_user_a_idx on public.dm_threads (user_a_id);
create index if not exists dm_threads_user_b_idx on public.dm_threads (user_b_id);
create index if not exists dm_threads_last_message_idx on public.dm_threads (last_message_at desc nulls last);

-- =====================================================
-- 2. Tabela: dm_messages
-- =====================================================
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 5000 and char_length(content) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists dm_messages_thread_created_idx on public.dm_messages (thread_id, created_at desc);
create index if not exists dm_messages_sender_idx on public.dm_messages (sender_id);

-- Trigger: atualiza last_message_at do thread quando uma mensagem é inserida
create or replace function public.touch_dm_thread_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.dm_threads
     set last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_dm_thread on public.dm_messages;
create trigger trg_touch_dm_thread
after insert on public.dm_messages
for each row execute function public.touch_dm_thread_last_message();

-- =====================================================
-- 3. Tabela: user_reports (denúncias)
-- =====================================================
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.chat_rooms(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_reports_no_self check (reporter_id <> reported_id)
);

create index if not exists user_reports_reported_idx on public.user_reports (reported_id);
create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id);
create index if not exists user_reports_unresolved_idx on public.user_reports (resolved) where resolved = false;

-- =====================================================
-- 4. RLS
-- =====================================================
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.user_reports enable row level security;

-- DM threads: somente participantes (ou admin) podem ler/inserir
drop policy if exists "dm_threads_select_participants" on public.dm_threads;
create policy "dm_threads_select_participants"
on public.dm_threads for select
to authenticated
using (
  auth.uid() = user_a_id
  or auth.uid() = user_b_id
  or public.is_admin()
);

drop policy if exists "dm_threads_insert_participant" on public.dm_threads;
create policy "dm_threads_insert_participant"
on public.dm_threads for insert
to authenticated
with check (
  auth.uid() = user_a_id or auth.uid() = user_b_id
);

-- DM messages: somente participantes do thread podem ler; somente sender = self pode inserir
drop policy if exists "dm_messages_select_participants" on public.dm_messages;
create policy "dm_messages_select_participants"
on public.dm_messages for select
to authenticated
using (
  exists (
    select 1 from public.dm_threads t
    where t.id = thread_id
      and (t.user_a_id = auth.uid() or t.user_b_id = auth.uid())
  )
  or public.is_admin()
);

drop policy if exists "dm_messages_insert_self" on public.dm_messages;
create policy "dm_messages_insert_self"
on public.dm_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.dm_threads t
    where t.id = thread_id
      and (t.user_a_id = auth.uid() or t.user_b_id = auth.uid())
  )
);

-- DM messages: marcar como lida (UPDATE de read_at) só pelo destinatário
drop policy if exists "dm_messages_update_read_recipient" on public.dm_messages;
create policy "dm_messages_update_read_recipient"
on public.dm_messages for update
to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.dm_threads t
    where t.id = thread_id
      and (t.user_a_id = auth.uid() or t.user_b_id = auth.uid())
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.dm_threads t
    where t.id = thread_id
      and (t.user_a_id = auth.uid() or t.user_b_id = auth.uid())
  )
);

-- User reports: qualquer usuário autenticado pode denunciar (a si mesmo bloqueado por CHECK)
drop policy if exists "user_reports_insert_self" on public.user_reports;
create policy "user_reports_insert_self"
on public.user_reports for insert
to authenticated
with check (reporter_id = auth.uid());

-- User reports: somente admin lê
drop policy if exists "user_reports_select_admin" on public.user_reports;
create policy "user_reports_select_admin"
on public.user_reports for select
to authenticated
using (public.is_admin());

drop policy if exists "user_reports_update_admin" on public.user_reports;
create policy "user_reports_update_admin"
on public.user_reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================
-- 5. RPC: open_dm_thread (cria ou retorna thread canônico)
-- =====================================================
create or replace function public.open_dm_thread(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_thread_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_other_user_id is null or auth.uid() = p_other_user_id then
    raise exception 'Usuário inválido';
  end if;

  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  if auth.uid() < p_other_user_id then
    v_user_a := auth.uid();
    v_user_b := p_other_user_id;
  else
    v_user_a := p_other_user_id;
    v_user_b := auth.uid();
  end if;

  select id into v_thread_id
    from public.dm_threads
   where user_a_id = v_user_a and user_b_id = v_user_b;

  if v_thread_id is null then
    insert into public.dm_threads (user_a_id, user_b_id)
    values (v_user_a, v_user_b)
    returning id into v_thread_id;
  end if;

  return v_thread_id;
end;
$$;

grant execute on function public.open_dm_thread(uuid) to authenticated;

-- =====================================================
-- 6. RPC: report_user (denuncia)
-- =====================================================
create or replace function public.report_user(
  p_reported_id uuid,
  p_reason text,
  p_room_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_reported_id is null or p_reported_id = auth.uid() then
    raise exception 'Não é possível denunciar a si mesmo';
  end if;

  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'Motivo da denúncia muito curto';
  end if;

  insert into public.user_reports (reporter_id, reported_id, room_id, reason)
  values (auth.uid(), p_reported_id, p_room_id, trim(p_reason))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.report_user(uuid, text, uuid) to authenticated;

-- =====================================================
-- 7. Realtime
-- =====================================================
alter publication supabase_realtime add table public.dm_threads;
alter publication supabase_realtime add table public.dm_messages;

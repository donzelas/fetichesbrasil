-- =====================================================
-- 0006_seed_system_rooms.sql
-- Cria 1 sala "do sistema" por fetiche para popular a plataforma.
-- Salas do sistema têm owner_id = NULL e nunca contam para o limite
-- de 1 sala/mês por usuário.
-- =====================================================

-- 1) Permite salas sem dono (sistema)
alter table public.chat_rooms
  alter column owner_id drop not null;

-- 2) Trigger validate_room_creation passa a ignorar salas do sistema
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
  -- Salas do sistema (sem owner) não são validadas
  if new.owner_id is null then
    return new;
  end if;

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

-- 3) RPC join_room também precisa aceitar salas sem dono
--    (a função atual já funciona — owner_id não é checado lá).

-- 4) soft_delete_room: usuário comum não pode apagar sala do sistema.
--    is_room_owner retorna false quando owner_id is null, então só admin
--    consegue apagar. Não precisa alterar.

-- 5) RLS update: a policy "chat_rooms_update_owner" usa
--    owner_id = auth.uid(). Quando owner_id is null, owner_id = uuid não bate,
--    portanto usuários comuns não conseguem editar salas do sistema. OK.

-- =====================================================
-- 6) SEED: uma sala por fetiche (premium-only por padrão)
-- =====================================================
-- Idempotente: só insere se ainda não existe sala do sistema (owner_id IS NULL)
-- para aquele fetish_id.
insert into public.chat_rooms (
  owner_id,
  fetish_id,
  name,
  description,
  unlock_message,
  is_premium_only,
  is_featured
)
select
  null,
  f.id,
  'Sala ' || f.name,
  'Sala oficial sobre ' || f.name || '. Converse, troque experiências e conheça pessoas com o mesmo interesse.',
  'Esta sala é exclusiva para usuários PREMIUM. Assine agora para conversar com pessoas reais sobre ' || f.name || '.',
  true,
  false
from public.fetishes f
where not exists (
  select 1 from public.chat_rooms r
   where r.fetish_id = f.id
     and r.owner_id is null
);

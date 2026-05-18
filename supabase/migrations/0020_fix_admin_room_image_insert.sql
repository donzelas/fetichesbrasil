-- =====================================================
-- 0020: Permite que admin tambem envie imagens (e mensagens)
--       em qualquer sala, mesmo sem ser premium nem dono.
-- =====================================================
-- A 0019 criou uma policy de INSERT no storage (room_images_insert)
-- exigindo (is_premium OR room_owner). Quando o admin tenta enviar
-- foto, o INSERT no storage.objects era bloqueado com
-- "new row violates row-level security policy".
--
-- ALEM DISSO: a versao anterior tinha um bug de ambiguidade
-- (split_part(name, ...)) dentro de um EXISTS sobre chat_rooms, e o
-- Postgres resolvia `name` como `chat_rooms.name` (nome da SALA) em
-- vez de `storage.objects.name` (path do arquivo). Resultado: o EXISTS
-- nunca passava e a policy ficava efetivamente travada. Qualificamos
-- com `storage.objects.name` para eliminar a ambiguidade.
--
-- Tambem reforcamos o messages_insert_premium adicionando is_admin()
-- como caminho alternativo, para manter consistencia em toda a stack.

drop policy if exists "room_images_insert" on storage.objects;
create policy "room_images_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'room-images'
  and split_part(storage.objects.name, '/', 2) = auth.uid()::text
  and (
    public.is_admin()
    or exists (
      select 1
        from public.chat_rooms cr
       where cr.id::text = split_part(storage.objects.name, '/', 1)
         and cr.deleted_at is null
         and (public.is_premium() or cr.owner_id = auth.uid())
    )
  )
);

-- Mesma correcao no SELECT, por consistencia.
drop policy if exists "room_images_select" on storage.objects;
create policy "room_images_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'room-images'
  and (
    public.is_admin()
    or public.is_premium()
    or exists (
      select 1
        from public.chat_rooms cr
       where cr.id::text = split_part(storage.objects.name, '/', 1)
         and cr.owner_id = auth.uid()
    )
  )
);

-- Ja libera admin a postar mensagens em qualquer sala viva
drop policy if exists "messages_insert_premium" on public.messages;
create policy "messages_insert_premium"
on public.messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_premium()
    or public.is_room_owner(room_id)
    or public.is_admin()
  )
  and exists (
    select 1 from public.chat_rooms r
     where r.id = room_id
       and r.deleted_at is null
  )
);

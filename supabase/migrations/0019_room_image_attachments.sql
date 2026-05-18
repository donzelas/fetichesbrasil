-- =====================================================
-- 0019: Anexos de imagem nas mensagens das salas
--       (efêmeras: 5 segundos por padrão, admin retém visão)
-- =====================================================

-- 1. Colunas em messages -------------------------------
alter table public.messages
  add column if not exists image_path text,
  add column if not exists expires_at timestamptz;

-- Remove o CHECK antigo (content is not null or image_url is not null)
-- e cria um novo que inclui também image_path.
do $$
declare
  v_name text;
begin
  for v_name in
    select conname
      from pg_constraint
     where conrelid = 'public.messages'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%content%'
  loop
    execute format('alter table public.messages drop constraint %I', v_name);
  end loop;
end$$;

alter table public.messages
  add constraint messages_content_or_image_check check (
    (content is not null and char_length(content) > 0)
    or image_path is not null
    or image_url is not null
  );

create index if not exists messages_expires_idx
  on public.messages (expires_at)
  where expires_at is not null;

-- 2. Bucket privado para as imagens das salas ----------
insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', false)
on conflict (id) do update set public = false;

-- 3. RLS no storage.objects para o bucket --------------
-- Convenção de path: <room_id>/<user_id>/<random>.{jpg|webp}

-- SELECT: admin sempre; demais usuários precisam ter direito de ver
-- o conteúdo da sala (premium OR dono da sala). Mesma lógica do
-- messages_select_premium_or_owner.
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

-- INSERT: o próprio uploader vai na 2ª parte do path; a sala precisa
-- existir e não estar deletada; usuário precisa poder mandar mensagem
-- naquela sala (premium OR dono) OU ser admin.
--
-- IMPORTANTE: usamos `storage.objects.name` qualificado dentro do EXISTS
-- porque `chat_rooms` também tem coluna `name`, e o Postgres resolveria
-- `name` para `chat_rooms.name` (bug clássico de ambiguidade que faz a
-- policy NUNCA passar e devolver "new row violates row-level security").
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

-- DELETE: apenas admin (limpeza/moderação).
drop policy if exists "room_images_delete_admin" on storage.objects;
create policy "room_images_delete_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'room-images' and public.is_admin()
);

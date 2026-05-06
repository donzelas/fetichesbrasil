-- =====================================================
-- 0008: Anexos de imagem nos DMs (com auto-destruição)
-- =====================================================

-- 1. Colunas em dm_messages -----------------------------
alter table public.dm_messages
  add column if not exists image_path text,
  add column if not exists expires_at timestamptz;

-- Permitir content NULL quando há somente imagem
alter table public.dm_messages alter column content drop not null;

-- Drop do CHECK antigo (de qualquer nome) e cria um novo combinado
do $$
declare
  v_name text;
begin
  for v_name in
    select conname
      from pg_constraint
     where conrelid = 'public.dm_messages'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%char_length(content)%'
  loop
    execute format('alter table public.dm_messages drop constraint %I', v_name);
  end loop;
end$$;

alter table public.dm_messages
  add constraint dm_messages_content_or_image_check check (
    (content is not null and char_length(content) > 0 and char_length(content) <= 5000)
    or image_path is not null
  );

create index if not exists dm_messages_expires_idx on public.dm_messages (expires_at) where expires_at is not null;

-- 2. Bucket de imagens dos DMs (privado) ---------------
insert into storage.buckets (id, name, public)
values ('dm-images', 'dm-images', false)
on conflict (id) do update set public = false;

-- 3. RLS no storage.objects para o bucket ---------------
-- Convenção de path: <thread_id>/<sender_id>/<random>.jpg

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
        from public.dm_threads t
       where t.id::text = split_part(name, '/', 1)
         and (t.user_a_id = auth.uid() or t.user_b_id = auth.uid())
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
      from public.dm_threads t
     where t.id::text = split_part(name, '/', 1)
       and (t.user_a_id = auth.uid() or t.user_b_id = auth.uid())
  )
);

drop policy if exists "dm_images_delete_admin" on storage.objects;
create policy "dm_images_delete_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'dm-images' and public.is_admin()
);

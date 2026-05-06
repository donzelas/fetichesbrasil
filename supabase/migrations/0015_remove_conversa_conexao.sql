-- =====================================================
-- 0015: Remove a categoria "Conversa & Conexão" e tudo dela
--
-- Idempotente: pode rodar múltiplas vezes sem efeito colateral.
-- =====================================================

do $$
declare
  v_cat_id uuid;
  v_fetish_ids uuid[];
begin
  select id into v_cat_id
    from public.categories
   where slug = 'conversa-conexao';

  if v_cat_id is null then
    raise notice 'Categoria conversa-conexao já removida — nada a fazer.';
    return;
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_fetish_ids
    from public.fetishes
   where category_id = v_cat_id;

  -- 1. Soft-delete das salas vinculadas aos fetiches dessa categoria.
  --    chat_rooms.fetish_id é ON DELETE SET NULL; soft-delete pra não
  --    sobrar sala "fantasma" sem categoria.
  update public.chat_rooms
     set deleted_at = now()
   where fetish_id = any (v_fetish_ids)
     and deleted_at is null;

  -- 2. Apaga os cards de destaque desses fetiches.
  delete from public.featured_fetish_cards
   where fetish_id = any (v_fetish_ids);

  -- 3. Apaga os fetiches.
  --    (também cairia em cascade ao deletar a categoria; explícito por
  --     clareza e pra não depender só do FK.)
  delete from public.fetishes
   where category_id = v_cat_id;

  -- 4. Apaga a categoria.
  delete from public.categories
   where id = v_cat_id;
end $$;

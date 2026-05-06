-- =====================================================
-- 0011: Adiciona novos fetiches (Cuckold, Dogging, Fisting,
-- Chuva dourada) + salas do sistema + cards de destaque.
--
-- Cuckold já existe (migration 0004) -> os INSERTs são
-- idempotentes (ON CONFLICT / WHERE NOT EXISTS), então o
-- Cuckold simplesmente não duplica.
-- =====================================================

-- ---------------------------------------------------------------
-- 1) Inserir os fetiches nas categorias corretas
-- ---------------------------------------------------------------
do $$
declare
  v_cat_dinamica  uuid;
  v_cat_sensacoes uuid;
  v_cat_tabu      uuid;
  v_max_dinamica  int;
  v_max_sensacoes int;
  v_max_tabu      int;
begin
  select id into v_cat_dinamica  from public.categories where slug = 'dinamica-pessoas';
  select id into v_cat_sensacoes from public.categories where slug = 'sensacoes-praticas';
  select id into v_cat_tabu      from public.categories where slug = 'tabu-proibidoes';

  if v_cat_dinamica is null or v_cat_sensacoes is null or v_cat_tabu is null then
    raise exception 'Categorias base não encontradas. Rode antes a migration 0004.';
  end if;

  select coalesce(max(sort_order), 0) into v_max_dinamica  from public.fetishes where category_id = v_cat_dinamica;
  select coalesce(max(sort_order), 0) into v_max_sensacoes from public.fetishes where category_id = v_cat_sensacoes;
  select coalesce(max(sort_order), 0) into v_max_tabu      from public.fetishes where category_id = v_cat_tabu;

  -- Cuckold (já existe, mas mantemos por idempotência)
  insert into public.fetishes (category_id, name, slug, sort_order)
  values (v_cat_dinamica, 'Cuckold', 'cuckold', v_max_dinamica + 1)
  on conflict (slug) do nothing;

  -- Dogging -> Tabu & Proibidões
  insert into public.fetishes (category_id, name, slug, sort_order)
  values (v_cat_tabu, 'Dogging', 'dogging', v_max_tabu + 1)
  on conflict (slug) do nothing;

  -- Fisting -> Sensações & Práticas
  insert into public.fetishes (category_id, name, slug, sort_order)
  values (v_cat_sensacoes, 'Fisting', 'fisting', v_max_sensacoes + 1)
  on conflict (slug) do nothing;

  -- Chuva dourada -> Sensações & Práticas
  insert into public.fetishes (category_id, name, slug, sort_order)
  values (v_cat_sensacoes, 'Chuva dourada', 'chuva-dourada', v_max_sensacoes + 2)
  on conflict (slug) do nothing;
end $$;

-- ---------------------------------------------------------------
-- 2) Criar salas do sistema para os novos fetiches
--    (mesma lógica/condição da 0006: 1 sala por fetiche, sem dono)
-- ---------------------------------------------------------------
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
where f.slug in ('cuckold', 'dogging', 'fisting', 'chuva-dourada')
  and not exists (
    select 1
      from public.chat_rooms r
     where r.fetish_id = f.id
       and r.owner_id is null
  );

-- ---------------------------------------------------------------
-- 3) Cards de destaque para os novos fetiches (carrossel da home)
--    Idempotente: só insere se ainda não existir card pra aquele fetish_id.
-- ---------------------------------------------------------------
with base as (
  select coalesce(max(sort_order), 0) as max_sort from public.featured_fetish_cards
),
novos as (
  select * from (values
    ('cuckold',
     'Cuckold',
     'Cuckold: prazer em saber/assistir a parceira(o) com outra pessoa, dentro de um acordo consensual e seguro.'),
    ('dogging',
     'Dogging',
     'Dogging: prática britânica de sexo em locais públicos com observadores consensuais — adrenalina, exibicionismo e voyeurismo entre adultos.'),
    ('fisting',
     'Fisting',
     'Fisting: penetração com a mão fechada — exige confiança total, lubrificante de sobra, paciência e prática segura entre parceiros experientes.'),
    ('chuva-dourada',
     'Chuva dourada',
     'Chuva dourada (urolagnia): excitação envolvendo urina, sempre dentro de um contexto consensual, com higiene e respeito aos limites de cada um.')
  ) as t(slug, title, description)
)
insert into public.featured_fetish_cards (title, description, image_url, fetish_id, sort_order, is_active)
select
  n.title,
  n.description,
  'https://picsum.photos/seed/' || n.slug || '/1280/640',
  f.id,
  (select max_sort from base) + row_number() over (order by n.slug),
  true
from novos n
join public.fetishes f on f.slug = n.slug
where not exists (
  select 1
    from public.featured_fetish_cards c
   where c.fetish_id = f.id
);

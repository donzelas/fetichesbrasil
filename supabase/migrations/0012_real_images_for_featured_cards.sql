-- =====================================================
-- 0012: Substitui as imagens placeholder (picsum.photos)
-- por fotos reais do Unsplash, escolhidas para combinar
-- com o tema de cada fetiche.
--
-- Todas as URLs são do CDN público do Unsplash
-- (images.unsplash.com), gratuitas para uso, com
-- redimensionamento on-the-fly (1280x640, qualidade 80).
-- =====================================================

with mappings(slug, image_url) as (values
  -- BDSM & Poder
  ('dominacao',
   'https://images.unsplash.com/photo-1515138692129-197a2c608cfd?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('submissao',
   'https://images.unsplash.com/photo-1588747020648-4ff0ec1abecb?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('bondage',
   'https://images.unsplash.com/photo-1774535852017-13e07f991e5a?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('spanking',
   'https://images.unsplash.com/photo-1773857529549-92bcf7820a6b?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Roupas & Materiais
  ('latex',
   'https://images.unsplash.com/photo-1731356173910-e23fc798c781?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('couro',
   'https://images.unsplash.com/photo-1438763298591-75a0d42b7265?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('lingerie',
   'https://images.unsplash.com/photo-1574539602047-548bf9557352?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('meia-calca',
   'https://images.unsplash.com/photo-1675474029076-ccfebb10ac26?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Partes do Corpo
  ('pes',
   'https://images.unsplash.com/photo-1760163287823-8786a65fd269?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('maos',
   'https://images.unsplash.com/photo-1505384709107-3cd83f93c35f?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('cabelo',
   'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('boca-labios',
   'https://images.unsplash.com/photo-1610384729600-cdec7bf1800a?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Cenários & Roleplay
  ('professor-aluno',
   'https://images.unsplash.com/photo-1635424239131-32dc44986b56?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('chefe-secretaria',
   'https://images.unsplash.com/photo-1713947505562-299114c58523?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('medico-paciente',
   'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('estranhos',
   'https://images.unsplash.com/photo-1591969851586-adbbd4accf81?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Sensações & Práticas
  ('cera',
   'https://images.unsplash.com/photo-1601922046210-41e129a3e64a?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('gelo',
   'https://images.unsplash.com/photo-1744571712832-355eba4ee00c?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('massagem',
   'https://images.unsplash.com/photo-1741522509438-a120c0bb5e88?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('cocegas',
   'https://images.unsplash.com/photo-1580760654352-bba597b07dff?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('fisting',
   'https://images.unsplash.com/photo-1620008850344-1bc6d8ae3e2c?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('chuva-dourada',
   'https://images.unsplash.com/photo-1518779737284-161fc061f38a?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Dinâmica & Pessoas
  ('casal',
   'https://images.unsplash.com/photo-1514480657081-a987d9a45e90?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('trisal',
   'https://images.unsplash.com/photo-1609012205062-4be49e479a7c?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('swing',
   'https://images.unsplash.com/photo-1508413963204-4308ea956b82?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('cuckold',
   'https://images.unsplash.com/photo-1715342835810-c013e0e08eb1?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Estilo & Estética
  ('goth',
   'https://images.unsplash.com/photo-1677559027855-1079cbe8300e?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('punk',
   'https://images.unsplash.com/photo-1644778572577-c217d2a3385e?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('nerd-geek',
   'https://images.unsplash.com/photo-1593244179694-abb84ca0a288?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('tatuadas-tatuados',
   'https://images.unsplash.com/photo-1620183543255-aeb8a795521f?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Conversa & Conexão
  ('sexting',
   'https://images.unsplash.com/photo-1675510183225-76c920848c29?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('audio-sensual',
   'https://images.unsplash.com/photo-1610733661495-4aa6ed9fc6f4?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('trocas-de-fotos',
   'https://images.unsplash.com/photo-1514582086679-4024becf927e?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('conversa-romantica',
   'https://images.unsplash.com/photo-1758874089745-72a5f308af86?w=1280&h=640&fit=crop&q=80&auto=format'),

  -- Tabu & Proibidões
  ('tabu-estranhos',
   'https://images.unsplash.com/photo-1665640622150-0729c9f00adb?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('encontros-casuais',
   'https://images.unsplash.com/photo-1644529282071-eb85ffebdb6b?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('traicao-roleplay',
   'https://images.unsplash.com/photo-1640324718457-0585c782a0f4?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('voyeurismo-publico',
   'https://images.unsplash.com/photo-1586211082529-b7c6b640abff?w=1280&h=640&fit=crop&q=80&auto=format'),
  ('dogging',
   'https://images.unsplash.com/photo-1642551181375-373ce3f7f739?w=1280&h=640&fit=crop&q=80&auto=format')
)
update public.featured_fetish_cards c
   set image_url = m.image_url
  from mappings m
  join public.fetishes  f on f.slug = m.slug
 where c.fetish_id = f.id;

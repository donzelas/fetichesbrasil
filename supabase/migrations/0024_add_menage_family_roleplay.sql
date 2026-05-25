-- =====================================================
-- 0024: Adiciona Ménage e fetiches de step-family roleplay
--       (todos entre adultos consensuais maiores de 18,
--        sem relacao de sangue real - fantasia mainstream
--        usada pelas principais plataformas adultas globais)
-- =====================================================

insert into public.fetishes (category_id, name, slug, sort_order)
values
  -- Em Dinamica & Pessoas (sinonimo de Trisal mas capta busca SEO diferente)
  ((select id from public.categories where slug = 'dinamica-pessoas'),
   'Ménage', 'menage', 51),

  -- Em Tabu & Proibidoes - fantasia step-family entre adultos consensuais
  ((select id from public.categories where slug = 'tabu-proibidoes'),
   'Padrasto/Madrasta', 'padrasto-madrasta', 20),
  ((select id from public.categories where slug = 'tabu-proibidoes'),
   'Step-irmãos', 'step-irmaos', 21),
  ((select id from public.categories where slug = 'tabu-proibidoes'),
   'Sogra/Sogro', 'sogra-sogro', 22),
  ((select id from public.categories where slug = 'tabu-proibidoes'),
   'Família política', 'familia-politica', 23),
  ((select id from public.categories where slug = 'tabu-proibidoes'),
   'Babá/Patrão', 'baba-patrao', 24),
  ((select id from public.categories where slug = 'tabu-proibidoes'),
   'Reunião adulta', 'reuniao-adulta', 25)
on conflict (slug) do nothing;

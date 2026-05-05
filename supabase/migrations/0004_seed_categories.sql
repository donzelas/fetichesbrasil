-- =====================================================
-- 0004_seed_categories.sql — 9 categorias e ~94 fetiches
-- =====================================================

-- Insere categorias e armazena IDs em variáveis temporárias via WITH
do $$
declare
  cat_bdsm uuid;
  cat_roupas uuid;
  cat_corpo uuid;
  cat_roleplay uuid;
  cat_sensacoes uuid;
  cat_dinamica uuid;
  cat_estilo uuid;
  cat_conversa uuid;
  cat_tabu uuid;
begin
  -- ============ CATEGORIAS ============
  insert into public.categories (name, slug, emoji, sort_order) values
    ('BDSM & Poder',         'bdsm-poder',          '🔥', 1) returning id into cat_bdsm;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Roupas & Materiais',   'roupas-materiais',    '👠', 2) returning id into cat_roupas;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Partes do Corpo',      'partes-do-corpo',     '🦶', 3) returning id into cat_corpo;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Cenários & Roleplay',  'cenarios-roleplay',   '👥', 4) returning id into cat_roleplay;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Sensações & Práticas', 'sensacoes-praticas',  '💧', 5) returning id into cat_sensacoes;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Dinâmica & Pessoas',   'dinamica-pessoas',    '👯', 6) returning id into cat_dinamica;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Estilo & Estética',    'estilo-estetica',     '🎭', 7) returning id into cat_estilo;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Conversa & Conexão',   'conversa-conexao',    '💬', 8) returning id into cat_conversa;
  insert into public.categories (name, slug, emoji, sort_order) values
    ('Tabu & Proibidões',    'tabu-proibidoes',     '🚫', 9) returning id into cat_tabu;

  -- ============ FETICHES ============
  -- BDSM & Poder
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_bdsm, 'Dominação',              'dominacao',               1),
    (cat_bdsm, 'Submissão',              'submissao',               2),
    (cat_bdsm, 'Bondage',                'bondage',                 3),
    (cat_bdsm, 'Spanking',               'spanking',                4),
    (cat_bdsm, 'Disciplina',             'disciplina',              5),
    (cat_bdsm, 'Humilhação consensual',  'humilhacao-consensual',   6),
    (cat_bdsm, 'Sissy',                  'sissy',                   7),
    (cat_bdsm, 'Dom/Sub',                'dom-sub',                 8),
    (cat_bdsm, 'Switch',                 'switch',                  9),
    (cat_bdsm, 'Praise',                 'praise',                 10);

  -- Roupas & Materiais
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_roupas, 'Latex',               'latex',               1),
    (cat_roupas, 'Couro',               'couro',               2),
    (cat_roupas, 'Lingerie',            'lingerie',            3),
    (cat_roupas, 'Meia-calça',          'meia-calca',          4),
    (cat_roupas, 'Salto alto',          'salto-alto',          5),
    (cat_roupas, 'Uniforme',            'uniforme',            6),
    (cat_roupas, 'Cosplay',             'cosplay',             7),
    (cat_roupas, 'Roupa de ginástica',  'roupa-de-ginastica',  8),
    (cat_roupas, 'Jeans',               'jeans',               9),
    (cat_roupas, 'PVC',                 'pvc',                10);

  -- Partes do Corpo
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_corpo, 'Pés',          'pes',          1),
    (cat_corpo, 'Mãos',         'maos',         2),
    (cat_corpo, 'Cabelo',       'cabelo',       3),
    (cat_corpo, 'Boca/Lábios',  'boca-labios',  4),
    (cat_corpo, 'Pescoço',      'pescoco',      5),
    (cat_corpo, 'Bunda',        'bunda',        6),
    (cat_corpo, 'Coxas',        'coxas',        7),
    (cat_corpo, 'Barriga',      'barriga',      8),
    (cat_corpo, 'Costas',       'costas',       9),
    (cat_corpo, 'Axilas',       'axilas',      10);

  -- Cenários & Roleplay
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_roleplay, 'Professor/Aluno',     'professor-aluno',     1),
    (cat_roleplay, 'Chefe/Secretária',    'chefe-secretaria',    2),
    (cat_roleplay, 'Médico/Paciente',     'medico-paciente',     3),
    (cat_roleplay, 'Estranhos',           'estranhos',           4),
    (cat_roleplay, 'Voyeurismo',          'voyeurismo',          5),
    (cat_roleplay, 'Exibicionismo',       'exibicionismo',       6),
    (cat_roleplay, 'Idade (legal)',       'idade-legal',         7),
    (cat_roleplay, 'ABDL',                'abdl',                8),
    (cat_roleplay, 'Petplay',             'petplay',             9),
    (cat_roleplay, 'Roleplay histórico',  'roleplay-historico', 10);

  -- Sensações & Práticas
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_sensacoes, 'Cera',                  'cera',                  1),
    (cat_sensacoes, 'Gelo',                  'gelo',                  2),
    (cat_sensacoes, 'Massagem',              'massagem',              3),
    (cat_sensacoes, 'Cócegas',               'cocegas',               4),
    (cat_sensacoes, 'Tantra',                'tantra',                5),
    (cat_sensacoes, 'Edging',                'edging',                6),
    (cat_sensacoes, 'Asfixia (consensual)',  'asfixia-consensual',    7),
    (cat_sensacoes, 'Mordidas',              'mordidas',              8),
    (cat_sensacoes, 'Arranhões',             'arranhoes',             9),
    (cat_sensacoes, 'Beijos',                'beijos',               10);

  -- Dinâmica & Pessoas
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_dinamica, 'Casal',           'casal',            1),
    (cat_dinamica, 'Trisal',          'trisal',           2),
    (cat_dinamica, 'Swing',           'swing',            3),
    (cat_dinamica, 'Cuckold',         'cuckold',          4),
    (cat_dinamica, 'Hotwife',         'hotwife',          5),
    (cat_dinamica, 'Grupos',          'grupos',           6),
    (cat_dinamica, 'Maduras(os)',     'maduras-maduros',  7),
    (cat_dinamica, 'Idade próxima',   'idade-proxima',    8),
    (cat_dinamica, 'MILF',            'milf',             9),
    (cat_dinamica, 'DILF',            'dilf',            10);

  -- Estilo & Estética
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_estilo, 'Goth',                 'goth',                 1),
    (cat_estilo, 'Punk',                 'punk',                 2),
    (cat_estilo, 'Nerd/Geek',            'nerd-geek',            3),
    (cat_estilo, 'Tatuadas(os)',         'tatuadas-tatuados',    4),
    (cat_estilo, 'Piercings',            'piercings',            5),
    (cat_estilo, 'Atletas',              'atletas',              6),
    (cat_estilo, 'Curvilíneas(os)',      'curvilineas',          7),
    (cat_estilo, 'Magras(os)',           'magras-magros',        8),
    (cat_estilo, 'Naturais',             'naturais',             9),
    (cat_estilo, 'Glamour',              'glamour',             10);

  -- Conversa & Conexão
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_conversa, 'Sexting',              'sexting',              1),
    (cat_conversa, 'Áudio sensual',        'audio-sensual',        2),
    (cat_conversa, 'Trocas de fotos',      'trocas-de-fotos',      3),
    (cat_conversa, 'Conversa romântica',   'conversa-romantica',   4),
    (cat_conversa, 'Histórias eróticas',   'historias-eroticas',   5),
    (cat_conversa, 'Confissões',           'confissoes',           6),
    (cat_conversa, 'Fantasias',            'fantasias',            7),
    (cat_conversa, 'Dirty talk',           'dirty-talk',           8),
    (cat_conversa, 'Provocação',           'provocacao',           9),
    (cat_conversa, 'Companhia',            'companhia',           10);

  -- Tabu & Proibidões
  insert into public.fetishes (category_id, name, slug, sort_order) values
    (cat_tabu, 'Estranhos',                  'tabu-estranhos',           1),
    (cat_tabu, 'Encontros casuais',          'encontros-casuais',        2),
    (cat_tabu, 'Traição (roleplay)',         'traicao-roleplay',         3),
    (cat_tabu, 'Voyeurismo público',         'voyeurismo-publico',       4),
    (cat_tabu, 'Exibicionismo público',      'exibicionismo-publico',    5),
    (cat_tabu, 'Sexo no trabalho',           'sexo-no-trabalho',         6),
    (cat_tabu, 'Professor/Aluno (universitário)', 'professor-aluno-universitario', 7),
    (cat_tabu, 'Chefe/Subordinado',          'chefe-subordinado',        8),
    (cat_tabu, 'Vizinhos',                   'vizinhos',                 9),
    (cat_tabu, 'Primeira vez (adulto)',      'primeira-vez-adulto',     10),
    (cat_tabu, 'Sexo proibido',              'sexo-proibido',           11),
    (cat_tabu, 'Affair',                     'affair',                  12),
    (cat_tabu, 'Encontros secretos',         'encontros-secretos',      13),
    (cat_tabu, 'Quickie',                    'quickie',                 14);
end $$;

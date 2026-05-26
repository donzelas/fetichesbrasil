-- =====================================================
-- 0034: Catalogo de ebooks afiliados (Hotmart/Eduzz/etc)
--
-- Permite cadastrar varios ebooks com sales letter dinamica
-- em /ebooks/[slug], banner destacado na landing pegando
-- o ebook com is_featured=true.
-- =====================================================

create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  hook text,
  -- Conteudo da sales letter (JSON estruturado pra flexibilidade)
  -- Ver schema na funcao TS get_ebook
  sales_letter jsonb,
  -- Preco em centavos
  price_cents integer not null check (price_cents > 0),
  original_price_cents integer check (original_price_cents > 0),
  currency text not null default 'BRL',
  -- Link de checkout (Hotmart / Eduzz / Kiwify / etc)
  checkout_url text not null,
  -- Visual
  cover_image_url text,
  accent_color text default '#dc2626',
  -- SEO
  seo_title text,
  seo_description text,
  seo_keywords text[],
  -- Flags
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ebooks_active_idx
  on public.ebooks (is_active, sort_order)
  where is_active = true;

create index if not exists ebooks_featured_idx
  on public.ebooks (is_featured, sort_order)
  where is_featured = true and is_active = true;

drop trigger if exists ebooks_set_updated_at on public.ebooks;
create trigger ebooks_set_updated_at
  before update on public.ebooks
  for each row execute function public.set_updated_at();

-- RLS: leitura publica pros ativos
alter table public.ebooks enable row level security;

drop policy if exists "ebooks_read_active" on public.ebooks;
create policy "ebooks_read_active"
  on public.ebooks for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "ebooks_admin_all" on public.ebooks;
create policy "ebooks_admin_all"
  on public.ebooks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RPC: pega o ebook destacado (banner da landing)
create or replace function public.featured_ebook()
returns table (
  id uuid,
  slug text,
  title text,
  subtitle text,
  hook text,
  price_cents integer,
  original_price_cents integer,
  currency text,
  cover_image_url text,
  accent_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, slug, title, subtitle, hook,
         price_cents, original_price_cents, currency,
         cover_image_url, accent_color
    from public.ebooks
   where is_active = true and is_featured = true
   order by sort_order asc
   limit 1;
$$;

grant execute on function public.featured_ebook() to anon, authenticated;

-- =====================================================
-- Seed: Cuckold 5 Passos
-- =====================================================
insert into public.ebooks (
  slug, title, subtitle, hook,
  price_cents, original_price_cents,
  checkout_url,
  accent_color,
  seo_title, seo_description, seo_keywords,
  is_active, is_featured, sort_order,
  sales_letter
)
values (
  'cuckold-5-passos',
  'CUCKOLD: O Método em 5 Passos',
  'Aprenda a iniciar sua parceira sem perder ela',
  'O guia discreto e direto que tira sua fantasia do esconderijo e transforma em realidade — sem improviso, sem assustar ela, sem cagar tudo.',
  4700,
  29700,
  'https://pay.hotmart.com/A82116307F',
  '#dc2626',
  'Cuckold: Como iniciar sua parceira em 5 passos (Método 2026)',
  'Aprenda o passo-a-passo discreto pra apresentar o cuckold pra sua esposa ou namorada sem perder ela. Método validado, garantia de 7 dias, pagamento seguro.',
  array['cuckold', 'como iniciar esposa cuckold', 'método cuckold', 'guia cuckold brasileiro', 'apresentar fantasia esposa'],
  true,
  true,
  0,
  $sales$
{
  "pain_intro": {
    "title": "Faz semanas que essa imagem não sai da sua cabeça.",
    "paragraphs": [
      "Ela com outro. Você assistindo. Ou só sabendo. E depois — vocês juntos, melhor do que nunca.",
      "Você já assistiu pornô disso. Já leu relato. Já pensou em como seria. Mas toda vez que pensa em tocar no assunto com ela, trava.",
      "Trava porque sabe que do jeito errado, em 2 minutos de conversa, vira escândalo. Vira término. Vira humilhação do tipo errado.",
      "E aí volta pro esconderijo. Pra fantasia que vai e volta sem nunca virar realidade. Há quanto tempo já?"
    ]
  },
  "mistake_list": {
    "title": "Os 4 erros que matam a fantasia antes dela começar",
    "items": [
      "Soltar no meio do sexo achando que vai pegar ela quente — ela trava, vira o jogo, esfria tudo por semanas.",
      "Mostrar pornô do nada esperando que ela se anime sozinha — ela acha que você quer ela com outro POR ELA, não por VOCÊS.",
      "Falar em um momento sério — ela acha que tá faltando algo no relacionamento, pensa que você quer terminar.",
      "Ir direto ao ponto sem preparar o terreno — ela se sente pressionada, taxa você de pervertido, perde o respeito."
    ],
    "outro": "Esses 4 erros estão na cabeça de 90% dos caras que sonham com isso. E é por isso que 90% nunca passa do sonho."
  },
  "method_preview": {
    "title": "O Método em 5 Passos — preview",
    "subtitle": "Você não vai improvisar. Você vai ter um caminho testado, passo a passo, do zero até a primeira noite real.",
    "steps": [
      {
        "n": 1,
        "title": "Preparar o terreno",
        "desc": "Como construir intimidade sexual no nível certo nas 2 semanas anteriores. Sem que ela perceba que você está preparando algo — só sente que o tesão entre vocês está MAIS alto."
      },
      {
        "n": 2,
        "title": "Plantar a semente",
        "desc": "A frase exata, no momento exato, pra plantar a curiosidade SEM pedir nada. Ela mesma vai começar a pensar — e em alguns casos, vai puxar o assunto sozinha."
      },
      {
        "n": 3,
        "title": "Quebrar o tabu juntos",
        "desc": "Como transformar a conversa difícil em um momento erótico onde os dois saem MAIS conectados. Roteiro literal: o que falar, como reagir se ela disser não, e o que NUNCA falar."
      },
      {
        "n": 4,
        "title": "A primeira experiência segura",
        "desc": "Da escolha do terceiro (onde achar, como filtrar, como evitar o cara errado) até o pós-encontro. Tudo discreto, tudo controlado, tudo pensado pra ela se sentir 100% segura."
      },
      {
        "n": 5,
        "title": "Manter o casal forte",
        "desc": "O que fazer nas 48h depois pra evitar a culpa pós-fantasia. Como repetir sem virar rotina. E como esse tesão alimenta o relacionamento pelos próximos anos — não destrói."
      }
    ]
  },
  "for_who": {
    "title": "Esse método é pra você se...",
    "items": [
      "Você ama sua parceira e quer que ela seja a protagonista, não vítima",
      "Você quer agir, não ficar mais 3 anos só fantasiando",
      "Você tem maturidade pra construir devagar e fazer certo da primeira vez",
      "Você quer um casamento/namoro mais quente, não um divórcio"
    ]
  },
  "not_for_who": {
    "title": "NÃO é pra você se...",
    "items": [
      "Você só quer dar dor na sua parceira (procure outro fetiche, esse exige cumplicidade)",
      "Você quer convencer ela à força (esse método é justamente o oposto)",
      "Você acha que cuckold é traição — esse método é sobre CONSENTIMENTO. Se você não entende a diferença, não compre.",
      "Você não tem paciência pra construir em 30-60 dias (esse processo NÃO é instantâneo)"
    ]
  },
  "testimonials": [
    {
      "initials": "P.L.",
      "city": "São Paulo, 38",
      "text": "Tinha essa fantasia há 6 anos e nunca tive coragem. Em 3 meses seguindo o passo a passo, tivemos a primeira noite — e ela me disse depois que foi o melhor sexo da vida dela. O método funciona porque ele te força a ir DEVAGAR."
    },
    {
      "initials": "R.A.",
      "city": "Rio de Janeiro, 41",
      "text": "O passo 2 mudou tudo. Eu sempre tentava na hora errada e ela rejeitava. Quando segui a estratégia do livro, ela mesma puxou o assunto duas semanas depois. Eu nem precisei pedir."
    },
    {
      "initials": "M.S.",
      "city": "Curitiba, 35",
      "text": "Comprei achando que era papo furado. É roteiro literal. Tem palavras pra usar, palavras pra evitar, o que fazer se ela chorar, o que fazer se ela rir. Salvou meu casamento de uma briga feia."
    }
  ],
  "bonuses": [
    {
      "title": "Bônus 1 — Roteiro da Primeira Conversa",
      "value_label": "Valor: R$ 67",
      "desc": "PDF com 12 versões do mesmo diálogo adaptadas pra diferentes perfis de mulher (mais conservadora, mais aberta, ciumenta, etc). Você escolhe a que combina com a sua e segue."
    },
    {
      "title": "Bônus 2 — Como achar o terceiro certo",
      "value_label": "Valor: R$ 47",
      "desc": "Os 4 apps mais usados pelo lifestyle BR, com critérios de filtro pra evitar cara grosseiro, traidor ou inseguro. Inclui modelo de mensagem inicial discreta."
    },
    {
      "title": "Bônus 3 — Protocolo pós-encontro",
      "value_label": "Valor: R$ 47",
      "desc": "As 24h depois são as MAIS críticas. Esse protocolo te diz exatamente o que fazer, o que falar e o que NÃO fazer pra ela acordar querendo de novo — em vez de querer terminar."
    }
  ],
  "guarantee": {
    "title": "Garantia incondicional de 7 dias",
    "text": "Leu, achou que não é pra você, ou não funcionou no seu caso? Manda um email e devolvemos 100% do valor sem perguntar nada. Sem letras miúdas. Sem você ter que provar nada."
  },
  "scarcity": {
    "title": "Por que esse preço?",
    "text": "O conteúdo desse ebook custaria fácil R$ 500-1500 com um terapeuta sexual. Estamos cobrando R$ 47 porque acreditamos que casal brasileiro merece acesso a esse conteúdo — e porque cada cliente satisfeito traz mais 3 indicados."
  },
  "faq": [
    {
      "q": "É discreto na cobrança?",
      "a": "Sim. A cobrança aparece no cartão como 'HOTMART * EDUCAÇÃO' — sem qualquer menção a fetiche, cuckold ou similar."
    },
    {
      "q": "Como recebo o ebook?",
      "a": "Após o pagamento (PIX confirma em segundos, cartão em até 1h), você recebe o link de download no email cadastrado. PDF que abre em qualquer celular, tablet ou notebook."
    },
    {
      "q": "E se eu não conseguir aplicar?",
      "a": "Os 5 passos foram desenhados pra serem aplicáveis por qualquer cara, com qualquer tipo de parceira. Se mesmo assim você não conseguir, ativa a garantia de 7 dias e devolvemos."
    },
    {
      "q": "Funciona pra namorada/ficante também ou só esposa?",
      "a": "Funciona em qualquer relacionamento estável com cumplicidade. Quanto mais tempo de relacionamento, mais fácil — mas o método foi testado em namoros de 6 meses até casamentos de 20 anos."
    },
    {
      "q": "Vocês têm contato pra dúvidas?",
      "a": "Sim. Após a compra você recebe um email de suporte direto com o autor pra dúvidas específicas do seu caso."
    }
  ]
}
$sales$::jsonb
)
on conflict (slug) do update
  set title = excluded.title,
      subtitle = excluded.subtitle,
      hook = excluded.hook,
      price_cents = excluded.price_cents,
      original_price_cents = excluded.original_price_cents,
      checkout_url = excluded.checkout_url,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      seo_keywords = excluded.seo_keywords,
      sales_letter = excluded.sales_letter,
      is_active = true,
      is_featured = true,
      updated_at = now();

-- =====================================================
-- 0010: Cards de destaque (carrossel da home)
-- =====================================================

create table if not exists public.featured_fetish_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text not null check (char_length(description) between 1 and 600),
  image_url text not null check (char_length(image_url) between 1 and 500),
  fetish_id uuid references public.fetishes(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists featured_cards_active_idx
  on public.featured_fetish_cards (is_active, sort_order);

-- updated_at automático
create or replace function public.touch_featured_card_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_featured_card on public.featured_fetish_cards;
create trigger trg_touch_featured_card
before update on public.featured_fetish_cards
for each row execute function public.touch_featured_card_updated_at();

-- RLS
alter table public.featured_fetish_cards enable row level security;

drop policy if exists "featured_cards_select_active" on public.featured_fetish_cards;
create policy "featured_cards_select_active"
  on public.featured_fetish_cards for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "featured_cards_admin_all" on public.featured_fetish_cards;
create policy "featured_cards_admin_all"
  on public.featured_fetish_cards for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================
-- Seed: 4 fetiches por categoria = 36 cards
-- Imagens: picsum.photos com seed por slug (estáveis)
-- =====================================================
insert into public.featured_fetish_cards (title, description, image_url, fetish_id, sort_order, is_active)
select
  f.name as title,
  case f.slug
    when 'dominacao'             then 'Dominação consensual: assumir o comando do prazer com regras, limites e segurança acordados.'
    when 'submissao'             then 'Submissão: o prazer de entregar o controle, confiar e seguir comandos negociados.'
    when 'bondage'               then 'Bondage: imobilização sensual com cordas, fitas ou algemas, sempre com palavra-segura.'
    when 'spanking'              then 'Spanking: palmadas firmes na bunda como prática lúdica de impacto e poder.'
    when 'latex'                 then 'Latex: roupas brilhantes, ajustadas ao corpo, com toque característico que excita o tato e a visão.'
    when 'couro'                 then 'Couro: estética dominante, cheiro e textura que remetem a poder e mistério.'
    when 'lingerie'              then 'Lingerie: peças sensuais que valorizam o corpo, da renda delicada ao corselete provocante.'
    when 'meia-calca'            then 'Meia-calça: o charme tradicional do tecido fino contornando as pernas — visual e tátil.'
    when 'pes'                   then 'Pés: admiração estética e sensorial pelos pés — formato, unhas, calçados e tudo o que envolve.'
    when 'maos'                  then 'Mãos: fascinação por mãos masculinas/femininas, cuidados, anéis e a forma como tocam.'
    when 'cabelo'                then 'Cabelo: prazer em ver, tocar, puxar levemente — o cabelo como elemento erótico.'
    when 'boca-labios'           then 'Boca/Lábios: foco no desenho dos lábios, beijos lentos, batom e tudo que passa pela boca.'
    when 'professor-aluno'       then 'Professor/Aluno (universitário): roleplay clássico de autoridade, lições particulares e tensão.'
    when 'chefe-secretaria'      then 'Chefe/Secretária: dinâmica de poder no ambiente corporativo, encontros proibidos depois do expediente.'
    when 'medico-paciente'       then 'Médico/Paciente: consultas íntimas, exames cuidadosos e o desejo travestido de profissionalismo.'
    when 'estranhos'             then 'Estranhos: o frio na barriga de não conhecer a outra pessoa — só desejo e fantasia.'
    when 'cera'                  then 'Cera: gotas quentes percorrendo a pele em jogo controlado de sensação e contraste.'
    when 'gelo'                  then 'Gelo: choque térmico, arrepio e brincadeiras de temperatura ao longo do corpo.'
    when 'massagem'              then 'Massagem: toque demorado, óleos quentes e relaxamento que vira preliminares prolongadas.'
    when 'cocegas'               then 'Cócegas: sensação travessa que mistura riso, tensão e perda de controle — sempre consensual.'
    when 'casal'                 then 'Casal: dinâmica a dois, cumplicidade sexual e cumplicidade emocional dentro do prazer.'
    when 'trisal'                then 'Trisal: relação consensual entre três pessoas, com regras claras e desejo compartilhado.'
    when 'swing'                 then 'Swing: troca de casais em ambiente seguro, com consenso prévio e respeito mútuo.'
    when 'cuckold'               then 'Cuckold: prazer em saber/assistir a parceira(o) com outra pessoa, dentro de um acordo consensual.'
    when 'goth'                  then 'Goth: estética sombria, batom escuro, atitude misteriosa — o erotismo do underground.'
    when 'punk'                  then 'Punk: rebeldia, cabelos coloridos, atitude — o tesão do contracultural.'
    when 'nerd-geek'             then 'Nerd/Geek: óculos, cosplay, paixão por cultura pop — o tesão da inteligência travessa.'
    when 'tatuadas-tatuados'     then 'Tatuadas(os): pele decorada por traços que contam histórias — admiração estética e tátil.'
    when 'sexting'               then 'Sexting: troca de mensagens picantes, antecipação e provocação no celular.'
    when 'audio-sensual'         then 'Áudio sensual: sussurros, gemidos e voz — o erotismo só pelo som.'
    when 'trocas-de-fotos'       then 'Trocas de fotos: imagens íntimas trocadas com confiança e desejo de quem está do outro lado.'
    when 'conversa-romantica'    then 'Conversa romântica: papo lento, presença, conexão antes de qualquer coisa física.'
    when 'tabu-estranhos'        then 'Estranhos (tabu): o desejo proibido por quem você nunca viu — fantasia pura.'
    when 'encontros-casuais'     then 'Encontros casuais: sem compromisso, sem rótulo, só presente e prazer.'
    when 'traicao-roleplay'      then 'Traição (roleplay): dramatização do "proibido" dentro de um acordo claro entre adultos.'
    when 'voyeurismo-publico'    then 'Voyeurismo público: o tesão de observar/ser observado em cenários consensuais.'
    else 'Fetiche para explorar com consentimento, segurança e diversão.'
  end as description,
  'https://picsum.photos/seed/' || f.slug || '/1280/640' as image_url,
  f.id as fetish_id,
  ((c.sort_order - 1) * 4 + f.sort_order) as sort_order,
  true as is_active
from public.fetishes f
join public.categories c on c.id = f.category_id
where f.sort_order <= 4
on conflict do nothing;

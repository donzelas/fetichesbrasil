-- =====================================================
-- 0025: Conteudo SEO unico por fetiche (gerado por IA)
-- Substitui o template generico atual por artigo unico
-- de 800-1500 palavras por pagina.
-- =====================================================

alter table public.fetishes
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text[],
  add column if not exists seo_content jsonb,
  add column if not exists seo_generated_at timestamptz,
  add column if not exists seo_llm_provider text,
  add column if not exists seo_llm_model text;

create index if not exists fetishes_seo_pending_idx
  on public.fetishes (slug)
  where seo_content is null;

-- Estrutura esperada de seo_content (jsonb):
-- {
--   "intro": "paragrafo de abertura...",
--   "sections": [
--     { "title": "O que e", "body": "..." },
--     { "title": "Origem do termo", "body": "..." },
--     ...
--   ],
--   "faqs": [
--     { "q": "...", "a": "..." }
--   ],
--   "internal_links_hint": ["bondage","dominacao",...]
-- }

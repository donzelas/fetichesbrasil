import Groq from "groq-sdk";
import type { SeoFetishContent } from "@/types/database";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const PROMPT = `Voce e um redator SEO especialista em educacao sexual adulta
para o publico brasileiro. Tom EDUCATIVO, INFORMATIVO e PROFISSIONAL -
o Google PREMIA esse tom para nicho adulto.

FETICHE A ESCREVER: {nome}
CATEGORIA: {categoria}
SLUG: {slug}

OBJETIVO DA PAGINA:
- Rankear no Google para "o que e {nome}", "{nome} significado",
  "{nome} brasil", e variacoes long-tail
- Trazer visitante curioso e converter em cadastro
- Demonstrar autoridade (E-E-A-T do Google)

REGRAS DE LINGUAGEM:
- Use termos diretos: "preferencia sexual", "pratica sexual",
  "intimidade", "sexualidade" (Google nao bane em contexto educativo)
- Tom academico-acessivel, como educacao sexual seria
- NAO use algospeak velado
- NAO descreva atos explicitos passo a passo
- Sempre reforce: ADULTOS, CONSENSUAIS, MAIORES DE 18
- Cite SSC (Sao Seguro Consensual) ou RACK quando aplicavel

ESTRUTURA OBRIGATORIA - 1000-1500 PALAVRAS NO TOTAL:
- intro: 3-4 paragrafos (200-280 palavras), inclui "{nome}" 2-3x
- 6 sections OBRIGATORIAS, cada title H2 + body 140-220 palavras
  Escolha 6 entre:
    * "O que e {nome}"
    * "Origem do termo e contexto historico"
    * "Como esta preferencia se manifesta na pratica"
    * "Por que algumas pessoas se identificam"
    * "{nome} no Brasil: dados e cultura"
    * "Pratica segura e consentimento"
    * "Mitos e desinformacao comuns"
    * "Como conversar com o parceiro"
    * "Onde encontrar comunidade no Brasil"
- 6 FAQs com respostas 80-120 palavras
- internal_links_hint: 3-5 slugs de fetiches relacionados

KEYWORDS NATURAIS: usar {nome} 8-12 vezes, "Brasil"/"brasileiros"
3-5x, "consensual"/"adultos"/"consentimento" multiplas vezes.

SAIDA: APENAS JSON valido, sem markdown, formato EXATO:

{
  "intro": "paragrafo 1.\\n\\nparagrafo 2.\\n\\nparagrafo 3.",
  "sections": [
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ],
  "faqs": [
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." }
  ],
  "internal_links_hint": ["slug-1", "slug-2", "slug-3"],
  "seo_title": "Titulo da pagina (max 60 chars)",
  "seo_description": "Meta description (max 160 chars)",
  "seo_keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"]
}

GERE AGORA O CONTEUDO COMPLETO:`;

export interface GeneratedSeoFetish {
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  seo_content: SeoFetishContent;
  llm_provider: string;
  llm_model: string;
  word_count: number;
}

export async function generateFetishSeoContent(args: {
  name: string;
  slug: string;
  categoryName: string;
}): Promise<GeneratedSeoFetish> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY nao configurada");

  const groq = new Groq({ apiKey });

  const prompt = PROMPT.replaceAll("{nome}", args.name)
    .replaceAll("{categoria}", args.categoryName)
    .replaceAll("{slug}", args.slug);

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq retornou resposta vazia");

  const data = JSON.parse(raw) as {
    intro?: string;
    sections?: Array<{ title?: string; body?: string }>;
    faqs?: Array<{ q?: string; a?: string }>;
    internal_links_hint?: string[];
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
  };

  const seoContent: SeoFetishContent = {
    intro: data.intro ?? "",
    sections: (data.sections ?? [])
      .filter((s) => s.title && s.body)
      .map((s) => ({ title: s.title!, body: s.body! })),
    faqs: (data.faqs ?? [])
      .filter((f) => f.q && f.a)
      .map((f) => ({ q: f.q!, a: f.a! })),
    internal_links_hint: data.internal_links_hint ?? [],
  };

  const wordCount = (
    seoContent.intro +
    " " +
    seoContent.sections.map((s) => s.body).join(" ")
  )
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    seo_title: data.seo_title ?? args.name,
    seo_description:
      data.seo_description ??
      `Tudo sobre ${args.name} entre adultos consensuais brasileiros.`,
    seo_keywords: data.seo_keywords ?? [args.name.toLowerCase()],
    seo_content: seoContent,
    llm_provider: "groq",
    llm_model: GROQ_MODEL,
    word_count: wordCount,
  };
}

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

/**
 * Endpoint de DEBUG: testa Groq e Gemini isoladamente e
 * retorna info detalhada sobre cada um. Usa apenas X-Admin-Token.
 * Util pra diagnosticar problemas em producao sem ter cookie de admin.
 */
export async function POST(request: Request) {
  const adminToken = request.headers.get("x-admin-token");
  const expectedToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken || adminToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report: Record<string, unknown> = {
    env: {
      GROQ_API_KEY_present: !!process.env.GROQ_API_KEY,
      GROQ_API_KEY_length: process.env.GROQ_API_KEY?.length ?? 0,
      GROQ_API_KEY_starts: process.env.GROQ_API_KEY?.slice(0, 8),
      GEMINI_API_KEY_present: !!process.env.GEMINI_API_KEY,
      GEMINI_API_KEY_length: process.env.GEMINI_API_KEY?.length ?? 0,
      GEMINI_API_KEY_starts: process.env.GEMINI_API_KEY?.slice(0, 8),
      ADMIN_API_TOKEN_present: !!process.env.ADMIN_API_TOKEN,
      node_version: process.version,
    },
  };

  // Teste Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Responda apenas: ok" }],
        max_tokens: 10,
      });
      report.groq = { ok: true, response: res.choices[0]?.message?.content };
    } catch (e) {
      report.groq = {
        ok: false,
        error_name: e instanceof Error ? e.name : "?",
        error_message: e instanceof Error ? e.message : String(e),
        error_stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5).join("\n") : null,
      };
    }
  } else {
    report.groq = { ok: false, error_message: "GROQ_API_KEY ausente" };
  }

  // Teste Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      });
      const res = await model.generateContent("Responda apenas: ok");
      report.gemini = { ok: true, response: res.response.text() };
    } catch (e) {
      report.gemini = {
        ok: false,
        error_name: e instanceof Error ? e.name : "?",
        error_message: e instanceof Error ? e.message : String(e),
        error_stack: e instanceof Error ? e.stack?.split("\n").slice(0, 8).join("\n") : null,
        // Tenta extrair cause/innerError
        error_cause: (e as { cause?: unknown })?.cause
          ? String((e as { cause?: unknown }).cause)
          : null,
      };
    }
  } else {
    report.gemini = { ok: false, error_message: "GEMINI_API_KEY ausente" };
  }

  return NextResponse.json(report);
}

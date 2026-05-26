import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

/**
 * Aciona o pipeline de producao de video apos aprovacao do admin.
 *
 * Tem 2 modos:
 *
 *   1. DEV/LOCAL: Se IAS_LOCAL_PYTHON_PATH definido, roda
 *      `python run_pipeline.py <script_id>` direto no servidor.
 *      Resposta imediata (200) e pipeline roda em background.
 *
 *   2. PROD: Se N8N_TIKTOK_WEBHOOK_URL definido, POSTa pro webhook
 *      do n8n que vai rodar o pipeline em outra maquina.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const localPython = process.env.IAS_LOCAL_PYTHON_PATH;
  const webhookUrl = process.env.N8N_TIKTOK_WEBHOOK_URL;

  if (localPython) {
    runLocalPipeline(localPython, id);
    return NextResponse.json({ ok: true, mode: "local" });
  }

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify({ script_id: id }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { error: `Webhook n8n retornou ${res.status}: ${text.slice(0, 200)}` },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, mode: "n8n" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `Falha ao chamar webhook n8n: ${msg}` },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Configure IAS_LOCAL_PYTHON_PATH (dev) OU N8N_TIKTOK_WEBHOOK_URL (prod) no .env",
    },
    { status: 500 }
  );
}

/**
 * Dispara run_pipeline.py em background. Nao espera terminar.
 * O proprio script atualiza status no Supabase conforme avanca.
 */
function runLocalPipeline(pythonPath: string, scriptId: string): void {
  const scriptsDir = path.join(process.cwd(), "IAS", "scripts");
  const child = spawn(pythonPath, ["run_pipeline.py", scriptId], {
    cwd: scriptsDir,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    windowsHide: true,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

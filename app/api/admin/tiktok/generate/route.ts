import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

/**
 * Dispara a geracao manual de um novo roteiro TikTok via IA.
 *
 * Comportamento depende de IAS_LOCAL_PYTHON_PATH no .env:
 *
 * 1. Se definido: executa o script Python local
 *    (uso em desenvolvimento ou no notebook 24/7 rodando o app)
 *
 * 2. Se nao definido: tenta chamar o webhook do n8n
 *    (uso em producao quando o site esta em VPS/Netlify e o
 *    n8n roda em outro lugar)
 */
interface GenerateBody {
  fetiche_id?: string;
  tema?: string;
  categoria?: string;
}

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as GenerateBody;

  const localPython = process.env.IAS_LOCAL_PYTHON_PATH;
  const generateWebhook = process.env.N8N_GENERATE_WEBHOOK_URL;

  if (localPython) {
    return runLocalPython(localPython, body);
  }
  if (generateWebhook) {
    return triggerN8nGenerate(generateWebhook, body);
  }

  return NextResponse.json(
    {
      error:
        "Configure IAS_LOCAL_PYTHON_PATH (dev local) OU N8N_GENERATE_WEBHOOK_URL (producao) no .env",
    },
    { status: 500 }
  );
}

function runLocalPython(pythonPath: string, body: GenerateBody): Promise<NextResponse> {
  return new Promise((resolve) => {
    const scriptsDir = path.join(process.cwd(), "IAS", "scripts");
    const args = ["gerar_roteiro.py"];
    if (body.fetiche_id) {
      args.push("--fetiche-id", body.fetiche_id);
    } else if (body.tema) {
      args.push("--tema", body.tema);
      if (body.categoria) {
        args.push("--categoria", body.categoria);
      }
    }

    const child = spawn(pythonPath, args, {
      cwd: scriptsDir,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const timeout = setTimeout(() => {
      child.kill();
      resolve(
        NextResponse.json(
          { error: "Timeout: gerar_roteiro.py demorou mais de 60s" },
          { status: 504 }
        )
      );
    }, 60_000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(NextResponse.json({ ok: true, output: stderr || stdout }));
      } else {
        resolve(
          NextResponse.json(
            {
              error: `Script saiu com codigo ${code}`,
              stdout,
              stderr,
            },
            { status: 500 }
          )
        );
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve(
        NextResponse.json(
          { error: `Falha ao iniciar Python: ${err.message}` },
          { status: 500 }
        )
      );
    });
  });
}

async function triggerN8nGenerate(
  webhookUrl: string,
  body: GenerateBody
): Promise<NextResponse> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({ trigger: "manual", ...body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Webhook n8n retornou ${res.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Falha ao chamar webhook: ${msg}` },
      { status: 502 }
    );
  }
}

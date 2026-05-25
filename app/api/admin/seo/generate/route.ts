import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

/**
 * Dispara a geracao de conteudo SEO em massa via Python local.
 *
 * Body opcional:
 *   { slug: "dominacao" }       -> gera so esse
 *   { mode: "pending" }         -> gera so os faltantes (recomendado)
 *   { mode: "all", force: true} -> regera TODOS (cuidado, demora)
 *   { mode: "pending", limit: 10 } -> gera 10 dos pendentes
 *
 * Processo roda em background (detached). O endpoint responde
 * imediatamente. O status pode ser consultado em /admin/seo
 * que mostra quantos ja tem seo_content.
 */
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

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    mode?: "pending" | "all";
    force?: boolean;
    limit?: number;
  };

  const localPython = process.env.IAS_LOCAL_PYTHON_PATH;
  if (!localPython) {
    return NextResponse.json(
      {
        error:
          "IAS_LOCAL_PYTHON_PATH nao configurada. Geracao de SEO so funciona no servidor com Python.",
      },
      { status: 500 }
    );
  }

  const args = ["gerar_seo_fetiche.py"];
  if (body.slug) {
    args.push("--slug", body.slug);
  } else if (body.mode === "all") {
    args.push("--all");
  } else {
    args.push("--pending");
  }
  if (body.force) args.push("--force");
  if (body.limit && body.limit > 0) {
    args.push("--limit", String(body.limit));
  }

  const scriptsDir = path.join(process.cwd(), "IAS", "scripts");
  const child = spawn(localPython, args, {
    cwd: scriptsDir,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    windowsHide: true,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({
    ok: true,
    mode: body.mode ?? (body.slug ? "slug" : "pending"),
    args,
  });
}

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";

/**
 * Remove maxAge/expires dos options dos cookies de auth, transformando-os
 * em "session cookies" — eles são apagados quando o navegador é fechado.
 * Combinado com AutoLogout client-side (5min sem foco), garante que o usuário
 * sempre precisa logar novamente.
 *
 * EXCECAO pra admin: se cookie `fb_admin_session=1` existe, mantem
 * sessao persistente (admin nao desloga sozinho).
 */
function toSessionOnly(options: CookieOptions): CookieOptions {
  const rest = { ...options };
  delete (rest as { maxAge?: unknown }).maxAge;
  delete (rest as { expires?: unknown }).expires;
  return rest;
}

const ADMIN_SESSION_COOKIE = "fb_admin_session";

export async function createClient() {
  const cookieStore = await cookies();
  const keepSession = cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "1";

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions = keepSession ? options : toSessionOnly(options);
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // Server Components não podem setar cookies — ignorado em SSR puro
          }
        },
      },
    }
  );
}

export interface Viewer {
  isAuthenticated: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  userId: string | null;
}

export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAuthenticated: false, isPremium: false, isAdmin: false, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, is_admin")
    .eq("id", user.id)
    .single();

  return {
    isAuthenticated: true,
    isPremium: !!profile?.is_premium,
    isAdmin: !!profile?.is_admin,
    userId: user.id,
  };
}

/**
 * Exige usuário autenticado. Redireciona para /login se não estiver logado.
 * Aceita usuários comuns e admin (use para páginas onde admin pode atuar como observador).
 */
export async function requireUser(redirectTo?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer.isAuthenticated) {
    const url = redirectTo
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(url);
  }
  return viewer;
}

/**
 * Use em páginas públicas (não-admin) para:
 *  - exigir login (redirect /login se não autenticado)
 *  - forçar admins a permanecerem em /admin
 * Retorna o viewer já carregado para reuso na página.
 */
export async function getViewerOrRedirectAdmin(redirectTo?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer.isAuthenticated) {
    const url = redirectTo
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(url);
  }
  if (viewer.isAdmin) {
    redirect("/admin");
  }
  return viewer;
}

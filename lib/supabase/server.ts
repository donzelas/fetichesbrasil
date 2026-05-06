import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

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
              cookieStore.set(name, value, options);
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

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Remove maxAge/expires para que os cookies de auth virem session cookies
 * (apagados quando o navegador é fechado).
 */
function toSessionOnly(options: CookieOptions): CookieOptions {
  const rest = { ...options };
  delete (rest as { maxAge?: unknown }).maxAge;
  delete (rest as { expires?: unknown }).expires;
  return rest;
}

const ADMIN_SESSION_COOKIE = "fb_admin_session";

/**
 * Middleware leve: só repassa cookies (refresh de sessão) sem chamar
 * supabase.auth.getUser(). A validação de auth é feita nas próprias
 * páginas/layouts (Node runtime), evitando bug de TLS no Edge Runtime
 * em ambientes com interceptação SSL (antivírus / proxy corporativo).
 *
 * EXCECAO: se cookie `fb_admin_session=1` existe, mantem cookies
 * persistentes (admin nao desloga sozinho).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const keepSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value === "1";

  // Inicializa o client apenas para sincronizar cookies enviados/recebidos.
  createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = keepSession ? options : toSessionOnly(options);
            supabaseResponse.cookies.set(name, value, finalOptions);
          });
        },
      },
    }
  );

  return supabaseResponse;
}

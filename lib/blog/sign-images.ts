import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Mapeia paths internos do bucket `feed-images` para URLs do nosso endpoint
 * protegido `/api/feed-image/[...path]`.
 *
 * O endpoint:
 *   - Exige sessão autenticada (URLs vazadas não funcionam fora do site).
 *   - Aplica overlay com @username do VIEWER em cada imagem (fingerprint).
 *   - Devolve JPEG com `Cache-Control: private, max-age=300`.
 *
 * O parâmetro `client` é mantido por compatibilidade com chamadas existentes
 * (vários callers já passam o supabase server client). Ele não é necessário
 * aqui — toda a autorização acontece no endpoint server-side.
 */
export async function signBlogImagePaths(
  _client: SupabaseClient<Database>,
  paths: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (!paths.length) return map;

  for (const path of paths) {
    map[path] = buildProtectedUrl(path);
  }
  return map;
}

export function buildProtectedUrl(storagePath: string): string {
  const safe = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/feed-image/${safe}`;
}

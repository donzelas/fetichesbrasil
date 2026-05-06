import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const FEED_BUCKET = "feed-images";
const TTL = 60 * 60; // 1h

export async function signBlogImagePaths(
  client: SupabaseClient<Database>,
  paths: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (!paths.length) return map;

  const { data } = await client.storage.from(FEED_BUCKET).createSignedUrls(paths, TTL);
  if (data) {
    for (const s of data) {
      if (s.path && s.signedUrl) {
        map[s.path] = s.signedUrl;
      }
    }
  }
  return map;
}

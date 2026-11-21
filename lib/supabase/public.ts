import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createClient> | null = null;

/** Anonymous, cookie-free client for public reads. RLS limits it to published content. */
export function createPublicClient() {
  client ??= createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

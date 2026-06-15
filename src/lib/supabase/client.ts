import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseUrl } from "@/lib/supabase/env";

const supabaseUrl = getPublicSupabaseUrl();
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_erz6jERFBG_3GkebejSg8g_Jfe4zbZn";

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

export function createClient() {
  return supabase;
}

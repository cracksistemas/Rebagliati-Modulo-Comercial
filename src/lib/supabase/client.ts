import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ombsfjcrzxtctpgmsnvd.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_erz6jERFBG_3GkebejSg8g_Jfe4zbZn";

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

export function createClient() {
  return supabase;
}

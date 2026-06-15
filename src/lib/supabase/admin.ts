import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseUrl } from "@/lib/supabase/env";

export function getAdminSupabaseProjectRef() {
  const supabaseUrl = getServerSupabaseUrl();
  if (!supabaseUrl) return "missing-url";
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "unknown-ref";
  } catch {
    return "invalid-url";
  }
}

export function createAdminClient() {
  const supabaseUrl = getServerSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY server environment variable.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function normalizeSupabaseUrl(value?: string | null) {
  const fallback = "https://ombsfjcrzxtctpgmsnvd.supabase.co";
  const rawValue = (value ?? fallback).trim();

  if (!rawValue) return fallback;

  try {
    const url = new URL(rawValue);
    url.pathname = url.pathname.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/g, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/g, "");
  } catch {
    return rawValue.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/g, "");
  }
}

export function getPublicSupabaseUrl() {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getServerSupabaseUrl() {
  return normalizeSupabaseUrl(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
}

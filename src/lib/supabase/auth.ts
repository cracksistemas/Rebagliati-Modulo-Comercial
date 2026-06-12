import type { UserRole } from "@/types/sales";
import { createClient } from "@/lib/supabase/client";

export interface SessionProfile {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export const demoProfile: SessionProfile = {
  id: "demo-gerencia",
  fullName: "Gerencia Comercial",
  role: "gerencia",
  avatarUrl: "/avatars/gerencia.svg"
};

interface DbProfile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
}

export async function loadCurrentProfile(): Promise<SessionProfile | null> {
  try {
    const response = await fetch("/api/session/me", { cache: "no-store" });
    const payload = (await response.json()) as { ok?: boolean; data?: SessionProfile };
    if (response.ok && payload.ok && payload.data) return payload.data;
  } catch {
    // Fallback to direct profile read below.
  }

  const supabase = createClient() as any;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const profile = data as DbProfile;
  const updatedProfile = await loadCurrentProfile();
  if (updatedProfile) return updatedProfile;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    avatarUrl: profile.avatar_url ?? undefined
  };
}

export async function updateCurrentProfileName(fullName: string) {
  const supabase = createClient() as any;
  const { data, error } = await supabase.rpc("update_current_profile_name", {
    profile_name: fullName
  });

  if (error) throw error;

  const profile = data as DbProfile;
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    avatarUrl: profile.avatar_url ?? undefined
  } satisfies SessionProfile;
}

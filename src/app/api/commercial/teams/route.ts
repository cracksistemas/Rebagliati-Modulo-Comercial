import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TeamPayload = {
  id: string;
  name: string;
  color: string;
  leaderId?: string;
  goalAmount?: number;
  active?: boolean;
  memberIds?: string[];
};

async function resolveLeaderExecutiveId(admin: ReturnType<typeof createAdminClient>, leaderId?: string) {
  if (!leaderId) return null;

  const { data: executiveById } = await admin.from("executives").select("id").eq("id", leaderId).maybeSingle();
  if (executiveById?.id) return executiveById.id;

  const { data: executiveByProfile } = await admin.from("executives").select("id").eq("profile_id", leaderId).maybeSingle();
  if (executiveByProfile?.id) return executiveByProfile.id;

  const { data: profile, error: profileError } = await admin.from("profiles").select("id,full_name,role,avatar_url,active").eq("id", leaderId).maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.id) return null;

  const executiveId = crypto.randomUUID();
  const { error } = await admin.from("executives").insert({
    id: executiveId,
    profile_id: profile.id,
    code: `USR-${String(profile.id).slice(0, 4).toUpperCase()}`,
    full_name: profile.full_name,
    photo_url: profile.avatar_url,
    shift: "Manana",
    status: profile.active === false ? "Inactivo" : "Activo"
  });
  if (error) throw error;
  return executiveId;
}

async function requireUser() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }
  return { ok: true as const, userId: user.id };
}

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const payload = (await request.json()) as TeamPayload;
    if (!payload.id || !payload.name?.trim()) throw new Error("El equipo necesita nombre.");

    const admin = createAdminClient();
    const leaderExecutiveId = await resolveLeaderExecutiveId(admin, payload.leaderId);
    const team = {
      id: payload.id,
      name: payload.name.trim(),
      color: payload.color || "#00A7EB",
      leader_id: leaderExecutiveId,
      goal_amount: Number(payload.goalAmount ?? 0),
      active: payload.active !== false
    };

    const { error: teamError } = await admin.from("teams").upsert(team);
    if (teamError) throw teamError;

    const memberIds = [...new Set(payload.memberIds ?? [])];
    const today = new Date().toISOString().slice(0, 10);

    const { data: activeMembers, error: activeError } = await admin
      .from("team_members")
      .select("id,executive_id")
      .eq("team_id", payload.id)
      .eq("active", true);
    if (activeError) throw activeError;

    const activeByExecutive = new Map(((activeMembers ?? []) as { id: string; executive_id: string }[]).map((item) => [item.executive_id, item.id]));
    const toClose = [...activeByExecutive.entries()].filter(([executiveId]) => !memberIds.includes(executiveId)).map(([, id]) => id);
    if (toClose.length) {
      const { error } = await admin.from("team_members").update({ active: false, end_date: today }).in("id", toClose);
      if (error) throw error;
    }

    for (const executiveId of memberIds) {
      await admin
        .from("team_members")
        .update({ active: false, end_date: today })
        .eq("executive_id", executiveId)
        .eq("active", true)
        .neq("team_id", payload.id);

      if (!activeByExecutive.has(executiveId)) {
        const { data: existingLink, error: findError } = await admin
          .from("team_members")
          .select("id")
          .eq("team_id", payload.id)
          .eq("executive_id", executiveId)
          .maybeSingle();
        if (findError) throw findError;

        if (existingLink?.id) {
          const { error } = await admin.from("team_members").update({ start_date: today, end_date: null, active: true }).eq("id", existingLink.id);
          if (error) throw error;
        } else {
          const { error } = await admin.from("team_members").insert({
            team_id: payload.id,
            executive_id: executiveId,
            start_date: today,
            end_date: null,
            active: true
          });
          if (error) throw error;
        }
      }
    }

    return NextResponse.json({ ok: true, data: { team: { ...payload, leaderId: leaderExecutiveId ?? undefined }, memberIds } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el equipo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

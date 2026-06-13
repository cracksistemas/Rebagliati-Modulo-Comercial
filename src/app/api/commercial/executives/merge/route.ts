import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExecutiveRow = {
  id: string;
  full_name: string;
  code: string | null;
  profile_id: string | null;
  photo_url: string | null;
  shift: string | null;
  status: string | null;
  goal_amount?: number | null;
  current_sales?: number | null;
  points?: number | null;
  previous_rank?: number | null;
  created_at: string;
};

type AuthUser = {
  id: string;
  email?: string;
};

function normalizeName(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function nameTokens(value = "") {
  return normalizeName(value).split(" ").filter(Boolean);
}

function isActive(status?: string | null) {
  const normalized = String(status ?? "Activo").toLowerCase();
  return !normalized.includes("baja") && !normalized.includes("inactivo");
}

function tokenSetContains(container: string[], candidate: string[]) {
  if (!container.length || !candidate.length) return false;
  return candidate.every((token) => container.includes(token));
}

function namesMatch(left: string, right: string) {
  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  if (!leftTokens.length || !rightTokens.length) return false;
  if (normalizeName(left) === normalizeName(right)) return true;
  return tokenSetContains(leftTokens, rightTokens) || tokenSetContains(rightTokens, leftTokens);
}

function betterName(rows: ExecutiveRow[]) {
  return [...rows].sort((a, b) => normalizeName(b.full_name).length - normalizeName(a.full_name).length)[0]?.full_name ?? rows[0].full_name;
}

function chooseCanonical(rows: ExecutiveRow[], emailByProfile: Map<string, string>, relationCount: Map<string, number>) {
  return [...rows].sort((a, b) => {
    const aEmail = a.profile_id ? emailByProfile.get(a.profile_id) : "";
    const bEmail = b.profile_id ? emailByProfile.get(b.profile_id) : "";
    if (Boolean(bEmail) !== Boolean(aEmail)) return Number(Boolean(bEmail)) - Number(Boolean(aEmail));
    if (Boolean(b.profile_id) !== Boolean(a.profile_id)) return Number(Boolean(b.profile_id)) - Number(Boolean(a.profile_id));
    const bRelations = relationCount.get(b.id) ?? 0;
    const aRelations = relationCount.get(a.id) ?? 0;
    if (bRelations !== aRelations) return bRelations - aRelations;
    if (Boolean(b.photo_url) !== Boolean(a.photo_url)) return Number(Boolean(b.photo_url)) - Number(Boolean(a.photo_url));
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
}

async function requireAdmin() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = String(profile?.role ?? "").toLowerCase();
  if (!role.includes("admin_sistema") && !role.includes("gerencia") && !role.includes("jefe")) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "No tienes permisos para fusionar ejecutivos." }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users: AuthUser[] = [];
  const perPage = 100;
  for (let page = 1; page <= 200; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    const lastPage = Number((data as { lastPage?: number }).lastPage ?? 0);
    if (!data.users.length || (lastPage > 0 ? page >= lastPage : data.users.length < perPage)) break;
  }
  return users;
}

function buildDuplicateGroups(executives: ExecutiveRow[], emailByProfile: Map<string, string>) {
  const active = executives.filter((item) => isActive(item.status));
  const visited = new Set<string>();
  const groups: ExecutiveRow[][] = [];

  for (const executive of active) {
    if (visited.has(executive.id)) continue;
    const group = [executive];
    visited.add(executive.id);

    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of active) {
        if (visited.has(candidate.id)) continue;
        const candidateEmail = candidate.profile_id ? emailByProfile.get(candidate.profile_id) : "";
        const matches = group.some((member) => {
          const memberEmail = member.profile_id ? emailByProfile.get(member.profile_id) : "";
          return namesMatch(member.full_name, candidate.full_name) || (Boolean(memberEmail) && memberEmail === candidateEmail);
        });
        if (matches) {
          group.push(candidate);
          visited.add(candidate.id);
          changed = true;
        }
      }
    }

    if (group.length > 1) groups.push(group);
  }

  return groups;
}

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const admin = createAdminClient();
    const [executivesResult, salesResult, incidentsResult, authUsers] = await Promise.all([
      admin.from("executives").select("id,full_name,code,profile_id,photo_url,shift,status,goal_amount,current_sales,points,previous_rank,created_at").order("created_at", { ascending: true }),
      admin.from("sales").select("executive_id"),
      admin.from("commercial_incidents").select("executive_id,sales_leader_id"),
      listAllAuthUsers(admin)
    ]);

    if (executivesResult.error) throw executivesResult.error;
    if (salesResult.error) throw salesResult.error;
    if (incidentsResult.error && incidentsResult.error.code !== "42P01") throw incidentsResult.error;

    const executives = ((executivesResult.data ?? []) as ExecutiveRow[]);
    const emailByProfile = new Map(authUsers.map((user) => [user.id, String(user.email ?? "").toLowerCase()]));
    const relationCount = new Map<string, number>();
    (salesResult.data ?? []).forEach((sale: { executive_id: string | null }) => {
      if (sale.executive_id) relationCount.set(sale.executive_id, (relationCount.get(sale.executive_id) ?? 0) + 1);
    });
    (incidentsResult.data ?? []).forEach((incident: { executive_id: string | null; sales_leader_id: string | null }) => {
      if (incident.executive_id) relationCount.set(incident.executive_id, (relationCount.get(incident.executive_id) ?? 0) + 1);
      if (incident.sales_leader_id) relationCount.set(incident.sales_leader_id, (relationCount.get(incident.sales_leader_id) ?? 0) + 1);
    });

    const groups = buildDuplicateGroups(executives, emailByProfile);
    const merged = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const group of groups) {
      const canonical = chooseCanonical(group, emailByProfile, relationCount);
      const duplicates = group.filter((item) => item.id !== canonical.id);
      const finalName = betterName(group);
      const finalCode = canonical.code || group.find((item) => item.code)?.code || "";
      const finalPhoto = canonical.photo_url || group.find((item) => item.photo_url)?.photo_url || null;
      const finalGoal = Math.max(...group.map((item) => Number(item.goal_amount ?? 0)));
      const finalProfile = canonical.profile_id || group.find((item) => item.profile_id)?.profile_id || null;

      for (const duplicate of duplicates) {
        await admin.from("sales").update({ executive_id: canonical.id }).eq("executive_id", duplicate.id);
        await admin.from("ranking_snapshots").update({ executive_id: canonical.id }).eq("executive_id", duplicate.id);
        await admin.from("monthly_goals").update({ executive_id: canonical.id }).eq("executive_id", duplicate.id);
        await admin.from("commercial_incidents").update({ executive_id: canonical.id, executive_name: finalName }).eq("executive_id", duplicate.id);
        await admin.from("commercial_incidents").update({ sales_leader_id: canonical.id, sales_leader_name: finalName }).eq("sales_leader_id", duplicate.id);
        await admin.from("team_members").update({ active: false, end_date: today }).eq("executive_id", duplicate.id).eq("active", true);
        await admin.from("teams").update({ leader_id: canonical.id }).eq("leader_id", duplicate.id);
        await admin.from("executives").update({ status: "Baja", profile_id: null }).eq("id", duplicate.id);
      }

      await admin
        .from("executives")
        .update({
          full_name: finalName,
          code: finalCode,
          photo_url: finalPhoto,
          profile_id: finalProfile,
          goal_amount: finalGoal,
          status: "Activo"
        })
        .eq("id", canonical.id);

      if (finalProfile) {
        await admin.from("profiles").update({ full_name: finalName, avatar_url: finalPhoto, active: true }).eq("id", finalProfile);
      }

      merged.push({
        canonicalId: canonical.id,
        fullName: finalName,
        email: finalProfile ? emailByProfile.get(finalProfile) ?? "" : "",
        mergedIds: duplicates.map((item) => item.id),
        mergedNames: duplicates.map((item) => item.full_name)
      });
    }

    if (merged.length) {
      await admin.from("audit_logs").insert({
        table_name: "executives",
        action: "merge_duplicate_executives",
        user_id: guard.userId,
        new_data: { merged }
      });
    }

    return NextResponse.json({ ok: true, data: { merged } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron fusionar ejecutivos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

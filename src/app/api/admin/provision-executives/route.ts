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
  created_at: string;
};

type AuthUser = {
  id: string;
  email?: string;
};

const rankingNameOrder = [
  "ELIANA",
  "MARIANA",
  "DIEGO",
  "SAMANTHA",
  "ALEXANDRA",
  "KEVIN",
  "ANAROSA",
  "MARIA",
  "ARIANNA",
  "CAROLINA",
  "DANIELA",
  "ANA GABRIELA",
  "BONNIE",
  "BRIAN",
  "ERICK",
  "DIANA F",
  "DAYELI",
  "PATT",
  "MILUSKA",
  "ANTONELLA",
  "ESTHER",
  "STIVEN"
];

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isAdminRole(role = "") {
  const normalized = role.toLowerCase();
  return normalized.includes("admin_sistema") || normalized.includes("super") || normalized.includes("gerencia");
}

function isActiveExecutive(status?: string | null) {
  const normalized = String(status ?? "Activo").toLowerCase();
  return !normalized.includes("baja") && !normalized.includes("inactivo");
}

function orderIndex(name: string) {
  const normalized = normalizeText(name);
  const index = rankingNameOrder.findIndex((item) => normalized.includes(item));
  return index >= 0 ? index : 999;
}

function credentialForExecutive(executive: ExecutiveRow) {
  const normalized = normalizeText(executive.full_name);
  if (normalized.includes("RENATO")) {
    return {
      email: "jefe.ventas@rebagliati.com",
      password: "v3ntas_2026",
      role: "jefe_ventas",
      roleLabel: "Jefe de ventas",
      area: "Ventas"
    };
  }

  const rankingIndex = orderIndex(executive.full_name);
  const number = rankingIndex === 999 ? rankingNameOrder.length + 1 : rankingIndex + 1;
  return {
    email: `ejecutivo${number}@rebagliati.com`,
    password: `3j3cut1v0_${String(number).padStart(3, "0")}`,
    role: "ejecutivo",
    roleLabel: "Ejecutivo",
    area: "Ventas"
  };
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
  if (!isAdminRole(String(profile?.role ?? ""))) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "No tienes permisos para provisionar usuarios." }, { status: 403 }) };
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

function buildCanonicalExecutives(executives: ExecutiveRow[], saleCounts: Map<string, number>) {
  const grouped = new Map<string, ExecutiveRow[]>();
  executives.filter((item) => isActiveExecutive(item.status)).forEach((executive) => {
    const credentials = credentialForExecutive(executive);
    const list = grouped.get(credentials.email) ?? [];
    list.push(executive);
    grouped.set(credentials.email, list);
  });

  return [...grouped.entries()].map(([email, list]) => {
    const sorted = [...list].sort((a, b) => {
      const bSales = saleCounts.get(b.id) ?? 0;
      const aSales = saleCounts.get(a.id) ?? 0;
      if (bSales !== aSales) return bSales - aSales;
      if (a.profile_id && !b.profile_id) return -1;
      if (!a.profile_id && b.profile_id) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return { email, canonical: sorted[0], duplicates: sorted.slice(1) };
  });
}

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const admin = createAdminClient();
    const [{ data: executives, error: executivesError }, { data: salesRows, error: salesError }, authUsers] = await Promise.all([
      admin.from("executives").select("id,full_name,code,profile_id,photo_url,shift,status,created_at").order("created_at", { ascending: true }),
      admin.from("sales").select("executive_id"),
      listAllAuthUsers(admin)
    ]);

    if (executivesError) throw executivesError;
    if (salesError) throw salesError;

    const saleCounts = new Map<string, number>();
    (salesRows ?? []).forEach((sale: { executive_id: string | null }) => {
      if (sale.executive_id) saleCounts.set(sale.executive_id, (saleCounts.get(sale.executive_id) ?? 0) + 1);
    });

    const authByEmail = new Map(authUsers.map((user) => [String(user.email ?? "").toLowerCase(), user]));
    const targets = buildCanonicalExecutives((executives ?? []) as ExecutiveRow[], saleCounts)
      .sort((a, b) => orderIndex(a.canonical.full_name) - orderIndex(b.canonical.full_name));
    const credentials = [];

    for (const target of targets) {
      const executive = target.canonical;
      const credential = credentialForExecutive(executive);
      const existingAuthUser = authByEmail.get(credential.email);
      let userId = existingAuthUser?.id;

      if (userId) {
        const { error } = await admin.auth.admin.updateUserById(userId, {
          email: credential.email,
          password: credential.password,
          email_confirm: true,
          user_metadata: {
            full_name: executive.full_name,
            role: credential.role,
            area: credential.area
          }
        });
        if (error) throw error;
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email: credential.email,
          password: credential.password,
          email_confirm: true,
          user_metadata: {
            full_name: executive.full_name,
            role: credential.role,
            area: credential.area
          }
        });
        if (error) throw error;
        userId = data.user.id;
      }

      await admin.from("profiles").upsert({
        id: userId,
        full_name: executive.full_name,
        role: credential.role,
        avatar_url: executive.photo_url,
        active: true
      });

      await admin.from("executives").update({ profile_id: null }).eq("profile_id", userId).neq("id", executive.id);
      const { error: executiveUpdateError } = await admin
        .from("executives")
        .update({
          profile_id: userId,
          full_name: executive.full_name,
          status: "Activo"
        })
        .eq("id", executive.id);
      if (executiveUpdateError) throw executiveUpdateError;

      for (const duplicate of target.duplicates) {
        await admin.from("sales").update({ executive_id: executive.id }).eq("executive_id", duplicate.id);
        await admin.from("team_members").update({ active: false, end_date: new Date().toISOString().slice(0, 10) }).eq("executive_id", duplicate.id);
        await admin.from("executives").update({ status: "Baja", profile_id: null }).eq("id", duplicate.id);
      }

      credentials.push({
        executiveId: executive.id,
        fullName: executive.full_name,
        email: credential.email,
        password: credential.password,
        role: credential.roleLabel,
        status: existingAuthUser ? "Actualizado" : "Creado"
      });
    }

    await admin.from("audit_logs").insert({
      table_name: "profiles",
      action: "bulk_provision_executives",
      user_id: guard.userId,
      new_data: {
        count: credentials.length,
        emails: credentials.map((item) => item.email)
      }
    });

    return NextResponse.json({ ok: true, data: { credentials } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron provisionar accesos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

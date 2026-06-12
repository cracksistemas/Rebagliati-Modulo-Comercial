import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateUserPayload = {
  id?: string;
  fullName: string;
  email: string;
  password?: string;
  role: string;
  area?: string;
  status?: string;
  avatarDataUrl?: string;
  avatarUrl?: string;
  code?: string;
  shift?: string;
  teamId?: string;
};

function isAdminRole(role = "") {
  const normalized = role.toLowerCase();
  return normalized.includes("superadministrador") || normalized.includes("admin_sistema");
}

function isExecutiveRole(role = "") {
  return role.toLowerCase().includes("ejecutivo") || role.toLowerCase().includes("lider");
}

function normalizeProfileRole(role = "Ejecutivo") {
  const normalized = role.toLowerCase().trim().replace(/\s+/g, " ");
  if (normalized === "admin_sistema" || normalized.includes("super") || normalized === "administrador" || normalized.includes("administrador del sistema")) {
    return "admin_sistema";
  }
  if (normalized === "gerencia" || normalized.includes("gerencia")) return "gerencia";
  if (normalized === "jefe_ventas" || normalized.includes("jefe")) return "jefe_ventas";
  if (normalized === "lider_ventas" || normalized.includes("lider") || normalized.includes("líder")) return "lider_ventas";
  if (normalized === "marketing_soporte" || normalized.includes("marketing") || normalized.includes("soporte") || normalized.includes("solo lectura")) {
    return "marketing_soporte";
  }
  return "ejecutivo";
}

function roleLabel(role = "ejecutivo") {
  const normalized = normalizeProfileRole(role);
  const labels: Record<string, string> = {
    admin_sistema: "Superadministrador",
    gerencia: "Gerencia",
    jefe_ventas: "Jefe de ventas",
    lider_ventas: "Lider de ventas",
    ejecutivo: "Ejecutivo",
    marketing_soporte: "Marketing"
  };
  return labels[normalized] ?? "Ejecutivo";
}

function isUuid(value?: string) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function localTeamName(teamId?: string) {
  const map: Record<string, string> = {
    "team-azul": "Equipo Azul",
    "team-guinda": "Equipo Guinda",
    "team-verde": "Equipo Verde",
    "team-amarillo": "Equipo Amarillo"
  };
  return teamId ? map[teamId] ?? teamId : "";
}

async function resolveTeamUuid(admin: ReturnType<typeof createAdminClient>, teamId?: string) {
  if (!teamId) return null;
  if (isUuid(teamId)) return teamId;
  const teamName = localTeamName(teamId);
  const { data, error } = await admin.from("teams").select("id").ilike("name", teamName).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

function normalizeStatus(status = "Pendiente") {
  return status === "Activo";
}

function parseDataUrl(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return null;
  const [metadata, base64] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  return {
    bytes: Buffer.from(base64, "base64"),
    mimeType,
    extension
  };
}

function getErrorMessage(error: unknown, fallback = "No se pudo crear el usuario.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error) {
    const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code ? `Codigo: ${maybeError.code}` : ""].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function isEmailAlreadyRegistered(error: unknown) {
  return getErrorMessage(error, "").toLowerCase().includes("already been registered");
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 50;
  for (let page = 1; page <= 200; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;

    const lastPage = Number((data as { lastPage?: number }).lastPage ?? 0);
    if (!data.users.length || (lastPage > 0 ? page >= lastPage : data.users.length < perPage)) {
      return null;
    }
  }
  return null;
}

async function uploadAvatar(admin: ReturnType<typeof createAdminClient>, userId: string, avatarDataUrl?: string) {
  const parsed = parseDataUrl(avatarDataUrl);
  if (!parsed) return null;

  const path = `${userId}/profile-${Date.now()}.${parsed.extension}`;
  const { error } = await admin.storage.from("executive-photos").upload(path, parsed.bytes, {
    contentType: parsed.mimeType,
    upsert: true
  });

  if (error) return null;

  return path;
}

function extractExecutivePhotoPath(photoUrl: string) {
  try {
    const url = new URL(photoUrl);
    const markers = [
      "/storage/v1/object/public/executive-photos/",
      "/storage/v1/object/sign/executive-photos/"
    ];
    const marker = markers.find((item) => url.pathname.includes(item));
    if (!marker) return null;
    return decodeURIComponent(url.pathname.split(marker)[1] ?? "").split("?")[0];
  } catch {
    return null;
  }
}

function getPersistableAvatarValue(value?: string | null) {
  if (!value || value.startsWith("data:image/")) return null;
  if (value.startsWith("http")) return extractExecutivePhotoPath(value);
  return value;
}

async function resolveAvatarUrl(admin: ReturnType<typeof createAdminClient>, value?: string | null) {
  if (!value) return null;
  if (value.startsWith("data:image/") || value.startsWith("/")) return value;

  const path = value.startsWith("http") ? extractExecutivePhotoPath(value) : value;
  if (!path) return value;

  const { data, error } = await admin.storage.from("executive-photos").createSignedUrl(path, 60 * 60 * 24);
  if (error) return value.startsWith("http") ? value : null;
  return data.signedUrl;
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
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "No tienes permisos para crear usuarios." }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const admin = createAdminClient();
    const authUsers = [];
    const perPage = 50;

    for (let page = 1; page <= 200; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      authUsers.push(...data.users);

      const lastPage = Number((data as { lastPage?: number }).lastPage ?? 0);
      if (!data.users.length || (lastPage > 0 ? page >= lastPage : data.users.length < perPage)) break;
    }

    const ids = authUsers.map((user) => user.id);
    const { data: profiles, error: profileError } = ids.length
      ? await admin.from("profiles").select("id, full_name, role, avatar_url, active, created_at").in("id", ids)
      : { data: [], error: null };
    if (profileError) throw profileError;

    const { data: executives, error: executiveError } = ids.length
      ? await admin.from("executives").select("id, profile_id, code, shift, status, photo_url").in("profile_id", ids)
      : { data: [], error: null };
    if (executiveError) throw executiveError;

    const executiveIds = (executives ?? []).map((executive) => executive.id);
    const { data: memberships, error: membershipError } = executiveIds.length
      ? await admin.from("team_members").select("team_id, executive_id").in("executive_id", executiveIds).eq("active", true)
      : { data: [], error: null };
    if (membershipError) throw membershipError;

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const executiveByProfile = new Map((executives ?? []).map((executive) => [executive.profile_id, executive]));
    const membershipByExecutive = new Map((memberships ?? []).map((membership) => [membership.executive_id, membership]));
    const seenEmails = new Set<string>();

    const users = (
      await Promise.all(authUsers.map(async (authUser) => {
        const email = authUser.email?.trim().toLowerCase();
        if (!email || seenEmails.has(email)) return null;
        seenEmails.add(email);

        const profile = profileById.get(authUser.id);
        const executive = executiveByProfile.get(authUser.id);
        const membership = executive?.id ? membershipByExecutive.get(executive.id) : null;
        const metadata = authUser.user_metadata ?? {};
        const role = roleLabel(String(profile?.role ?? metadata.role ?? "ejecutivo"));
        const fullName = String(profile?.full_name ?? metadata.full_name ?? authUser.email ?? "Usuario");

        const rawAvatarUrl = profile?.avatar_url ?? executive?.photo_url ?? metadata.avatar_url ?? null;

        return {
          id: authUser.id,
          fullName,
          email,
          role,
          area: String(metadata.area ?? (role.includes("Jefe") || role.includes("Gerencia") ? "Gerencia Comercial" : "Ventas")),
          status: profile?.active === false ? "Inactivo" : "Activo",
          lastAccess: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString("es-PE") : "Sin acceso",
          createdAt: profile?.created_at ? String(profile.created_at).slice(0, 10) : String(authUser.created_at ?? "").slice(0, 10),
          avatarUrl: await resolveAvatarUrl(admin, rawAvatarUrl),
          code: executive?.code ?? "",
          shift: executive?.shift ?? "Manana",
          teamId: membership?.team_id ?? ""
        };
      }))
    ).filter(Boolean);

    return NextResponse.json({ ok: true, data: { users } });
  } catch (error) {
    const message = getErrorMessage(error, "No se pudo cargar usuarios.");
    console.error("Error en GET /api/admin/users", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let stage = "inicio";

  try {
    stage = "leer payload";
    const payload = (await request.json()) as CreateUserPayload;
    if (!payload.fullName?.trim() || !payload.email?.trim() || !payload.role?.trim()) {
      return NextResponse.json({ ok: false, error: "Nombre, correo y rol son obligatorios." }, { status: 400 });
    }

    stage = "crear cliente admin";
    const admin = createAdminClient();
    const shouldCreate = !isUuid(payload.id);
    const password = payload.password?.trim();
    const email = payload.email.trim();
    const roleCode = normalizeProfileRole(payload.role);

    stage = "buscar usuario existente por correo";
    const existingAuthUser = shouldCreate ? await findAuthUserByEmail(admin, email) : null;

    if (shouldCreate && !existingAuthUser && !password) {
      return NextResponse.json({ ok: false, error: "La contrasena inicial es obligatoria para crear el acceso." }, { status: 400 });
    }

    let userId = payload.id;

    if (shouldCreate && existingAuthUser) {
      userId = existingAuthUser.id;
      stage = "vincular usuario existente en Supabase Auth";
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        password: password || undefined,
        user_metadata: {
          full_name: payload.fullName.trim(),
          role: roleCode,
          area: payload.area ?? "Ventas"
        }
      });
      if (error) throw error;
    } else if (shouldCreate) {
      stage = "crear usuario en Supabase Auth";
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName.trim(),
          role: roleCode,
          area: payload.area ?? "Ventas"
        }
      });
      if (error) {
        if (isEmailAlreadyRegistered(error)) {
          stage = "recuperar usuario existente en Supabase Auth";
          const existingUser = await findAuthUserByEmail(admin, email);
          if (!existingUser) throw new Error("El correo ya existe en Supabase Auth, pero no se pudo recuperar para vincularlo.");
          userId = existingUser.id;
          stage = "vincular usuario existente en Supabase Auth";
          const { error: updateExistingError } = await admin.auth.admin.updateUserById(userId, {
            email,
            password: password || undefined,
            user_metadata: {
              full_name: payload.fullName.trim(),
              role: roleCode,
              area: payload.area ?? "Ventas"
            }
          });
          if (updateExistingError) throw updateExistingError;
        } else {
          throw error;
        }
      } else {
        userId = data.user.id;
      }
    } else if (userId) {
      stage = "actualizar usuario en Supabase Auth";
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        password: password || undefined,
        user_metadata: {
          full_name: payload.fullName.trim(),
          role: roleCode,
          area: payload.area ?? "Ventas"
        }
      });
      if (error) throw error;
    }

    if (!userId) throw new Error("No se pudo resolver el usuario creado.");

    stage = "subir foto";
    const uploadedAvatarPath = await uploadAvatar(admin, userId, payload.avatarDataUrl);
    const avatarPath = uploadedAvatarPath ?? getPersistableAvatarValue(payload.avatarUrl);
    const avatarUrl = await resolveAvatarUrl(admin, avatarPath);

    stage = "guardar perfil";
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      full_name: payload.fullName.trim(),
      role: roleCode,
      avatar_url: avatarPath,
      active: normalizeStatus(payload.status),
      created_at: new Date().toISOString()
    });
    if (profileError) throw profileError;

    let executiveId: string | null = null;

    if (isExecutiveRole(payload.role)) {
      const { data: existingExecutive } = await admin
        .from("executives")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      const executivePayload = {
        id: existingExecutive?.id ?? crypto.randomUUID(),
        profile_id: userId,
        code: payload.code?.trim() || `E-${userId.slice(0, 4).toUpperCase()}`,
        full_name: payload.fullName.trim(),
        photo_url: avatarPath,
        shift: payload.shift ?? "Manana",
        status: normalizeStatus(payload.status) ? "Activo" : "Inactivo"
      };

      stage = "guardar ejecutivo";
      const { data: executive, error: executiveError } = await admin
        .from("executives")
        .upsert(executivePayload)
        .select("id")
        .single();
      if (executiveError) throw executiveError;
      executiveId = executive.id;

      if (payload.teamId) {
        stage = "asignar equipo";
        const resolvedTeamId = await resolveTeamUuid(admin, payload.teamId);
        if (resolvedTeamId) {
          await admin.from("team_members").update({ active: false, end_date: new Date().toISOString().slice(0, 10) }).eq("executive_id", executiveId);
          const { error: memberError } = await admin.from("team_members").insert({
            team_id: resolvedTeamId,
            executive_id: executiveId,
            start_date: new Date().toISOString().slice(0, 10),
            active: true
          });
          if (memberError) throw memberError;
        }
      }
    }

    stage = "registrar auditoria";
    const { error: auditError } = await admin.from("audit_logs").insert({
      table_name: "profiles",
      record_id: userId,
      action: shouldCreate && existingAuthUser ? "link_existing_user" : shouldCreate ? "create_user" : "update_user",
      user_id: guard.userId,
      new_data: {
        email,
        role: roleCode,
        role_label: payload.role,
        executive_id: executiveId
      }
    });
    if (auditError) {
      console.error("No se pudo registrar auditoria de usuario", auditError);
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: userId,
        fullName: payload.fullName,
        email,
        role: payload.role,
        area: payload.area ?? "Ventas",
        status: payload.status ?? "Pendiente",
        avatarUrl,
        executiveId
      }
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Error en /api/admin/users durante etapa: ${stage}`, error);
    return NextResponse.json({ ok: false, error: message, stage }, { status: 500 });
  }
}

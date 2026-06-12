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
  return (
    normalized.includes("superadministrador") ||
    normalized.includes("administrador") ||
    normalized.includes("admin_sistema") ||
    normalized.includes("gerencia") ||
    normalized.includes("jefe")
  );
}

function isExecutiveRole(role = "") {
  return role.toLowerCase().includes("ejecutivo") || role.toLowerCase().includes("lider");
}

function isUuid(value?: string) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
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
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (!data.users.length || data.users.length < 1000) return null;
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

  const { data } = admin.storage.from("executive-photos").getPublicUrl(path);
  return data.publicUrl;
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
          role: payload.role,
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
          role: payload.role,
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
              role: payload.role,
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
          role: payload.role,
          area: payload.area ?? "Ventas"
        }
      });
      if (error) throw error;
    }

    if (!userId) throw new Error("No se pudo resolver el usuario creado.");

    stage = "subir foto";
    const uploadedAvatarUrl = await uploadAvatar(admin, userId, payload.avatarDataUrl);
    const avatarUrl = uploadedAvatarUrl ?? payload.avatarUrl ?? null;

    stage = "guardar perfil";
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      full_name: payload.fullName.trim(),
      role: payload.role,
      avatar_url: avatarUrl,
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
        photo_url: avatarUrl,
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
        await admin.from("team_members").update({ active: false, end_date: new Date().toISOString().slice(0, 10) }).eq("executive_id", executiveId);
        const { error: memberError } = await admin.from("team_members").insert({
          team_id: payload.teamId,
          executive_id: executiveId,
          start_date: new Date().toISOString().slice(0, 10),
          active: true
        });
        if (memberError) throw memberError;
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
        role: payload.role,
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

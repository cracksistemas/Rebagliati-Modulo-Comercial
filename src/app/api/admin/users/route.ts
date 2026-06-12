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

  try {
    const payload = (await request.json()) as CreateUserPayload;
    if (!payload.fullName?.trim() || !payload.email?.trim() || !payload.role?.trim()) {
      return NextResponse.json({ ok: false, error: "Nombre, correo y rol son obligatorios." }, { status: 400 });
    }

    const admin = createAdminClient();
    const shouldCreate = !isUuid(payload.id);
    const password = payload.password?.trim();

    if (shouldCreate && !password) {
      return NextResponse.json({ ok: false, error: "La contrasena inicial es obligatoria para crear el acceso." }, { status: 400 });
    }

    let userId = payload.id;

    if (shouldCreate) {
      const { data, error } = await admin.auth.admin.createUser({
        email: payload.email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName.trim(),
          role: payload.role,
          area: payload.area ?? "Ventas"
        }
      });
      if (error) throw error;
      userId = data.user.id;
    } else if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email: payload.email.trim(),
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

    const uploadedAvatarUrl = await uploadAvatar(admin, userId, payload.avatarDataUrl);
    const avatarUrl = uploadedAvatarUrl ?? payload.avatarUrl ?? null;

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
        status: normalizeStatus(payload.status) ? "Activo" : "Inactivo",
        goal_amount: 0,
        current_sales: 0,
        points: 0
      };

      const { data: executive, error: executiveError } = await admin
        .from("executives")
        .upsert(executivePayload)
        .select("id")
        .single();
      if (executiveError) throw executiveError;
      executiveId = executive.id;

      if (payload.teamId) {
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

    await admin.from("audit_logs").insert({
      table_name: "profiles",
      record_id: userId,
      action: shouldCreate ? "create_user" : "update_user",
      user_id: guard.userId,
      new_data: {
        email: payload.email,
        role: payload.role,
        executive_id: executiveId
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: userId,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        area: payload.area ?? "Ventas",
        status: payload.status ?? "Pendiente",
        avatarUrl,
        executiveId
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

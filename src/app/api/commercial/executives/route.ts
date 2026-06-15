import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExecutivePayload = {
  id: string;
  fullName: string;
  code?: string;
  teamId?: string;
  shift?: string;
  status?: string;
  goalAmount?: number;
  photoUrl?: string;
  photoDataUrl?: string;
  email?: string;
  role?: string;
  password?: string;
};

function normalizeRole(role = "Ejecutivo") {
  const normalized = role.toLowerCase();
  if (normalized.includes("super") || normalized.includes("admin")) return "admin_sistema";
  if (normalized.includes("gerencia")) return "gerencia";
  if (normalized.includes("jefe")) return "jefe_ventas";
  if (normalized.includes("lider")) return "lider_ventas";
  if (normalized.includes("marketing") || normalized.includes("soporte")) return "marketing_soporte";
  return "ejecutivo";
}

function roleLabel(role = "ejecutivo") {
  const normalized = normalizeRole(role);
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

function codePrefixForRole(role = "Ejecutivo") {
  const normalized = role.toLowerCase();
  if (normalized.includes("super")) return "SA";
  if (normalized.includes("admin")) return "AD";
  if (normalized.includes("gerencia")) return "GE";
  if (normalized.includes("jefe")) return "JV";
  if (normalized.includes("lider")) return "LV";
  if (normalized.includes("supervisor")) return "SU";
  if (normalized.includes("marketing")) return "MK";
  return "E";
}

async function generateExecutiveCode(admin: ReturnType<typeof createAdminClient>, role = "Ejecutivo", currentId = "") {
  const prefix = codePrefixForRole(role);
  const { data, error } = await admin.from("executives").select("id,code");
  if (error) throw error;
  const max = ((data as { id: string; code: string | null }[] | null) ?? []).reduce((highest, item) => {
    if (item.id === currentId) return highest;
    const match = String(item.code ?? "").match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function parseDataUrl(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return null;
  const [metadata, base64] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  return { bytes: Buffer.from(base64, "base64"), mimeType, extension };
}

function extractPhotoPath(photoUrl?: string | null) {
  if (!photoUrl) return null;
  if (!photoUrl.startsWith("http")) return photoUrl.startsWith("data:image/") ? null : photoUrl;
  try {
    const url = new URL(photoUrl);
    const markers = ["/storage/v1/object/public/executive-photos/", "/storage/v1/object/sign/executive-photos/"];
    const marker = markers.find((item) => url.pathname.includes(item));
    if (!marker) return null;
    return decodeURIComponent(url.pathname.split(marker)[1] ?? "").split("?")[0];
  } catch {
    return null;
  }
}

async function signedPhoto(admin: ReturnType<typeof createAdminClient>, path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const { data, error } = await admin.storage.from("executive-photos").createSignedUrl(path, 60 * 60 * 24);
  return error ? undefined : data.signedUrl;
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 100;
  for (let page = 1; page <= 200; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    const lastPage = Number((data as { lastPage?: number }).lastPage ?? 0);
    if (!data.users.length || (lastPage > 0 ? page >= lastPage : data.users.length < perPage)) return null;
  }
  return null;
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
    const payload = (await request.json()) as ExecutivePayload;
    if (!payload.id || !payload.fullName?.trim()) throw new Error("El ejecutivo necesita nombre.");

    const admin = createAdminClient();
    const generatedCode = payload.code?.trim() || await generateExecutiveCode(admin, payload.role, payload.id);
    let photoPath = extractPhotoPath(payload.photoUrl);
    const parsedPhoto = parseDataUrl(payload.photoDataUrl);
    if (parsedPhoto) {
      photoPath = `${payload.id}/profile-${Date.now()}.${parsedPhoto.extension}`;
      const { error } = await admin.storage.from("executive-photos").upload(photoPath, parsedPhoto.bytes, {
        contentType: parsedPhoto.mimeType,
        upsert: true
      });
      if (error) throw error;
    }

    let profileId: string | null = null;
    const normalizedEmail = payload.email?.trim().toLowerCase();
    const normalizedRole = normalizeRole(payload.role);

    if (normalizedEmail) {
      const { data: currentExecutive } = await admin.from("executives").select("profile_id").eq("id", payload.id).maybeSingle();
      let userId = currentExecutive?.profile_id ?? null;
      const existingByEmail = await findAuthUserByEmail(admin, normalizedEmail);
      if (existingByEmail) userId = existingByEmail.id;

      if (userId) {
        const { error } = await admin.auth.admin.updateUserById(userId, {
          email: normalizedEmail,
          password: payload.password?.trim() || undefined,
          email_confirm: true,
          user_metadata: { full_name: payload.fullName.trim(), role: normalizedRole, area: "Ventas" }
        });
        if (error) throw error;
      } else {
        const password = payload.password?.trim();
        if (!password) throw new Error("Para crear un acceso nuevo necesitas una contrasena temporal.");
        const { data, error } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: payload.fullName.trim(), role: normalizedRole, area: "Ventas" }
        });
        if (error) throw error;
        userId = data.user.id;
      }

      profileId = userId;
      await admin.from("profiles").upsert({
        id: userId,
        full_name: payload.fullName.trim(),
        role: normalizedRole,
        avatar_url: photoPath,
        active: payload.status !== "Baja" && payload.status !== "Inactivo"
      });
      await admin.from("executives").update({ profile_id: null }).eq("profile_id", userId).neq("id", payload.id);
    }

    const { data: existing } = await admin.from("executives").select("profile_id").eq("id", payload.id).maybeSingle();
    const { error: executiveError } = await admin.from("executives").upsert({
      id: payload.id,
      profile_id: profileId ?? existing?.profile_id ?? null,
      code: generatedCode,
      full_name: payload.fullName.trim(),
      photo_url: photoPath,
      shift: payload.shift ?? "Manana",
      status: payload.status === "Inactivo" || payload.status === "Baja" ? payload.status : "Activo",
      goal_amount: Number(payload.goalAmount ?? 0)
    });
    if (executiveError) throw executiveError;

    const today = new Date().toISOString().slice(0, 10);
    await admin.from("team_members").update({ active: false, end_date: today }).eq("executive_id", payload.id).eq("active", true);
    if (payload.teamId) {
      const { data: existingLink, error: findError } = await admin
        .from("team_members")
        .select("id")
        .eq("team_id", payload.teamId)
        .eq("executive_id", payload.id)
        .maybeSingle();
      if (findError) throw findError;

      if (existingLink?.id) {
        const { error: updateMemberError } = await admin
          .from("team_members")
          .update({ start_date: today, end_date: null, active: true })
          .eq("id", existingLink.id);
        if (updateMemberError) throw updateMemberError;
      } else {
        const { error: memberError } = await admin.from("team_members").insert({
          team_id: payload.teamId,
          executive_id: payload.id,
          start_date: today,
          end_date: null,
          active: true
        });
        if (memberError) throw memberError;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: payload.id,
        fullName: payload.fullName,
        code: generatedCode,
        teamId: payload.teamId ?? "",
        shift: payload.shift ?? "Manana",
        status: payload.status ?? "Activo",
        goalAmount: Number(payload.goalAmount ?? 0),
        photoUrl: await signedPhoto(admin, photoPath),
        email: normalizedEmail,
        role: roleLabel(payload.role)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el ejecutivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Ejecutivo no encontrado." }, { status: 400 });

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: executive, error: findError } = await admin.from("executives").select("profile_id,full_name").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!executive) return NextResponse.json({ ok: false, error: "El ejecutivo no existe." }, { status: 404 });

    const { error: executiveError } = await admin.from("executives").update({ status: "Baja" }).eq("id", id);
    if (executiveError) throw executiveError;

    const { error: memberError } = await admin.from("team_members").update({ active: false, end_date: today }).eq("executive_id", id).eq("active", true);
    if (memberError) throw memberError;

    if (executive.profile_id) {
      await admin.from("profiles").update({ active: false }).eq("id", executive.profile_id);
    }

    await admin.from("audit_logs").insert({
      table_name: "executives",
      record_id: id,
      action: "executive_deactivated",
      old_data: { status: "Activo", full_name: executive.full_name },
      new_data: { status: "Baja" },
      user_id: guard.userId
    }).then(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo dar de baja al ejecutivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackGreeting(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("ejecutivo")) {
    return "Buen dia. Revisa tus avances y prioriza los leads con mayor intencion de compra.";
  }
  if (normalized.includes("jefe") || normalized.includes("lider")) {
    return "Buen dia. Tienes el pulso del equipo listo para seguimiento y validacion.";
  }
  return "Buen dia. El panel comercial esta listo para revisar indicadores, equipo y trazabilidad.";
}

function greetingRoleKey(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("ejecutivo")) return "Ejecutivo";
  if (normalized.includes("lider")) return "Lider de ventas";
  if (normalized.includes("jefe")) return "Jefe de ventas";
  if (normalized.includes("gerencia")) return "Gerencia";
  if (normalized.includes("super")) return "Superadministrador";
  if (normalized.includes("admin")) return "Administrador";
  if (normalized.includes("marketing")) return "Marketing";
  if (normalized.includes("lectura")) return "Solo lectura";
  return role;
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

async function resolveAvatarUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("data:image/") || value.startsWith("/")) return value;
  const path = value.startsWith("http") ? extractExecutivePhotoPath(value) : value;
  if (!path) return value;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("executive-photos").createSignedUrl(path, 60 * 60 * 24);
    if (error) return value.startsWith("http") ? value : null;
    return data.signedUrl;
  } catch {
    return value.startsWith("http") ? value : null;
  }
}

export async function GET() {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,full_name,role,avatar_url,active")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(profile?.role ?? user.user_metadata?.role ?? "ejecutivo");
    const { data: greetings } = await supabase
      .from("role_greetings")
      .select("message")
      .eq("role", greetingRoleKey(role))
      .eq("active", true)
      .limit(12);

    const greetingRows = greetings ?? [];
    const greeting = greetingRows.length
      ? greetingRows[Math.floor(Math.random() * greetingRows.length)]?.message
      : fallbackGreeting(role);

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name ?? user.user_metadata?.full_name ?? user.email,
        role,
        avatarUrl: await resolveAvatarUrl(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null),
        greeting
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load session profile.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

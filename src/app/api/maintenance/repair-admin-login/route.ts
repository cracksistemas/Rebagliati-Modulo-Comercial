import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAdminSupabaseProjectRef } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_TEMP_PASSWORD = "lemu_123456";

type AuthUser = {
  id: string;
  email?: string;
};

function getToken(request: NextRequest, body?: Record<string, unknown>) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  const bodyToken = typeof body?.token === "string" ? body.token : "";
  return (
    bearer ||
    request.headers.get("x-repair-token") ||
    request.nextUrl.searchParams.get("token") ||
    request.nextUrl.searchParams.get("secret") ||
    bodyToken ||
    ""
  );
}

async function parseBody(request: NextRequest) {
  try {
    const text = await request.text();
    if (!text.trim()) return {};
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      return JSON.parse(text) as Record<string, unknown>;
    }
    return Object.fromEntries(new URLSearchParams(text).entries());
  } catch {
    return {};
  }
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 100;
  for (let page = 1; page <= 200; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = (data.users as AuthUser[]).find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    const lastPage = Number((data as { lastPage?: number }).lastPage ?? 0);
    if (!data.users.length || (lastPage > 0 ? page >= lastPage : data.users.length < perPage)) return null;
  }
  return null;
}

async function repairAdminLogin() {
  const admin = createAdminClient();
  const existing = await findAuthUserByEmail(admin, ADMIN_EMAIL);
  let userId = existing?.id;
  let action: "updated" | "created" = "updated";

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email: ADMIN_EMAIL,
      password: ADMIN_TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Crack",
        role: "admin_sistema",
        area: "Gerencia Comercial"
      }
    });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Crack",
        role: "admin_sistema",
        area: "Gerencia Comercial"
      }
    });
    if (error) throw error;
    userId = data.user.id;
    action = "created";
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: "Crack",
    role: "admin_sistema",
    active: true
  });
  if (profileError) throw profileError;

  await admin
    .from("audit_logs")
    .insert({
      table_name: "profiles",
      record_id: userId,
      action: "repair_admin_login",
      new_data: { email: ADMIN_EMAIL, action }
    })
    .then(() => undefined);

  return {
    action,
    email: ADMIN_EMAIL,
    role: "admin_sistema",
    projectRef: getAdminSupabaseProjectRef()
  };
}

async function handle(request: NextRequest) {
  const expectedToken = process.env.ADMIN_REPAIR_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_REPAIR_TOKEN no esta configurado en Vercel." },
      { status: 503 }
    );
  }

  const body = request.method === "POST" ? await parseBody(request) : {};
  const receivedToken = getToken(request, body);
  if (receivedToken !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Token de reparacion invalido." }, { status: 401 });
  }

  try {
    const data = await repairAdminLogin();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo reparar el acceso administrador.";
    return NextResponse.json({ ok: false, error: message, projectRef: getAdminSupabaseProjectRef() }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

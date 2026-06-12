import { NextRequest, NextResponse } from "next/server";
import { defaultDiscounts, defaultRolePermissions } from "@/lib/commercial/admin-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AuthorizedDiscount, CommercialNotification, RolePermissionConfig } from "@/lib/commercial/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSuperAdmin(role = "") {
  const normalized = role.toLowerCase();
  return normalized.includes("superadministrador") || normalized.includes("admin_sistema");
}

function getErrorMessage(error: unknown, fallback = "No se pudo procesar configuracion.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error) {
    const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
    return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code ? `Codigo: ${maybeError.code}` : ""].filter(Boolean).join(" ") || fallback;
  }
  return fallback;
}

async function requireSuperAdmin() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isSuperAdmin(String(profile?.role ?? ""))) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Solo Superadministrador puede editar configuracion." }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

async function loadSettingsFromSupabase() {
  const admin = createAdminClient();
  const [discountsResult, permissionsResult, notificationsResult] = await Promise.all([
    admin.from("authorized_discounts").select("id,label,amount,discount_type,active,requires_approval").order("created_at", { ascending: true }),
    admin.from("role_module_permissions").select("role,permission_id").order("role", { ascending: true }),
    admin.from("commercial_notifications").select("id,title,message,audience,notification_type,active,created_at,read_by,request_status,authorized_by,authorized_at,related_sale_id").order("created_at", { ascending: false })
  ]);

  if (discountsResult.error) throw discountsResult.error;
  if (permissionsResult.error) throw permissionsResult.error;

  const discounts: AuthorizedDiscount[] = ((discountsResult.data as any[]) ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    amount: Number(item.amount ?? 0),
    discountType: item.discount_type === "percent" ? "percent" : "amount",
    active: Boolean(item.active),
    requiresApproval: Boolean(item.requires_approval)
  }));

  const permissionsByRole = new Map<string, string[]>();
  ((permissionsResult.data as any[]) ?? []).forEach((item) => {
    const current = permissionsByRole.get(item.role) ?? [];
    current.push(item.permission_id);
    permissionsByRole.set(item.role, current);
  });

  const rolePermissions: RolePermissionConfig[] = Array.from(permissionsByRole.entries()).map(([role, permissions]) => ({
    role,
    permissions
  }));
  const notifications: CommercialNotification[] = notificationsResult.error ? [] : ((notificationsResult.data as any[]) ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    audience: item.audience,
    type: item.notification_type,
    active: Boolean(item.active),
    createdAt: item.created_at,
    createdBy: "Sistema",
    readBy: item.read_by ?? [],
    requestStatus: item.request_status ?? undefined,
    authorizedBy: item.authorized_by ?? undefined,
    authorizedAt: item.authorized_at ?? undefined,
    relatedSaleId: item.related_sale_id ?? undefined
  }));

  return {
    discounts: discounts.length ? discounts : defaultDiscounts,
    rolePermissions: rolePermissions.length ? rolePermissions : defaultRolePermissions,
    notifications,
    persisted: true
  };
}

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  try {
    const data = await loadSettingsFromSupabase();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      data: {
            discounts: defaultDiscounts,
            rolePermissions: defaultRolePermissions,
            notifications: [],
            persisted: false,
        warning: getErrorMessage(error, "Tablas de configuracion no disponibles.")
      }
    });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  try {
    const payload = (await request.json()) as {
      discounts?: AuthorizedDiscount[];
      rolePermissions?: RolePermissionConfig[];
      notifications?: CommercialNotification[];
    };
    const admin = createAdminClient();

    if (payload.discounts) {
      const discountsPayload = payload.discounts.map((discount) => ({
        id: discount.id,
        label: discount.label,
        amount: discount.amount,
        discount_type: discount.discountType ?? "amount",
        active: discount.active,
        requires_approval: Boolean(discount.requiresApproval)
      }));
      const { error } = await admin.from("authorized_discounts").upsert(discountsPayload);
      if (error) throw error;
    }

    if (payload.rolePermissions) {
      const roles = payload.rolePermissions.map((item) => item.role);
      const { error: deleteError } = await admin.from("role_module_permissions").delete().in("role", roles);
      if (deleteError) throw deleteError;

      const rows = payload.rolePermissions.flatMap((item) =>
        item.permissions.map((permissionId) => ({
          role: item.role,
          permission_id: permissionId
        }))
      );
      if (rows.length) {
        const { error } = await admin.from("role_module_permissions").insert(rows);
        if (error) throw error;
      }
    }

    if (payload.notifications) {
      const notificationRows = payload.notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        audience: notification.audience,
        notification_type: notification.type,
        active: notification.active,
        read_by: notification.readBy,
        request_status: notification.requestStatus ?? null,
        authorized_by: notification.authorizedBy ?? null,
        authorized_at: notification.authorizedAt ?? null,
        related_sale_id: notification.relatedSaleId ?? null
      }));
      if (notificationRows.length) {
        const { error } = await admin.from("commercial_notifications").upsert(notificationRows);
        if (error) throw error;
      }
    }

    await admin.from("audit_logs").insert({
      table_name: "commercial_settings",
      record_id: crypto.randomUUID(),
      action: "update_settings",
      user_id: guard.userId,
      new_data: {
        discounts: payload.discounts?.length ?? 0,
        role_permissions: payload.rolePermissions?.length ?? 0,
        notifications: payload.notifications?.length ?? 0
      }
    });

    const data = await loadSettingsFromSupabase();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

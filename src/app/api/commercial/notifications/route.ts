import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CommercialNotification } from "@/lib/commercial/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 }) };
  return { ok: true as const, userId: user.id };
}

function mapNotification(item: any): CommercialNotification {
  return {
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
  };
}

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("commercial_notifications")
      .select("id,title,message,audience,notification_type,active,created_at,read_by,request_status,authorized_by,authorized_at,related_sale_id")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { notifications: (data ?? []).map(mapNotification) } });
  } catch {
    return NextResponse.json({ ok: true, data: { notifications: [] } });
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const payload = (await request.json()) as { notification?: CommercialNotification };
    if (!payload.notification?.id) return NextResponse.json({ ok: false, error: "Notificacion invalida." }, { status: 400 });
    const admin = createAdminClient();
    const { error } = await admin
      .from("commercial_notifications")
      .update({
        read_by: payload.notification.readBy,
        request_status: payload.notification.requestStatus ?? null,
        authorized_by: payload.notification.authorizedBy ?? null,
        authorized_at: payload.notification.authorizedAt ?? null
      })
      .eq("id", payload.notification.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

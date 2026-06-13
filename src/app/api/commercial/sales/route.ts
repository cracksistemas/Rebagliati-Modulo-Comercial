import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProductType, Sale, SaleStatus } from "@/lib/commercial/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SalePayload = Sale & {
  action?: "update" | "annul";
  annulmentReason?: string;
};

const productCodes: Record<ProductType, string> = {
  Curso: "C",
  "Curso Modular": "CM",
  Diplomado: "D"
};

async function requireUser() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 }) };
  }
  return { ok: true as const, userId: user.id };
}

function normalizeStatus(value?: string): SaleStatus {
  if (value === "registrada" || value === "validada" || value === "observada" || value === "anulada") return value;
  return "pendiente_validacion";
}

function getErrorMessage(error: unknown, fallback = "No se pudo actualizar la venta.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error) {
    const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
    return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code ? `Codigo: ${maybeError.code}` : ""].filter(Boolean).join(" ") || fallback;
  }
  return fallback;
}

async function resolveProductTypeId(admin: ReturnType<typeof createAdminClient>, productType: ProductType) {
  const { data, error } = await admin
    .from("product_types")
    .select("id")
    .or(`name.eq.${productType},code.eq.${productCodes[productType]}`)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`No se encontro el tipo de producto ${productType}.`);
  return data.id as string;
}

async function resolveProductId(admin: ReturnType<typeof createAdminClient>, productName: string, productTypeId: string, price: number) {
  const name = productName.trim();
  if (!name) return null;

  const { data: existing, error: existingError } = await admin
    .from("products")
    .select("id")
    .eq("product_type_id", productTypeId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await admin
    .from("products")
    .insert({
      id: crypto.randomUUID(),
      product_type_id: productTypeId,
      name,
      modality: "No especificado",
      start_date: null,
      price,
      active: true
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function updateSaleRow(admin: ReturnType<typeof createAdminClient>, saleId: string, payload: Record<string, unknown>, netAmount: number) {
  const withNetAmount = { ...payload, net_amount: netAmount };
  const firstAttempt = await admin.from("sales").update(withNetAmount).eq("id", saleId).select("id").maybeSingle();
  if (!firstAttempt.error) return;

  const message = getErrorMessage(firstAttempt.error);
  if (!/generated|computed|net_amount/i.test(message)) throw firstAttempt.error;

  const retry = await admin.from("sales").update(payload).eq("id", saleId).select("id").maybeSingle();
  if (retry.error) throw retry.error;
}

async function auditSaleChange(admin: ReturnType<typeof createAdminClient>, userId: string, saleId: string, action: string, before: unknown, after: unknown) {
  await admin
    .from("audit_logs")
    .insert({
      table_name: "sales",
      record_id: saleId,
      action,
      old_data: before,
      new_data: after,
      user_id: userId
    })
    .then(() => undefined);
}

export async function PATCH(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const payload = (await request.json()) as SalePayload;
    if (!payload.id) return NextResponse.json({ ok: false, error: "Venta no encontrada." }, { status: 400 });

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin.from("sales").select("*").eq("id", payload.id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ ok: false, error: "La venta no existe en Supabase." }, { status: 404 });

    const status = payload.action === "annul" ? "anulada" : normalizeStatus(payload.validationStatus);
    if (status === "anulada" && !payload.annulmentReason?.trim() && !payload.notes?.trim()) {
      return NextResponse.json({ ok: false, error: "Toda anulacion requiere motivo." }, { status: 400 });
    }

    const productTypeId = await resolveProductTypeId(admin, payload.productType);
    const netAmount = Math.max(Number(payload.grossAmount ?? 0) - Number(payload.discountAmount ?? 0), 0);
    const productId = await resolveProductId(admin, payload.productName, productTypeId, Number(payload.grossAmount ?? 0));
    const notePrefix = payload.action === "annul" ? `Anulada: ${payload.annulmentReason?.trim() || payload.notes?.trim()}` : payload.notes?.trim();

    const saleUpdate = {
      sale_date: payload.saleDate,
      executive_id: payload.executiveId,
      team_id: payload.teamId || null,
      product_type_id: productTypeId,
      product_id: productId,
      quantity: Number(payload.quantity ?? 0),
      gross_amount: Number(payload.grossAmount ?? 0),
      discount_amount: Number(payload.discountAmount ?? 0),
      payment_method: payload.paymentMethod || "No especificado",
      lead_source: payload.leadSource || "Otro",
      validation_status: status,
      notes: notePrefix || null,
      validated_by: status === "validada" || status === "anulada" ? guard.userId : null,
      validated_at: status === "validada" || status === "anulada" ? new Date().toISOString() : null
    };

    await updateSaleRow(admin, payload.id, saleUpdate, netAmount);
    await auditSaleChange(admin, guard.userId, payload.id, payload.action === "annul" ? "sale_annulled" : "sale_updated", existing, {
      ...saleUpdate,
      net_amount: netAmount
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...payload,
        validationStatus: status,
        netAmount,
        notes: notePrefix || undefined
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

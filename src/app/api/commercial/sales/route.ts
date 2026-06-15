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

const productCodes: Record<string, string> = {
  Curso: "C",
  "Curso Modular": "CM",
  Diplomado: "D",
  Taller: "T",
  Seminario: "S",
  Certifícate: "CERT",
  "Asincrónico": "AS",
  Otro: "OTRO"
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
  if (
    value === "registrada" ||
    value === "validada" ||
    value === "observada" ||
    value === "rechazada" ||
    value === "anulada" ||
    value === "pago_parcial" ||
    value === "saldo_pendiente" ||
    value === "completada"
  ) return value;
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
  const typeName = String(productType || "Curso");
  const typeCode = productCodes[typeName] ?? (typeName.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "") || "OTRO");
  const { data, error } = await admin
    .from("product_types")
    .select("id")
    .or(`name.eq.${typeName},code.eq.${typeCode}`)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;

  const { data: inserted, error: insertError } = await admin
    .from("product_types")
    .insert({
      id: crypto.randomUUID(),
      code: typeCode,
      name: typeName,
      point_weight: typeName === "Diplomado" ? 4 : typeName === "Curso Modular" ? 2 : 1,
      active: true
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  if (!inserted?.id) throw new Error(`No se encontro el tipo de producto ${productType}.`);
  return inserted.id as string;
}

async function resolveProductId(admin: ReturnType<typeof createAdminClient>, productName: string, productTypeId: string, price: number, modality = "No especificado") {
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
      modality,
      start_date: null,
      price,
      active: true
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

function buildSaleNotes(payload: Sale, notePrefix?: string | null) {
  const extended = {
    participant: payload.participant ?? null,
    modality: payload.modality ?? null,
    attentionChannel: payload.attentionChannel ?? null,
    paymentPlanType: payload.paymentPlanType ?? null,
    billingType: payload.billingType ?? null,
    paymentConcept: payload.paymentConcept ?? null,
    paidAmount: payload.paidAmount ?? null,
    pendingAmount: payload.pendingAmount ?? null,
    paymentEntity: payload.paymentEntity ?? null,
    destinationHolder: payload.destinationHolder ?? null,
    operationNumber: payload.operationNumber ?? null,
    operationDate: payload.operationDate ?? null,
    operationTime: payload.operationTime ?? null,
    paymentStatus: payload.paymentStatus ?? null,
    paymentPlan: payload.paymentPlan ?? null,
    modalityDetails: payload.modalityDetails ?? null,
    attachments: payload.attachments?.map((item) => ({ id: item.id, attachmentType: item.attachmentType, fileName: item.fileName, description: item.description })) ?? []
  };
  return [notePrefix?.trim(), `__reba_sale_payload__${JSON.stringify(extended)}`].filter(Boolean).join("\n");
}

async function safeInsert(admin: ReturnType<typeof createAdminClient>, tableName: string, row: Record<string, unknown>) {
  const { error } = await admin.from(tableName).insert(row);
  if (error && !["42P01", "42703"].includes(String((error as { code?: string }).code ?? ""))) {
    console.warn(`No se pudo insertar en ${tableName}`, error.message);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const payload = (await request.json()) as SalePayload;
    if (!payload.executiveId || !payload.productName?.trim()) {
      return NextResponse.json({ ok: false, error: "Completa ejecutivo y programa antes de registrar." }, { status: 400 });
    }

    const admin = createAdminClient();
    const saleId = payload.id || crypto.randomUUID();
    const status = "pendiente_validacion" as SaleStatus;
    const productTypeId = await resolveProductTypeId(admin, payload.productType);
    const netAmount = Math.max(Number(payload.netAmount ?? 0) || Number(payload.grossAmount ?? 0) - Number(payload.discountAmount ?? 0), 0);
    const productId = await resolveProductId(admin, payload.productName, productTypeId, Number(payload.grossAmount ?? 0), payload.modality);
    const notes = buildSaleNotes(payload, payload.notes);

    const { error } = await admin.from("sales").insert({
      id: saleId,
      sale_date: payload.saleDate,
      executive_id: payload.executiveId,
      team_id: payload.teamId || null,
      product_type_id: productTypeId,
      product_id: productId,
      quantity: Number(payload.quantity ?? 1),
      gross_amount: Number(payload.grossAmount ?? netAmount),
      discount_amount: Number(payload.discountAmount ?? 0),
      net_amount: netAmount,
      payment_method: payload.paymentMethod || "No especificado",
      lead_source: payload.leadSource || "Otro",
      validation_status: status,
      notes,
      created_by: guard.userId
    });
    if (error) throw error;

    if (payload.participant?.fullName) {
      await safeInsert(admin, "sale_participants", {
        sale_id: saleId,
        full_name: payload.participant.fullName,
        document_type: payload.participant.documentType,
        document_number: payload.participant.documentNumber,
        email: payload.participant.email,
        phone: payload.participant.phone,
        country: payload.participant.country,
        department: payload.participant.department,
        province: payload.participant.province,
        district: payload.participant.district,
        workplace: payload.participant.workplace,
        academic_degree: payload.participant.academicDegree,
        profession: payload.participant.profession,
        license_number: payload.participant.licenseNumber
      });
    }

    await safeInsert(admin, "sale_payments", {
      sale_id: saleId,
      payment_date: payload.operationDate ?? payload.saleDate,
      payment_time: payload.operationTime ?? null,
      payment_concept: payload.paymentConcept ?? "Pago total",
      payment_method: payload.paymentMethod,
      payment_entity: payload.paymentEntity ?? null,
      destination_holder: payload.destinationHolder ?? null,
      operation_number: payload.operationNumber ?? null,
      expected_amount: netAmount,
      paid_amount: Number(payload.paidAmount ?? 0),
      payment_status: payload.paymentStatus ?? "Pendiente de validación"
    });

    await safeInsert(admin, "sale_payment_plan", {
      sale_id: saleId,
      plan_type: payload.paymentPlanType ?? "Pago completo",
      billing_type: payload.billingType ?? "Pago único",
      enrollment_amount: payload.paymentPlan?.enrollmentAmount ?? null,
      monthly_amount: payload.paymentPlan?.monthlyAmount ?? null,
      monthly_count: payload.paymentPlan?.monthlyCount ?? null,
      certificate_amount: payload.paymentPlan?.certificateAmount ?? null,
      total_program_amount: netAmount,
      paid_amount: Number(payload.paidAmount ?? 0),
      pending_amount: Number(payload.pendingAmount ?? 0),
      next_due_date: payload.paymentPlan?.nextDueDate ?? null
    });

    for (const attachment of payload.attachments ?? []) {
      await safeInsert(admin, "sale_attachments", {
        sale_id: saleId,
        attachment_type: attachment.attachmentType,
        file_path: attachment.fileName,
        file_name: attachment.fileName,
        description: attachment.description ?? null,
        uploaded_by: guard.userId
      });
    }

    await auditSaleChange(admin, guard.userId, saleId, "sale_created", null, { ...payload, id: saleId, validationStatus: status });

    return NextResponse.json({
      ok: true,
      data: { ...payload, id: saleId, validationStatus: status, netAmount, notes }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error, "No se pudo registrar la venta.") }, { status: 500 });
  }
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
    const productId = await resolveProductId(admin, payload.productName, productTypeId, Number(payload.grossAmount ?? 0), payload.modality);
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
      notes: buildSaleNotes(payload, notePrefix) || null,
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

import { NextRequest, NextResponse } from "next/server";
import { defaultDiscounts, defaultLeadSources, defaultPaymentMethods, defaultPrograms } from "@/lib/commercial/admin-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProductType, SalesProgram } from "@/lib/commercial/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getErrorMessage(error: unknown, fallback = "No se pudo cargar opciones comerciales.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error) {
    const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
    return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code ? `Codigo: ${maybeError.code}` : ""].filter(Boolean).join(" ") || fallback;
  }
  return fallback;
}

async function loadOptions() {
  const admin = createAdminClient();
  const programSelect =
    "id,name,product_type,active,created_at,code,base_product_name,edition_name,area,status,modality,start_date,end_date,duration_value,duration_unit,class_days,schedule_summary,academic_hours,credits,certification_type,certifying_institution,allied_institutions,target_audience,allowed_profiles,short_description,commercial_description,academic_owner,commercial_owner,price_from,enrollment_amount,monthly_amount,monthly_count,single_payment_amount,certificate_amount,promo_name,promo_valid_until,form_url,whatsapp_group_url,zoom_url,campus_url,brochure_url,image_url,video_url,template_text,template_variants,sessions,price_tiers,change_log,updated_at";
  const [programsResult, discountsResult, optionsResult] = await Promise.all([
    admin.from("sales_programs").select(programSelect).order("created_at", { ascending: false }),
    admin.from("authorized_discounts").select("id,label,amount,discount_type,active,requires_approval").eq("active", true).order("created_at", { ascending: true }),
    admin.from("commercial_options").select("id,option_type,label,active,created_at").eq("active", true).order("created_at", { ascending: true })
  ]);

  let programRows = programsResult.data as any[] | null;
  if (programsResult.error) {
    const fallback = await admin.from("sales_programs").select("id,name,product_type,active,created_at").order("created_at", { ascending: false });
    if (fallback.error) throw fallback.error;
    programRows = fallback.data as any[];
  }
  if (discountsResult.error) throw discountsResult.error;

  const programs: SalesProgram[] = (programRows ?? []).map(mapProgramRow);

  const discounts = ((discountsResult.data as any[]) ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    amount: Number(item.amount ?? 0),
    discountType: item.discount_type === "percent" ? "percent" : "amount",
    active: Boolean(item.active),
    requiresApproval: Boolean(item.requires_approval)
  }));
  const rawOptions = optionsResult.error ? [] : (optionsResult.data as any[]) ?? [];
  const options = rawOptions.map((item) => ({
    id: item.id,
    optionType: item.option_type,
    label: item.label,
    active: Boolean(item.active),
    createdAt: item.created_at
  }));
  const leadSources = options.filter((item) => item.optionType === "lead_source").map(({ optionType, ...item }) => item);
  const paymentMethods = options.filter((item) => item.optionType === "payment_method").map(({ optionType, ...item }) => item);

  return {
    programs: programs.length ? programs : defaultPrograms,
    discounts: discounts.length ? discounts : defaultDiscounts,
    leadSources: leadSources.length ? leadSources : defaultLeadSources,
    paymentMethods: paymentMethods.length ? paymentMethods : defaultPaymentMethods,
    persisted: true
  };
}

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const data = await loadOptions();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      data: {
        programs: defaultPrograms,
        discounts: defaultDiscounts,
        leadSources: defaultLeadSources,
        paymentMethods: defaultPaymentMethods,
        persisted: false,
        warning: getErrorMessage(error)
      }
    });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const payload = (await request.json()) as { kind?: "program" | "lead" | "payment"; name?: string; productType?: ProductType; program?: Partial<SalesProgram> };
    const name = payload.name?.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Nombre obligatorio." }, { status: 400 });
    }

    const admin = createAdminClient();
    if (payload.kind && payload.kind !== "program") {
      const optionType = payload.kind === "lead" ? "lead_source" : "payment_method";
      const idPrefix = payload.kind === "lead" ? "lead" : "pay";
      const { data: existing, error: existingError } = await admin
        .from("commercial_options")
        .select("id")
        .eq("option_type", optionType)
        .ilike("label", name)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing?.id) {
        const { error } = await admin.from("commercial_options").insert({
          id: `${idPrefix}-${crypto.randomUUID()}`,
          option_type: optionType,
          label: name,
          active: true,
          created_by: guard.userId
        });
        if (error) throw error;
      }
      const data = await loadOptions();
      return NextResponse.json({ ok: true, data });
    }
    if (!payload.productType) {
      return NextResponse.json({ ok: false, error: "Tipo de producto obligatorio." }, { status: 400 });
    }
    let existing: { id: string } | null = null;
    let existingError: unknown = null;
    if (payload.program?.id) {
      const byId = await admin.from("sales_programs").select("id").eq("id", payload.program.id).maybeSingle();
      existing = byId.data as { id: string } | null;
      existingError = byId.error;
    }
    if (!existing && !existingError) {
      const byName = await admin
        .from("sales_programs")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      existing = byName.data as { id: string } | null;
      existingError = byName.error;
    }
    if (existingError) throw existingError;

    if (!existing?.id) {
      const insertRow = buildProgramRow({
        id: payload.program?.id ?? `program-${crypto.randomUUID()}`,
        name,
        product_type: payload.productType,
        active: true,
        created_by: guard.userId
      }, payload.program, guard.userId);
      const { error } = await admin.from("sales_programs").insert(insertRow);
      if (error) {
        const fallback = await admin.from("sales_programs").insert({
          id: insertRow.id,
          name,
          product_type: payload.productType,
          active: insertRow.active,
          created_by: guard.userId
        });
        if (fallback.error) throw fallback.error;
      }
    } else if (payload.program) {
      const updateRow = buildProgramRow({}, { ...payload.program, id: existing.id, name, productType: payload.productType }, guard.userId, true);
      const { error } = await admin.from("sales_programs").update(updateRow).eq("id", existing.id);
      if (error) {
        const fallback = await admin.from("sales_programs").update({
          name,
          product_type: payload.productType,
          active: updateRow.active
        }).eq("id", existing.id);
        if (fallback.error) throw fallback.error;
      }
    }

    const data = await loadOptions();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

function mapProgramRow(item: any): SalesProgram {
  return {
    id: item.id,
    name: item.name,
    productType: item.product_type,
    active: Boolean(item.active),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    code: item.code,
    baseProductName: item.base_product_name,
    editionName: item.edition_name,
    area: item.area,
    status: item.status,
    modality: item.modality,
    startDate: item.start_date,
    endDate: item.end_date,
    durationValue: item.duration_value === null || item.duration_value === undefined ? undefined : Number(item.duration_value),
    durationUnit: item.duration_unit,
    classDays: item.class_days,
    scheduleSummary: item.schedule_summary,
    academicHours: item.academic_hours === null || item.academic_hours === undefined ? undefined : Number(item.academic_hours),
    credits: item.credits === null || item.credits === undefined ? undefined : Number(item.credits),
    certificationType: item.certification_type,
    certifyingInstitution: item.certifying_institution,
    alliedInstitutions: item.allied_institutions,
    targetAudience: item.target_audience,
    allowedProfiles: Array.isArray(item.allowed_profiles) ? item.allowed_profiles : [],
    shortDescription: item.short_description,
    commercialDescription: item.description_commercial ?? item.commercial_description,
    academicOwner: item.academic_owner,
    commercialOwner: item.commercial_owner,
    priceFrom: numeric(item.price_from),
    enrollmentAmount: numeric(item.enrollment_amount),
    monthlyAmount: numeric(item.monthly_amount),
    monthlyCount: numeric(item.monthly_count),
    singlePaymentAmount: numeric(item.single_payment_amount),
    certificateAmount: numeric(item.certificate_amount),
    promoName: item.promo_name,
    promoValidUntil: item.promo_valid_until,
    formUrl: item.form_url,
    whatsappGroupUrl: item.whatsapp_group_url,
    zoomUrl: item.zoom_url,
    campusUrl: item.campus_url,
    brochureUrl: item.brochure_url,
    imageUrl: item.image_url,
    videoUrl: item.video_url,
    templateText: item.template_text,
    templateVariants: item.template_variants ?? undefined,
    sessions: Array.isArray(item.sessions) ? item.sessions : [],
    priceTiers: Array.isArray(item.price_tiers) ? item.price_tiers : [],
    changeLog: Array.isArray(item.change_log) ? item.change_log : []
  };
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  return Number(value);
}

function buildProgramRow(base: Record<string, any>, program: Partial<SalesProgram> = {}, userId: string, update = false) {
  const status = program.status ?? base.status ?? (program.active ?? base.active ? "Activo para ventas" : "Borrador");
  const row: Record<string, any> = {
    ...base,
    name: program.name ?? base.name,
    product_type: program.productType ?? base.product_type,
    active: status === "Activo para ventas" || Boolean(program.active ?? base.active),
    code: program.code || null,
    base_product_name: program.baseProductName || program.name || null,
    edition_name: program.editionName || null,
    area: program.area || null,
    status,
    modality: program.modality || null,
    start_date: program.startDate || null,
    end_date: program.endDate || null,
    duration_value: program.durationValue ?? null,
    duration_unit: program.durationUnit || null,
    class_days: program.classDays || null,
    schedule_summary: program.scheduleSummary || null,
    academic_hours: program.academicHours ?? null,
    credits: program.credits ?? null,
    certification_type: program.certificationType || null,
    certifying_institution: program.certifyingInstitution || null,
    allied_institutions: program.alliedInstitutions || null,
    target_audience: program.targetAudience || null,
    allowed_profiles: program.allowedProfiles ?? [],
    short_description: program.shortDescription || null,
    commercial_description: program.commercialDescription || null,
    academic_owner: program.academicOwner || null,
    commercial_owner: program.commercialOwner || null,
    price_from: program.priceFrom ?? null,
    enrollment_amount: program.enrollmentAmount ?? null,
    monthly_amount: program.monthlyAmount ?? null,
    monthly_count: program.monthlyCount ?? null,
    single_payment_amount: program.singlePaymentAmount ?? null,
    certificate_amount: program.certificateAmount ?? null,
    promo_name: program.promoName || null,
    promo_valid_until: program.promoValidUntil || null,
    form_url: program.formUrl || null,
    whatsapp_group_url: program.whatsappGroupUrl || null,
    zoom_url: program.zoomUrl || null,
    campus_url: program.campusUrl || null,
    brochure_url: program.brochureUrl || null,
    image_url: program.imageUrl || null,
    video_url: program.videoUrl || null,
    template_text: program.templateText || null,
    template_variants: program.templateVariants ?? {},
    sessions: program.sessions ?? [],
    price_tiers: program.priceTiers ?? [],
    change_log: program.changeLog ?? [],
    updated_by: userId,
    updated_at: new Date().toISOString()
  };
  if (!update) row.created_by = userId;
  Object.keys(row).forEach((key) => row[key] === undefined && delete row[key]);
  return row;
}

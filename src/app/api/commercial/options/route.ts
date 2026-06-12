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
  const [programsResult, discountsResult, optionsResult] = await Promise.all([
    admin.from("sales_programs").select("id,name,product_type,active,created_at").order("created_at", { ascending: false }),
    admin.from("authorized_discounts").select("id,label,amount,discount_type,active,requires_approval").eq("active", true).order("created_at", { ascending: true }),
    admin.from("commercial_options").select("id,option_type,label,active,created_at").eq("active", true).order("created_at", { ascending: true })
  ]);

  if (programsResult.error) throw programsResult.error;
  if (discountsResult.error) throw discountsResult.error;

  const programs: SalesProgram[] = ((programsResult.data as any[]) ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    productType: item.product_type,
    active: Boolean(item.active),
    createdAt: item.created_at
  }));

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
    const payload = (await request.json()) as { kind?: "program" | "lead" | "payment"; name?: string; productType?: ProductType };
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
    const { data: existing, error: existingError } = await admin
      .from("sales_programs")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!existing?.id) {
      const { error } = await admin.from("sales_programs").insert({
        id: `program-${crypto.randomUUID()}`,
        name,
        product_type: payload.productType,
        active: true,
        created_by: guard.userId
      });
      if (error) throw error;
    }

    const data = await loadOptions();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

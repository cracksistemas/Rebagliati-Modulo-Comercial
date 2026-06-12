import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function productTypeName(code?: string) {
  if (code === "CM") return "Curso Modular";
  if (code === "D") return "Diplomado";
  return "Curso";
}

function normalizeStatus(status?: string) {
  const value = String(status ?? "Activo").toLowerCase();
  if (value.includes("baja")) return "Baja";
  if (value.includes("inactivo")) return "Inactivo";
  return "Activo";
}

async function signedExecutivePhoto(admin: ReturnType<typeof createAdminClient>, value?: string | null) {
  if (!value) return undefined;
  if (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:image/")) return value;
  const { data, error } = await admin.storage.from("executive-photos").createSignedUrl(value, 60 * 60 * 24);
  return error ? undefined : data.signedUrl;
}

export async function GET() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const [teamsResult, executivesResult, membershipsResult, salesResult] = await Promise.all([
      admin.from("teams").select("id,name,color,leader_id,goal_amount,active").order("created_at", { ascending: true }),
      admin.from("executives").select("id,code,full_name,photo_url,shift,status,goal_amount,current_sales,points,previous_rank").order("created_at", { ascending: true }),
      admin.from("team_members").select("team_id,executive_id,active").eq("active", true),
      admin
        .from("sales")
        .select("id,sale_date,executive_id,team_id,quantity,gross_amount,discount_amount,net_amount,payment_method,lead_source,validation_status,notes,product_types(code,name,point_weight),products(name)")
        .order("sale_date", { ascending: false })
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (executivesResult.error) throw executivesResult.error;
    if (membershipsResult.error) throw membershipsResult.error;
    if (salesResult.error) throw salesResult.error;

    const memberships = (membershipsResult.data as any[]) ?? [];
    const teamByExecutive = new Map(memberships.map((item) => [item.executive_id, item.team_id]));
    const sales = ((salesResult.data as any[]) ?? []).map((sale) => {
      const typeCode = sale.product_types?.code ?? "C";
      return {
        id: sale.id,
        saleDate: sale.sale_date,
        executiveId: sale.executive_id,
        teamId: sale.team_id,
        productType: productTypeName(typeCode),
        productName: sale.products?.name ?? sale.notes ?? "Carga historica ranking Junio 2026",
        quantity: Number(sale.quantity ?? 0),
        grossAmount: Number(sale.gross_amount ?? 0),
        discountAmount: Number(sale.discount_amount ?? 0),
        netAmount: Number(sale.net_amount ?? 0),
        paymentMethod: sale.payment_method ?? "No especificado",
        leadSource: sale.lead_source ?? "Importacion",
        validationStatus: sale.validation_status ?? "pendiente_validacion",
        notes: sale.notes ?? undefined,
        pointWeight: Number(sale.product_types?.point_weight ?? 1)
      };
    });

    const validSales = sales.filter((sale) => sale.validationStatus === "validada");
    const executives = await Promise.all(((executivesResult.data as any[]) ?? []).map(async (executive) => {
      const ownSales = validSales.filter((sale) => sale.executiveId === executive.id);
      return {
        id: executive.id,
        fullName: executive.full_name,
        code: executive.code ?? "",
        teamId: teamByExecutive.get(executive.id) ?? "",
        shift: executive.shift ?? "Manana",
        status: normalizeStatus(executive.status),
        photoUrl: await signedExecutivePhoto(admin, executive.photo_url),
        goalAmount: Number(executive.goal_amount ?? 0),
        currentSales: ownSales.reduce((sum, sale) => sum + sale.netAmount, 0),
        points: ownSales.reduce((sum, sale) => sum + sale.quantity * sale.pointWeight, 0),
        previousRank: Number(executive.previous_rank ?? 99)
      };
    }));

    const teams = ((teamsResult.data as any[]) ?? []).map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color ?? "#00A7EB",
      leaderId: team.leader_id ?? undefined,
      goalAmount: Number(team.goal_amount ?? 0),
      active: Boolean(team.active)
    }));

    return NextResponse.json({
      ok: true,
      data: {
        teams,
        executives,
        sales: sales.map(({ pointWeight, ...sale }) => sale)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar snapshot comercial.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

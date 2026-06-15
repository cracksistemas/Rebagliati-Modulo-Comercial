import { createClient } from "@/lib/supabase/client";
import type { Executive, MonthlyGoal, Product, ProductType, Sale, Team } from "@/types/sales";

const CURRENT_MONTH = "2026-06-01";

interface DbExecutive {
  id: string;
  code: string | null;
  full_name: string;
  photo_url: string | null;
  shift: string | null;
  status: string | null;
}

interface DbTeamMember {
  executive_id: string;
  team_id: string;
  active: boolean;
}

interface DbTeam {
  id: string;
  name: string;
  color: string;
  leader_id: string | null;
  active: boolean;
}

interface DbGoal {
  id?: string;
  month?: string;
  scope?: "company" | "team" | "executive";
  team_id: string | null;
  executive_id?: string | null;
  goal_amount: number;
  goal_points?: number;
}

interface DbProductType {
  id: string;
  code: "C" | "CM" | "D";
  name: "Curso" | "Curso Modular" | "Diplomado";
  point_weight: number;
  active: boolean;
}

interface DbProduct {
  id: string;
  product_type_id: string;
  name: string;
  modality: string | null;
  price: number;
  active: boolean;
}

interface DbSale {
  id: string;
  sale_date: string;
  executive_id: string;
  team_id: string;
  product_type_id: string;
  product_id: string | null;
  quantity: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  payment_method: string;
  lead_source: "Meta Ads" | "WhatsApp" | "Base" | "Referido" | "Organico" | "Otro";
  validation_status: "registrada" | "pendiente_validacion" | "validada" | "observada" | "anulada";
  notes: string | null;
}

function getSupabase() {
  return createClient() as any;
}

export async function getCurrentUserId() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id as string | undefined;
}

export async function ensureFirstAdmin(fullName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("bootstrap_first_admin", { full_name: fullName });
  if (error) throw error;
  return data;
}

export async function ensureAdminTestProfile(fullName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("ensure_admin_test_profile", { full_name: fullName });
  if (error) throw error;
  return data;
}

export async function loadCommercialTeams(): Promise<Team[]> {
  const supabase = getSupabase();
  const [{ data: teamRows, error: teamsError }, { data: goalRows, error: goalsError }] = await Promise.all([
    supabase.from("teams").select("id,name,color,leader_id,active").order("created_at", { ascending: true }),
    supabase.from("monthly_goals").select("team_id,goal_amount").eq("scope", "team").eq("month", CURRENT_MONTH)
  ]);

  if (teamsError) throw teamsError;
  if (goalsError) throw goalsError;

  const goalsByTeam = new Map((goalRows as DbGoal[] | null)?.map((goal) => [goal.team_id, Number(goal.goal_amount)]) ?? []);

  return ((teamRows as DbTeam[] | null) ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    leaderId: team.leader_id ?? "",
    active: team.active,
    monthlyGoal: goalsByTeam.get(team.id) ?? 0
  }));
}

export async function loadCommercialGoals(): Promise<MonthlyGoal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("monthly_goals")
    .select("id,month,scope,team_id,executive_id,goal_amount,goal_points")
    .order("month", { ascending: false });

  if (error) throw error;

  return ((data as DbGoal[] | null) ?? []).map((goal) => ({
    id: goal.id ?? crypto.randomUUID(),
    month: goal.month ?? CURRENT_MONTH,
    scope: goal.scope ?? "team",
    teamId: goal.team_id ?? undefined,
    executiveId: goal.executive_id ?? undefined,
    goalAmount: Number(goal.goal_amount),
    goalPoints: Number(goal.goal_points ?? 0)
  }));
}

export async function loadCommercialExecutives(): Promise<Executive[]> {
  const supabase = getSupabase();
  const [{ data: executiveRows, error: executivesError }, { data: memberRows, error: membersError }] = await Promise.all([
    supabase.from("executives").select("id,code,full_name,photo_url,shift,status").order("created_at", { ascending: true }),
    supabase.from("team_members").select("executive_id,team_id,active").eq("active", true)
  ]);

  if (executivesError) throw executivesError;
  if (membersError) throw membersError;

  const teamByExecutive = new Map(
    ((memberRows as DbTeamMember[] | null) ?? []).map((member) => [member.executive_id, member.team_id])
  );

  return Promise.all(
    ((executiveRows as DbExecutive[] | null) ?? []).map(async (executive) => ({
      id: executive.id,
      code: executive.code ?? "",
      fullName: executive.full_name,
      photoUrl: await resolveExecutivePhotoUrl(executive.photo_url),
      shift: normalizeShift(executive.shift),
      status: executive.status === "inactivo" || executive.status === "Inactivo" ? "Inactivo" : "Activo",
      teamId: teamByExecutive.get(executive.id) ?? "",
      previousRank: 99
    }))
  );
}

export async function saveCommercialTeam(team: Team) {
  const supabase = getSupabase();
  const { error: teamError } = await supabase.from("teams").upsert({
    id: team.id,
    name: team.name,
    color: team.color,
    leader_id: team.leaderId || null,
    active: team.active
  });

  if (teamError) throw teamError;

  const { data: existingGoal, error: goalFindError } = await supabase
    .from("monthly_goals")
    .select("id")
    .eq("month", CURRENT_MONTH)
    .eq("scope", "team")
    .eq("team_id", team.id)
    .maybeSingle();

  if (goalFindError) throw goalFindError;

  if (existingGoal?.id) {
    const { error } = await supabase
      .from("monthly_goals")
      .update({ goal_amount: team.monthlyGoal })
      .eq("id", existingGoal.id);
    if (error) throw error;
  } else {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from("monthly_goals").insert({
      month: CURRENT_MONTH,
      scope: "team",
      team_id: team.id,
      goal_amount: team.monthlyGoal,
      goal_points: 0,
      created_by: userId ?? null
    });
    if (error) throw error;
  }
}

export async function saveCommercialGoal(goal: MonthlyGoal) {
  const supabase = getSupabase();
  const payload = {
    id: goal.id,
    month: goal.month,
    scope: goal.scope,
    team_id: goal.scope === "team" ? goal.teamId ?? null : null,
    executive_id: goal.scope === "executive" ? goal.executiveId ?? null : null,
    goal_amount: goal.goalAmount,
    goal_points: goal.goalPoints,
    created_by: await getCurrentUserId() ?? null
  };

  const { error } = await supabase.from("monthly_goals").upsert(payload);
  if (error) throw error;
}

export async function saveCommercialGoalVersion(goalId: string, previousAmount: number, newAmount: number, changeReason: string) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("commercial_goal_versions").insert({
    goal_id: goalId,
    previous_target_amount: previousAmount,
    new_target_amount: newAmount,
    change_reason: changeReason,
    changed_by: userId ?? null
  });
  if (error) throw error;
}

export async function loadCommercialProductTypes(): Promise<ProductType[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("product_types")
    .select("id,code,name,point_weight,active")
    .eq("active", true)
    .order("code", { ascending: true });

  if (error) throw error;

  return ((data as DbProductType[] | null) ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    pointWeight: Number(item.point_weight)
  }));
}

export async function loadCommercialProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("id,product_type_id,name,modality,price,active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data as DbProduct[] | null) ?? []).map((item) => ({
    id: item.id,
    productTypeId: item.product_type_id,
    name: item.name,
    modality: item.modality ?? "",
    price: Number(item.price),
    active: item.active
  }));
}

export async function loadCommercialSales(): Promise<Sale[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sales")
    .select("id,sale_date,executive_id,team_id,product_type_id,product_id,quantity,gross_amount,discount_amount,net_amount,payment_method,lead_source,validation_status,notes")
    .order("sale_date", { ascending: false });

  if (error) throw error;

  return ((data as DbSale[] | null) ?? []).map((sale) => ({
    id: sale.id,
    saleDate: sale.sale_date,
    executiveId: sale.executive_id,
    teamId: sale.team_id,
    productTypeId: sale.product_type_id,
    productId: sale.product_id ?? "",
    quantity: Number(sale.quantity),
    grossAmount: Number(sale.gross_amount),
    discountAmount: Number(sale.discount_amount),
    netAmount: Number(sale.net_amount),
    paymentMethod: sale.payment_method,
    leadSource: sale.lead_source,
    validationStatus: sale.validation_status,
    notes: sale.notes ?? undefined
  }));
}

export async function saveCommercialSale(sale: Sale) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Debes iniciar sesion para registrar ventas en Supabase.");

  const { error } = await supabase.from("sales").upsert({
    id: sale.id,
    sale_date: sale.saleDate,
    executive_id: sale.executiveId,
    team_id: sale.teamId,
    product_type_id: sale.productTypeId,
    product_id: sale.productId || null,
    quantity: sale.quantity,
    gross_amount: sale.grossAmount,
    discount_amount: sale.discountAmount,
    payment_method: sale.paymentMethod,
    lead_source: sale.leadSource,
    validation_status: sale.validationStatus,
    notes: sale.notes ?? null,
    created_by: userId
  });

  if (error) throw error;
}

export async function updateCommercialSale(sale: Sale) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Debes iniciar sesion para actualizar ventas en Supabase.");

  const { error } = await supabase
    .from("sales")
    .update({
      sale_date: sale.saleDate,
      executive_id: sale.executiveId,
      team_id: sale.teamId,
      product_type_id: sale.productTypeId,
      product_id: sale.productId || null,
      quantity: sale.quantity,
      gross_amount: sale.grossAmount,
      discount_amount: sale.discountAmount,
      payment_method: sale.paymentMethod,
      lead_source: sale.leadSource,
      validation_status: sale.validationStatus,
      notes: sale.notes ?? null,
      validated_by: sale.validationStatus === "validada" ? userId : null,
      validated_at: sale.validationStatus === "validada" ? new Date().toISOString() : null
    })
    .eq("id", sale.id);

  if (error) throw error;
}

export async function annulCommercialSale(saleId: string, reason: string) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Debes iniciar sesion para anular ventas en Supabase.");
  if (!reason.trim()) throw new Error("Toda anulacion requiere motivo.");

  const { error } = await supabase
    .from("sales")
    .update({
      validation_status: "anulada",
      annulment_reason: reason.trim(),
      validated_by: userId,
      validated_at: new Date().toISOString()
    })
    .eq("id", saleId);

  if (error) throw error;
}

export async function saveCommercialExecutive(executive: Executive) {
  const supabase = getSupabase();
  const status = executive.status === "Inactivo" ? "inactivo" : "activo";
  const photoPath = await getPersistableExecutivePhotoPath(executive.id, executive.photoUrl);

  const { error: executiveError } = await supabase.from("executives").upsert({
    id: executive.id,
    code: executive.code,
    full_name: executive.fullName,
    photo_url: photoPath,
    shift: executive.shift,
    status
  });

  if (executiveError) throw executiveError;

  await assignExecutiveTeam(executive.id, executive.teamId);

  return photoPath ? resolveExecutivePhotoUrl(photoPath) : "";
}

export async function updateCommercialExecutivePhoto(executiveId: string, photoUrl: string) {
  const supabase = getSupabase();
  const photoPath = await getPersistableExecutivePhotoPath(executiveId, photoUrl);
  const { error } = await supabase.from("executives").update({ photo_url: photoPath }).eq("id", executiveId);
  if (error) throw error;
  return resolveExecutivePhotoUrl(photoPath);
}

export async function deactivateCommercialExecutive(executiveId: string) {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { error: executiveError } = await supabase
    .from("executives")
    .update({ status: "inactivo" })
    .eq("id", executiveId);
  if (executiveError) throw executiveError;

  const { error: memberError } = await supabase
    .from("team_members")
    .update({ active: false, end_date: today })
    .eq("executive_id", executiveId)
    .eq("active", true);
  if (memberError) throw memberError;
}

export async function deleteCommercialExecutive(executiveId: string) {
  const supabase = getSupabase();
  const { count, error: salesError } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("executive_id", executiveId);

  if (salesError) throw salesError;
  if ((count ?? 0) > 0) {
    throw new Error("EXECUTIVE_HAS_SALES");
  }

  const { error: membersError } = await supabase.from("team_members").delete().eq("executive_id", executiveId);
  if (membersError) throw membersError;

  const { error: executiveError } = await supabase.from("executives").delete().eq("id", executiveId);
  if (executiveError) throw executiveError;
}

async function assignExecutiveTeam(executiveId: string, teamId: string) {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { error: rpcError } = await supabase.rpc("assign_executive_team", {
    p_executive_id: executiveId,
    p_team_id: teamId || null
  });

  if (!rpcError) return;
  console.warn(rpcError);

  const { data: activeMemberships, error: activeError } = await supabase
    .from("team_members")
    .select("id,team_id")
    .eq("executive_id", executiveId)
    .eq("active", true);

  if (activeError) throw activeError;

  const alreadyAssigned = Boolean(teamId) && activeMemberships?.some((membership: { team_id: string }) => membership.team_id === teamId);
  const membershipsToClose = alreadyAssigned
    ? activeMemberships?.filter((membership: { team_id: string }) => membership.team_id !== teamId)
    : activeMemberships;

  const membershipIdsToClose = membershipsToClose?.map((membership: { id: string }) => membership.id) ?? [];
  if (membershipIdsToClose.length) {
    const { error: closeError } = await supabase
      .from("team_members")
      .update({ active: false, end_date: today })
      .in("id", membershipIdsToClose);
    if (closeError) throw closeError;
  }

  if (!teamId || alreadyAssigned) return;

  const { error: memberError } = await supabase.from("team_members").upsert(
    {
      team_id: teamId,
      executive_id: executiveId,
      start_date: today,
      end_date: null,
      active: true
    },
    { onConflict: "team_id,executive_id,start_date" }
  );

  if (memberError) throw memberError;
}

function normalizeShift(shift: string | null): Executive["shift"] {
  if (shift === "Tarde" || shift === "Noche") return shift;
  return "Manana";
}

async function uploadExecutivePhoto(executiveId: string, dataUrl: string) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Debes iniciar sesion para subir fotos.");

  const blob = await fetch(dataUrl).then((response) => response.blob());
  const path = `${userId}/${executiveId}/avatar-${Date.now()}.png`;
  const { error } = await supabase.storage.from("executive-photos").upload(path, blob, {
    contentType: "image/png",
    upsert: true
  });

  if (error) throw error;
  return path;
}

async function getPersistableExecutivePhotoPath(executiveId: string, photoUrl: string | null | undefined) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("data:image/")) return uploadExecutivePhoto(executiveId, photoUrl);
  if (!photoUrl.startsWith("http")) return photoUrl;

  const signedPath = extractExecutivePhotoPath(photoUrl);
  if (signedPath) return signedPath;

  const supabase = getSupabase();
  const { data, error } = await supabase.from("executives").select("photo_url").eq("id", executiveId).maybeSingle();
  if (error) throw error;
  return data?.photo_url ?? null;
}

function extractExecutivePhotoPath(photoUrl: string) {
  try {
    const url = new URL(photoUrl);
    const marker = "/storage/v1/object/sign/executive-photos/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function resolveExecutivePhotoUrl(photoUrl: string | null) {
  if (!photoUrl) return "";
  if (photoUrl.startsWith("http") || photoUrl.startsWith("data:image/") || photoUrl.startsWith("/")) return photoUrl;

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from("executive-photos").createSignedUrl(photoUrl, 60 * 60);
  if (error) return "";
  return data.signedUrl;
}

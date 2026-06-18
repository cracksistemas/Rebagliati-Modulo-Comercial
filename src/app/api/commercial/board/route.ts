import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CommercialBoardAssignment, CommercialBoardLead, CommercialBoardTimeBlock } from "@/lib/commercial/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toAssignment(row: any): CommercialBoardAssignment {
  return {
    id: row.id,
    boardDate: row.board_date,
    executiveId: row.executive_id,
    teamId: row.team_id ?? undefined,
    productEditionId: row.product_edition_id ?? undefined,
    productName: row.product_name,
    productCode: row.product_code ?? undefined,
    productType: row.product_type,
    modality: row.modality ?? undefined,
    eventStartDate: row.event_start_date ?? undefined,
    leadSource: row.lead_source ?? "Kommo",
    campaign: row.campaign ?? undefined,
    priority: row.priority,
    priorityScore: Number(row.priority_score ?? 0),
    assignedLeadsCount: Number(row.assigned_leads_count ?? 0),
    leadsAssignedToday: Number(row.leads_assigned_today ?? 0),
    dailyCallGoal: Number(row.daily_call_goal ?? 0),
    callsMade: Number(row.calls_made ?? 0),
    callsAnswered: Number(row.calls_answered ?? 0),
    messagesSent: Number(row.messages_sent ?? 0),
    messagesReceived: Number(row.messages_received ?? 0),
    contactsMade: Number(row.contacts_made ?? 0),
    salesCount: Number(row.sales_count ?? 0),
    salesAmount: Number(row.sales_amount ?? 0),
    status: row.status,
    lastUpdatedAt: row.last_updated_at ?? "",
    comments: Array.isArray(row.comments) ? row.comments : [],
    kommoUrl: row.kommo_url ?? undefined
  };
}

function toLead(row: any): CommercialBoardLead {
  return {
    id: row.id,
    leadName: row.lead_name,
    phone: row.phone ?? undefined,
    source: row.source,
    campaign: row.campaign ?? undefined,
    productInterest: row.product_interest,
    createdAt: row.created_at_label ?? row.created_at ?? "",
    kommoStatus: row.kommo_status ?? undefined,
    score: Number(row.score ?? 0),
    suggestedPriority: row.suggested_priority,
    assignedTo: row.assigned_to ?? undefined,
    kommoLeadId: row.kommo_lead_id ?? undefined,
    kommoUrl: row.kommo_url ?? undefined
  };
}

function toTimeBlock(row: any): CommercialBoardTimeBlock {
  return {
    id: row.id,
    blockTime: row.block_time,
    blockLabel: row.block_label,
    blockWeight: Number(row.block_weight ?? 0),
    assignedLeadsCount: Number(row.assigned_leads_count ?? 0),
    callGoal: Number(row.call_goal ?? 0),
    callsMade: Number(row.calls_made ?? 0),
    messagesSent: Number(row.messages_sent ?? 0),
    messagesReceived: Number(row.messages_received ?? 0),
    contactsMade: Number(row.contacts_made ?? 0),
    salesCount: Number(row.sales_count ?? 0)
  };
}

function assignmentPayload(row: CommercialBoardAssignment) {
  return {
    id: row.id,
    board_date: row.boardDate,
    executive_id: row.executiveId,
    team_id: row.teamId || null,
    product_edition_id: row.productEditionId || null,
    product_name: row.productName,
    product_code: row.productCode || null,
    product_type: row.productType,
    modality: row.modality || null,
    event_start_date: row.eventStartDate || null,
    lead_source: row.leadSource,
    campaign: row.campaign || null,
    priority: row.priority,
    priority_score: row.priorityScore,
    assigned_leads_count: row.assignedLeadsCount,
    leads_assigned_today: row.leadsAssignedToday,
    daily_call_goal: row.dailyCallGoal,
    calls_made: row.callsMade,
    calls_answered: row.callsAnswered,
    messages_sent: row.messagesSent,
    messages_received: row.messagesReceived,
    contacts_made: row.contactsMade,
    sales_count: row.salesCount,
    sales_amount: row.salesAmount,
    status: row.status,
    last_updated_at: row.lastUpdatedAt,
    comments: row.comments ?? [],
    kommo_url: row.kommoUrl || null
  };
}

async function currentUserId() {
  const supabase = (await createClient()) as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const [assignments, leads, blocks, settings] = await Promise.all([
      admin.from("commercial_board_assignments").select("*").order("board_date", { ascending: false }).limit(500),
      admin.from("commercial_board_leads").select("*").order("received_at", { ascending: false }).limit(500),
      admin.from("commercial_board_time_blocks").select("*").order("block_time", { ascending: true }),
      admin.from("commercial_board_settings").select("value").eq("key", "sheet_config").maybeSingle()
    ]);

    if (assignments.error || leads.error || blocks.error) {
      return NextResponse.json({ ok: true, persisted: false, data: {} });
    }

    return NextResponse.json({
      ok: true,
      persisted: true,
      data: {
        boardAssignments: ((assignments.data as any[]) ?? []).map(toAssignment),
        boardLeads: ((leads.data as any[]) ?? []).map(toLead),
        boardTimeBlocks: ((blocks.data as any[]) ?? []).map(toTimeBlock),
        boardSheetConfig: settings.error ? undefined : settings.data?.value
      }
    });
  } catch {
    return NextResponse.json({ ok: true, persisted: false, data: {} });
  }
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  try {
    const payload = await request.json();
    const admin = createAdminClient();

    if (payload.assignment) {
      const { data, error } = await admin
        .from("commercial_board_assignments")
        .upsert(assignmentPayload(payload.assignment), { onConflict: "id" })
        .select("*")
        .single();
      if (error) return NextResponse.json({ ok: true, persisted: false, error: error.message });
      return NextResponse.json({ ok: true, persisted: true, data: toAssignment(data) });
    }

    if (payload.leadAssignment) {
      const { leadId, executiveId } = payload.leadAssignment;
      const { data, error } = await admin
        .from("commercial_board_leads")
        .update({ assigned_to: executiveId || null, kommo_status: executiveId ? "Asignado" : "Por asignar" })
        .eq("id", leadId)
        .select("*")
        .maybeSingle();
      if (error) return NextResponse.json({ ok: true, persisted: false, error: error.message });
      return NextResponse.json({ ok: true, persisted: true, data: data ? toLead(data) : null });
    }

    if (payload.sheetConfig) {
      const { data, error } = await admin
        .from("commercial_board_settings")
        .upsert({ key: "sheet_config", value: payload.sheetConfig, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "key" })
        .select("value")
        .single();
      if (error) return NextResponse.json({ ok: true, persisted: false, error: error.message });
      return NextResponse.json({ ok: true, persisted: true, data: data?.value });
    }

    return NextResponse.json({ ok: false, error: "Payload no reconocido." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar pizarra comercial.";
    return NextResponse.json({ ok: true, persisted: false, error: message });
  }
}

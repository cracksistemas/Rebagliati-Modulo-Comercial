import { NextRequest, NextResponse } from "next/server";
import { loadKommoResponseMetrics, type KommoDirectoryUser } from "@/lib/kommo/response-times";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadCommercialDirectory(): Promise<KommoDirectoryUser[]> {
  try {
    const admin = createAdminClient();
    const [executivesResult, membershipsResult, teamsResult] = await Promise.all([
      admin.from("executives").select("id,full_name,profile_id").eq("status", "Activo"),
      admin.from("team_members").select("team_id,executive_id,active").eq("active", true),
      admin.from("teams").select("id,name")
    ]);

    if (executivesResult.error || membershipsResult.error || teamsResult.error) return [];

    const teamByExecutive = new Map(((membershipsResult.data as any[]) ?? []).map((item) => [item.executive_id, item.team_id]));
    const teamNameById = new Map(((teamsResult.data as any[]) ?? []).map((item) => [item.id, item.name]));

    return ((executivesResult.data as any[]) ?? []).map((executive) => {
      const teamId = teamByExecutive.get(executive.id);
      return {
        userId: executive.profile_id ?? executive.id,
        fullName: executive.full_name,
        teamId,
        teamName: teamId ? teamNameById.get(teamId) : undefined
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const directory = await loadCommercialDirectory();
    const data = await loadKommoResponseMetrics(request.nextUrl.searchParams, directory);
    return NextResponse.json({ ok: true, data });
  } catch {
    const fallbackSeconds = Number(process.env.KOMMO_AVG_RESPONSE_SECONDS ?? 462);
    const minutes = Math.floor(fallbackSeconds / 60);
    const seconds = fallbackSeconds % 60;
    const label = `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
    return NextResponse.json({
      ok: true,
      data: {
        connected: false,
        status: "Pendiente de sincronizacion",
        averageResponseSeconds: fallbackSeconds,
        averageResponseLabel: label,
        samples: 0,
        lastSyncedAt: new Date().toISOString(),
        activeDialogs: 0,
        global: {
          id: "global",
          name: "Global",
          avgReplySeconds: fallbackSeconds,
          avgReplyFormatted: label,
          medianReplySeconds: 0,
          p90ReplySeconds: 0,
          maxReplySeconds: 0,
          answeredWindows: 0,
          unansweredDialogs: 0,
          slaCompliance: 0
        },
        byTeam: [],
        byUser: []
      }
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { loadKommoResponseMetrics } from "@/lib/kommo/response-times";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authorization = request.headers.get("authorization") ?? "";
    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
  }

  const data = await loadKommoResponseMetrics(request.nextUrl.searchParams);
  return NextResponse.json({
    ok: true,
    syncedAt: data.lastSyncedAt,
    averageResponseSeconds: data.averageResponseSeconds,
    samples: data.samples,
    activeDialogs: data.activeDialogs
  });
}

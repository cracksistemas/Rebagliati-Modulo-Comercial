import { NextResponse } from "next/server";
import { kommoRequest } from "@/lib/kommo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KommoEvent = {
  id?: number;
  type?: string;
  entity_id?: number;
  entity_type?: string;
  created_at?: number;
};

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}m ${String(remainder).padStart(2, "0")}s`;
}

function fallbackMetric(reason: string) {
  const fallbackSeconds = Number(process.env.KOMMO_AVG_RESPONSE_SECONDS ?? 462);
  return {
    connected: false,
    source: "fallback",
    reason,
    averageResponseSeconds: fallbackSeconds,
    averageResponseLabel: formatDuration(fallbackSeconds),
    samples: 0,
    computedAt: new Date().toISOString()
  };
}

function eventDirection(type = "") {
  const normalized = type.toLowerCase();
  if (normalized.includes("incoming") || normalized.includes("received")) return "incoming";
  if (normalized.includes("outgoing") || normalized.includes("sent")) return "outgoing";
  return "other";
}

function computeAverage(events: KommoEvent[]) {
  const sorted = events
    .filter((event) => event.entity_id && event.created_at)
    .sort((a, b) => Number(a.created_at) - Number(b.created_at));

  const pendingIncoming = new Map<number, number>();
  const responseSeconds: number[] = [];

  sorted.forEach((event) => {
    const entityId = Number(event.entity_id);
    const createdAt = Number(event.created_at);
    const direction = eventDirection(event.type);

    if (direction === "incoming" && !pendingIncoming.has(entityId)) {
      pendingIncoming.set(entityId, createdAt);
    }

    if (direction === "outgoing" && pendingIncoming.has(entityId)) {
      const incomingAt = pendingIncoming.get(entityId);
      if (incomingAt && createdAt > incomingAt) {
        responseSeconds.push(createdAt - incomingAt);
        pendingIncoming.delete(entityId);
      }
    }
  });

  if (!responseSeconds.length) return null;

  return Math.round(responseSeconds.reduce((sum, value) => sum + value, 0) / responseSeconds.length);
}

export async function GET() {
  try {
    const response = await kommoRequest<{ _embedded?: { events?: KommoEvent[] } }>("/api/v4/events", {
      query: new URLSearchParams({ limit: "250" })
    });
    const events = response._embedded?.events ?? [];
    const averageSeconds = computeAverage(events);

    if (!averageSeconds) {
      return NextResponse.json({
        ok: true,
        data: fallbackMetric("No message event pairs were found in Kommo events.")
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        connected: true,
        source: "kommo_events",
        averageResponseSeconds: averageSeconds,
        averageResponseLabel: formatDuration(averageSeconds),
        samples: events.length,
        computedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Kommo metrics request failed.";
    return NextResponse.json({
      ok: true,
      data: fallbackMetric(reason)
    });
  }
}

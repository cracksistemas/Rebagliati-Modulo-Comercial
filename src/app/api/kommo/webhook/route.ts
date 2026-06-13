import { NextRequest, NextResponse } from "next/server";
import {
  countKommoWebhookCandidateRecords,
  getSafeTopLevelKeys,
  normalizeKommoWebhookPayload,
  parseUrlEncodedBody,
  persistKommoMessageEvents,
  persistKommoWebhookDebug
} from "@/lib/kommo/message-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPayloadSecret(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const value =
    record.secret ??
    record.webhook_secret ??
    record.kommo_webhook_secret ??
    record.KOMMO_WEBHOOK_SECRET ??
    record.token ??
    record.api_key;
  return typeof value === "string" ? value : null;
}

function parseRawWebhookBody(contentType: string, rawBody: string) {
  if (!rawBody.trim()) return {};
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return { _parse_error: "invalid_json", _raw_body_preview: rawBody.slice(0, 500) };
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    return parseUrlEncodedBody(rawBody);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return parseUrlEncodedBody(rawBody);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const rawBody = await request.text();
  const payload = parseRawWebhookBody(contentType, rawBody);
  const bodyReceived = rawBody.trim().length > 0;
  const topLevelKeys = getSafeTopLevelKeys(payload);
  const detectedRecords = countKommoWebhookCandidateRecords(payload);

  const expectedSecret = process.env.KOMMO_WEBHOOK_SECRET?.trim();
  const receivedSecret =
    request.headers.get("x-kommo-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-webhook-token") ??
    request.nextUrl.searchParams.get("secret") ??
    request.nextUrl.searchParams.get("token") ??
    getPayloadSecret(payload);

  if (expectedSecret && receivedSecret !== expectedSecret) {
    console.warn(
      "Kommo webhook rejected",
      JSON.stringify({
        contentType,
        rawBodyLength: rawBody.length,
        bodyReceived,
        topLevelKeys,
        detectedRecords,
        reason: "invalid_secret"
      })
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid webhook secret.",
        hint: "Send the same KOMMO_WEBHOOK_SECRET as ?secret=..., x-kommo-secret, x-webhook-secret, token, or a body field named secret."
      },
      { status: 401 }
    );
  }

  const events = normalizeKommoWebhookPayload(payload);
  console.info(
    "Kommo webhook received",
    JSON.stringify({
      contentType,
      rawBodyLength: rawBody.length,
      bodyReceived,
      topLevelKeys,
      detectedRecords,
      normalizedEvents: events.length
    })
  );

  if (!events.length) {
    console.warn("No normalized Kommo message events found");
  }

  const persistence = await persistKommoMessageEvents(events);
  if (persistence.error) {
    console.error(
      "Kommo webhook Supabase insert failed",
      JSON.stringify({
        inserted: persistence.inserted,
        skipped: persistence.skipped,
        tableMissing: persistence.tableMissing,
        error: persistence.error
      })
    );
  } else {
    console.info(
      "Kommo webhook Supabase insert result",
      JSON.stringify({
        inserted: persistence.inserted,
        skipped: persistence.skipped,
        tableMissing: persistence.tableMissing
      })
    );
  }

  let debugResult: Awaited<ReturnType<typeof persistKommoWebhookDebug>> | null = null;
  if (!events.length || persistence.error || persistence.tableMissing) {
    debugResult = await persistKommoWebhookDebug({
      contentType,
      rawBody,
      bodyReceived,
      topLevelKeys,
      detectedRecords,
      normalizedEvents: events.length,
      persistedEvents: persistence.inserted,
      tableMissing: persistence.tableMissing,
      supabaseError: persistence.error,
      reason: !events.length ? "no_normalized_events" : persistence.tableMissing ? "message_table_missing" : "insert_failed",
      rawPayload: payload
    });
    if (debugResult.error) {
      console.error("Kommo webhook debug insert failed", JSON.stringify({ error: debugResult.error }));
    } else {
      console.info("Kommo webhook debug insert result", JSON.stringify({ inserted: debugResult.inserted }));
    }
  }

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    contentType,
    rawBodyLength: rawBody.length,
    bodyReceived,
    topLevelKeys,
    detectedRecords,
    normalizedEvents: events.length,
    persistedEvents: persistence.inserted,
    tableMissing: persistence.tableMissing,
    supabaseInsertError: persistence.error,
    debugSaved: debugResult?.inserted ?? false,
    debugError: debugResult?.error ?? null
  });
}

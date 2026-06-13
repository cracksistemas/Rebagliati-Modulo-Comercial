import { NextRequest, NextResponse } from "next/server";
import { formEntriesToObject, normalizeKommoWebhookPayload, persistKommoMessageEvents } from "@/lib/kommo/message-events";

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

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await request.json()
    : formEntriesToObject((await request.formData()).entries());

  const expectedSecret = process.env.KOMMO_WEBHOOK_SECRET?.trim();
  const receivedSecret =
    request.headers.get("x-kommo-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-webhook-token") ??
    request.nextUrl.searchParams.get("secret") ??
    request.nextUrl.searchParams.get("token") ??
    getPayloadSecret(payload);

  if (expectedSecret && receivedSecret !== expectedSecret) {
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
  const persistence = await persistKommoMessageEvents(events);

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    normalizedEvents: events.length,
    persistedEvents: persistence.inserted,
    tableMissing: persistence.tableMissing
  });
}

import { NextRequest, NextResponse } from "next/server";
import { formEntriesToObject, normalizeKommoWebhookPayload, persistKommoMessageEvents } from "@/lib/kommo/message-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.KOMMO_WEBHOOK_SECRET?.trim();
  const receivedSecret =
    request.headers.get("x-kommo-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.nextUrl.searchParams.get("secret");

  if (expectedSecret && receivedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Invalid webhook secret." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await request.json()
    : formEntriesToObject((await request.formData()).entries());
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

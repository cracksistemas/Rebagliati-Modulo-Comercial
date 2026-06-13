import { createAdminClient } from "@/lib/supabase/admin";

type UnknownRecord = Record<string, unknown>;

export type KommoMessageEvent = {
  messageId: string;
  leadId?: number;
  talkId?: number;
  contactId?: number;
  conversationId?: string;
  channel?: string;
  source?: string;
  direction: "incoming" | "outgoing";
  senderUserId?: string;
  senderName?: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  messageCreatedAt?: string;
  rawPayload: unknown;
};

export type SupabasePersistenceError = {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
};

type KommoWebhookDebugEntry = {
  contentType: string;
  rawBody?: string;
  bodyReceived: boolean;
  topLevelKeys: string[];
  detectedRecords: number;
  normalizedEvents: number;
  persistedEvents: number;
  tableMissing: boolean;
  supabaseError?: SupabasePersistenceError | null;
  reason: string;
  rawPayload: unknown;
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function firstString(...values: unknown[]) {
  const match = values.find((value) => typeof value === "string" && value.trim());
  if (typeof match === "string") return match.trim();
  const numberMatch = values.find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof numberMatch === "number" ? String(numberMatch) : undefined;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
  }
  return undefined;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "string" && value.includes("-")) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue > 0) {
    const milliseconds = numberValue > 10_000_000_000 ? numberValue : numberValue * 1000;
    return new Date(milliseconds).toISOString();
  }
  return undefined;
}

function setNested(target: UnknownRecord, rawKey: string, value: unknown) {
  const parts = rawKey
    .replace(/\]/g, "")
    .split("[")
    .flatMap((part) => part.split("."))
    .filter(Boolean);
  let current = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part] as UnknownRecord;
  });
}

export function formEntriesToObject(entries: Iterable<[string, FormDataEntryValue]>) {
  const target: UnknownRecord = {};
  for (const [key, value] of entries) {
    setNested(target, key, typeof value === "string" ? value : value.name);
  }
  return target;
}

export function parseUrlEncodedBody(rawBody: string) {
  const target: UnknownRecord = {};
  const params = new URLSearchParams(rawBody);
  params.forEach((value, key) => {
    setNested(target, key, value);
  });
  return target;
}

function collectRecords(value: unknown, records: UnknownRecord[] = []) {
  if (!value || typeof value !== "object") return records;
  if (Array.isArray(value)) {
    value.forEach((item) => collectRecords(item, records));
    return records;
  }

  const record = value as UnknownRecord;
  const keys = Object.keys(record).join(" ").toLowerCase();
  if (
    keys.includes("message") ||
    keys.includes("talk") ||
    keys.includes("lead") ||
    keys.includes("chat") ||
    keys.includes("direction")
  ) {
    records.push(record);
  }

  Object.values(record).forEach((item) => collectRecords(item, records));
  return records;
}

function summarizeError(error: unknown): SupabasePersistenceError {
  if (typeof error === "object" && error) {
    const record = error as { code?: string; message?: string; details?: string; hint?: string };
    return {
      code: record.code,
      message: record.message ?? "Unknown Supabase error",
      details: record.details,
      hint: record.hint
    };
  }
  return { message: error instanceof Error ? error.message : "Unknown Supabase error" };
}

export function getSafeTopLevelKeys(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.keys(payload as UnknownRecord)
    .filter((key) => !/(secret|token|password|authorization|api[_-]?key)/i.test(key))
    .slice(0, 40);
}

export function countKommoWebhookCandidateRecords(payload: unknown) {
  return collectRecords(payload).length;
}

function inferDirection(record: UnknownRecord) {
  const sender = asRecord(record.sender);
  const author = asRecord(record.author);
  const descriptor = [
    record.direction,
    record.type,
    record.message_type,
    record.event_type,
    record.element_type,
    record.status,
    sender.type,
    sender.ref_type,
    author.type
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    descriptor.includes("outgoing") ||
    descriptor.includes("outbound") ||
    descriptor.includes("sent") ||
    descriptor.includes("manager") ||
    descriptor.includes("operator") ||
    descriptor.includes("user")
  ) {
    return "outgoing" as const;
  }

  if (
    descriptor.includes("incoming") ||
    descriptor.includes("inbound") ||
    descriptor.includes("received") ||
    descriptor.includes("client") ||
    descriptor.includes("customer")
  ) {
    return "incoming" as const;
  }

  return undefined;
}

function normalizeRecord(record: UnknownRecord, rootPayload: unknown): KommoMessageEvent | null {
  const sender = asRecord(record.sender);
  const author = asRecord(record.author);
  const message = asRecord(record.message);
  const talk = asRecord(record.talk);
  const lead = asRecord(record.lead);
  const contact = asRecord(record.contact);
  const chat = asRecord(record.chat);
  const direction = inferDirection(record);
  if (!direction) return null;

  const messageId = firstString(
    record.message_id,
    record.messageId,
    record.id,
    message.id,
    message.message_id,
    `${firstString(record.talk_id, talk.id, record.lead_id, lead.id, record.conversation_id, chat.id) ?? "kommo"}-${normalizeTimestamp(record.created_at ?? message.created_at) ?? Date.now()}-${direction}`
  );
  if (!messageId) return null;

  return {
    messageId,
    leadId: firstNumber(record.lead_id, record.leadId, lead.id, asRecord(record.entity).id),
    talkId: firstNumber(record.talk_id, record.talkId, talk.id),
    contactId: firstNumber(record.contact_id, record.contactId, contact.id),
    conversationId: firstString(record.conversation_id, record.conversationId, record.chat_id, chat.id, chat.conversation_id),
    channel: firstString(record.channel, record.source, record.origin, record.provider, chat.source, chat.channel, "Kommo"),
    source: firstString(record.source, record.origin, record.provider, chat.source),
    direction,
    senderUserId: firstString(record.sender_user_id, record.senderUserId, record.user_id, sender.id, author.id),
    senderName: firstString(record.sender_name, record.senderName, record.user_name, sender.name, author.name),
    responsibleUserId: firstString(record.responsible_user_id, record.responsibleUserId, record.account_user_id),
    responsibleUserName: firstString(record.responsible_user_name, record.responsibleUserName),
    messageCreatedAt: normalizeTimestamp(record.created_at ?? record.createdAt ?? message.created_at ?? message.time ?? record.timestamp),
    rawPayload: rootPayload
  };
}

export function normalizeKommoWebhookPayload(payload: unknown) {
  const records = collectRecords(payload);
  const deduped = new Map<string, KommoMessageEvent>();
  records.forEach((record) => {
    const event = normalizeRecord(record, payload);
    if (!event) return;
    deduped.set(event.messageId, event);
  });
  return [...deduped.values()];
}

export async function persistKommoMessageEvents(events: KommoMessageEvent[]) {
  if (!events.length) return { inserted: 0, skipped: 0, tableMissing: false, error: null };

  try {
    const admin = createAdminClient();
    const rows = events.map((event) => ({
      message_id: event.messageId,
      lead_id: event.leadId ?? null,
      talk_id: event.talkId ?? null,
      contact_id: event.contactId ?? null,
      conversation_id: event.conversationId ?? null,
      channel: event.channel ?? null,
      source: event.source ?? null,
      direction: event.direction,
      sender_user_id: event.senderUserId ?? null,
      sender_name: event.senderName ?? null,
      responsible_user_id: event.responsibleUserId ?? null,
      responsible_user_name: event.responsibleUserName ?? null,
      message_created_at: event.messageCreatedAt ?? null,
      raw_payload: event.rawPayload
    }));

    const { error } = await admin.from("kommo_message_events").upsert(rows, { onConflict: "message_id" });
    if (!error) return { inserted: rows.length, skipped: 0, tableMissing: false, error: null };
    const summary = summarizeError(error);
    if (error.code === "42P01" || /kommo_message_events/i.test(error.message)) {
      return { inserted: 0, skipped: rows.length, tableMissing: true, error: summary };
    }
    return { inserted: 0, skipped: rows.length, tableMissing: false, error: summary };
  } catch (error) {
    return { inserted: 0, skipped: events.length, tableMissing: false, error: summarizeError(error) };
  }
}

export async function persistKommoWebhookDebug(entry: KommoWebhookDebugEntry) {
  try {
    const admin = createAdminClient();
    const row = {
      content_type: entry.contentType || null,
      body_received: entry.bodyReceived,
      top_level_keys: entry.topLevelKeys,
      detected_records: entry.detectedRecords,
      normalized_events: entry.normalizedEvents,
      persisted_events: entry.persistedEvents,
      table_missing: entry.tableMissing,
      supabase_error: entry.supabaseError ?? null,
      reason: entry.reason,
      raw_body: entry.rawBody ?? null,
      raw_payload: entry.rawPayload
    };
    const { error } = await admin.from("kommo_webhook_debug").insert(row);
    if (!error) return { inserted: true, error: null };
    if (/raw_body/i.test(error.message) || error.code === "PGRST204") {
      const { raw_body: _rawBody, ...rowWithoutRawBody } = row;
      const retry = await admin.from("kommo_webhook_debug").insert(rowWithoutRawBody);
      if (!retry.error) return { inserted: true, error: null };
      return { inserted: false, error: summarizeError(retry.error) };
    }
    return { inserted: false, error: summarizeError(error) };
  } catch (error) {
    return { inserted: false, error: summarizeError(error) };
  }
}

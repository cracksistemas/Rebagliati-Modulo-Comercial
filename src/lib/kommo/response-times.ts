import { kommoChatsRequest, kommoRequest } from "@/lib/kommo/client";

type UnknownRecord = Record<string, unknown>;

type KommoTalk = UnknownRecord & {
  id?: number | string;
  chat_id?: string;
  conversation_id?: string;
  responsible_user_id?: number | string;
  responsible_user_name?: string;
  contact_name?: string;
};

type NormalizedMessage = {
  id: string;
  direction: "incoming" | "outgoing" | "ignored";
  createdAt: number;
  userId?: string;
  userName?: string;
};

type ReplyWindow = {
  conversationId: string;
  incomingAt: number;
  repliedAt: number;
  replySeconds: number;
  userId?: string;
  userName: string;
};

type OpenWindow = {
  conversationId: string;
  incomingAt: number;
};

export type KommoDirectoryUser = {
  userId?: string;
  fullName: string;
  teamId?: string;
  teamName?: string;
};

export type ResponseMetricGroup = {
  id: string;
  name: string;
  teamId?: string;
  teamName?: string;
  avgReplySeconds: number;
  avgReplyFormatted: string;
  medianReplySeconds: number;
  p90ReplySeconds: number;
  maxReplySeconds: number;
  answeredWindows: number;
  unansweredDialogs: number;
  slaCompliance: number;
};

export type KommoResponseMetrics = {
  connected: boolean;
  status: "Sincronizado" | "Pendiente de sincronizacion";
  averageResponseSeconds: number;
  averageResponseLabel: string;
  samples: number;
  lastSyncedAt: string;
  activeDialogs: number;
  global: ResponseMetricGroup;
  byTeam: ResponseMetricGroup[];
  byUser: ResponseMetricGroup[];
};

const FALLBACK_SECONDS = Number(process.env.KOMMO_AVG_RESPONSE_SECONDS ?? 462);
const DEFAULT_SLA_SECONDS = Number(process.env.KOMMO_RESPONSE_SLA_SECONDS ?? 600);

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}m ${String(remainder).padStart(2, "0")}s`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function firstString(...values: unknown[]) {
  const match = values.find((value) => typeof value === "string" && value.trim());
  return typeof match === "string" ? match.trim() : undefined;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return undefined;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.round(parsed / 1000);
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return numberValue > 10_000_000_000 ? Math.round(numberValue / 1000) : Math.round(numberValue);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getEmbeddedArray(payload: unknown, key: string) {
  const root = asRecord(payload);
  const embedded = asRecord(root._embedded);
  const direct = root[key];
  const nested = embedded[key];
  if (Array.isArray(direct)) return direct as UnknownRecord[];
  if (Array.isArray(nested)) return nested as UnknownRecord[];
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  return [];
}

function normalizeTalk(payload: unknown): KommoTalk {
  const talk = asRecord(payload) as KommoTalk;
  const embedded = asRecord(talk._embedded);
  const chats = getEmbeddedArray(embedded, "chats");
  const firstChat = asRecord(chats[0]);
  return {
    ...talk,
    id: talk.id,
    chat_id: firstString(talk.chat_id, talk.chatId, firstChat.id, firstChat.chat_id),
    conversation_id: firstString(talk.conversation_id, talk.conversationId, firstChat.conversation_id, firstChat.chat_id, firstChat.id),
    responsible_user_id: firstNumber(talk.responsible_user_id, talk.responsibleUserId),
    responsible_user_name: firstString(talk.responsible_user_name, talk.responsibleUserName, talk.user_name),
    contact_name: firstString(talk.contact_name, talk.contactName)
  };
}

function getConversationId(talk: KommoTalk, detail?: unknown) {
  const detailRecord = asRecord(detail);
  const embedded = asRecord(detailRecord._embedded);
  const chats = getEmbeddedArray(embedded, "chats");
  const firstChat = asRecord(chats[0]);
  return firstString(
    talk.conversation_id,
    talk.chat_id,
    detailRecord.conversation_id,
    detailRecord.conversationId,
    detailRecord.chat_id,
    detailRecord.chatId,
    firstChat.conversation_id,
    firstChat.chat_id,
    firstChat.id
  );
}

function normalizeMessage(payload: unknown): NormalizedMessage {
  const message = asRecord(payload);
  const sender = asRecord(message.sender);
  const author = asRecord(message.author);
  const createdAt = normalizeTimestamp(
    message.created_at ?? message.createdAt ?? message.date_create ?? message.dateCreate ?? message.time ?? message.timestamp
  );
  const descriptor = [
    message.type,
    message.event_type,
    message.message_type,
    message.direction,
    message.status,
    sender.type,
    sender.ref_type,
    author.type
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    descriptor.includes("system") ||
    descriptor.includes("internal") ||
    descriptor.includes("note") ||
    descriptor.includes("task") ||
    descriptor.includes("event")
  ) {
    return { id: String(message.id ?? message.message_id ?? crypto.randomUUID()), direction: "ignored", createdAt };
  }

  const direction =
    descriptor.includes("outgoing") ||
    descriptor.includes("outbound") ||
    descriptor.includes("sent") ||
    descriptor.includes("manager") ||
    descriptor.includes("operator") ||
    descriptor.includes("user")
      ? "outgoing"
      : descriptor.includes("incoming") ||
          descriptor.includes("inbound") ||
          descriptor.includes("received") ||
          descriptor.includes("client") ||
          descriptor.includes("customer")
        ? "incoming"
        : "ignored";

  const userId = firstString(message.user_id, message.userId, sender.id, author.id);
  const userName = firstString(message.user_name, message.userName, sender.name, author.name);

  return {
    id: String(message.id ?? message.message_id ?? `${createdAt}-${direction}`),
    direction,
    createdAt,
    userId,
    userName
  };
}

function getHistoryMessages(payload: unknown) {
  const root = asRecord(payload);
  const embedded = asRecord(root._embedded);
  const messages = root.messages ?? root.history ?? root.items ?? embedded.messages;
  return Array.isArray(messages) ? messages.map(normalizeMessage).filter((message) => message.createdAt > 0) : [];
}

function computeWindows(conversationId: string, messages: NormalizedMessage[], fallbackUserName?: string) {
  const sorted = messages
    .filter((message) => message.direction !== "ignored")
    .sort((a, b) => a.createdAt - b.createdAt);
  const windows: ReplyWindow[] = [];
  let waiting: OpenWindow | null = null;

  sorted.forEach((message) => {
    if (message.direction === "incoming" && !waiting) {
      waiting = { conversationId, incomingAt: message.createdAt };
      return;
    }

    if (message.direction === "outgoing" && waiting && message.createdAt > waiting.incomingAt) {
      windows.push({
        conversationId,
        incomingAt: waiting.incomingAt,
        repliedAt: message.createdAt,
        replySeconds: message.createdAt - waiting.incomingAt,
        userId: message.userId,
        userName: message.userName ?? fallbackUserName ?? "Usuario Kommo"
      });
      waiting = null;
    }
  });

  return { windows, openWindow: waiting };
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

function buildGroup(id: string, name: string, windows: ReplyWindow[], unansweredDialogs: number, teamId?: string, teamName?: string): ResponseMetricGroup {
  const seconds = windows.map((window) => window.replySeconds);
  const average = seconds.length ? Math.round(seconds.reduce((sum, value) => sum + value, 0) / seconds.length) : 0;
  const slaHits = seconds.filter((value) => value <= DEFAULT_SLA_SECONDS).length;
  return {
    id,
    name,
    teamId,
    teamName,
    avgReplySeconds: average,
    avgReplyFormatted: formatDuration(average),
    medianReplySeconds: percentile(seconds, 50),
    p90ReplySeconds: percentile(seconds, 90),
    maxReplySeconds: seconds.length ? Math.max(...seconds) : 0,
    answeredWindows: windows.length,
    unansweredDialogs,
    slaCompliance: seconds.length ? Math.round((slaHits / seconds.length) * 100) : 0
  };
}

function matchDirectoryUser(window: ReplyWindow, directory: KommoDirectoryUser[]) {
  if (window.userId) {
    const byId = directory.find((user) => user.userId && String(user.userId) === String(window.userId));
    if (byId) return byId;
  }
  const normalizedResponder = normalizeName(window.userName);
  return directory.find((user) => {
    const normalizedUser = normalizeName(user.fullName);
    return normalizedUser === normalizedResponder || normalizedUser.includes(normalizedResponder) || normalizedResponder.includes(normalizedUser);
  });
}

function filterByRange<T extends ReplyWindow | OpenWindow>(items: T[], from?: number, to?: number) {
  return items.filter((item) => {
    const timestamp = "incomingAt" in item ? item.incomingAt : 0;
    if (from && timestamp < from) return false;
    if (to && timestamp > to) return false;
    return true;
  });
}

function parseDateBoundaries(searchParams?: URLSearchParams) {
  const from = searchParams?.get("from");
  const to = searchParams?.get("to");
  const fromSeconds = from ? normalizeTimestamp(`${from}T00:00:00-05:00`) : undefined;
  const toSeconds = to ? normalizeTimestamp(`${to}T23:59:59-05:00`) : undefined;
  return { fromSeconds, toSeconds };
}

function fallbackMetrics(status: "Sincronizado" | "Pendiente de sincronizacion" = "Pendiente de sincronizacion"): KommoResponseMetrics {
  const lastSyncedAt = new Date().toISOString();
  const global = buildGroup("global", "Global", [], 0);
  global.avgReplySeconds = FALLBACK_SECONDS;
  global.avgReplyFormatted = formatDuration(FALLBACK_SECONDS);
  return {
    connected: false,
    status,
    averageResponseSeconds: FALLBACK_SECONDS,
    averageResponseLabel: formatDuration(FALLBACK_SECONDS),
    samples: 0,
    lastSyncedAt,
    activeDialogs: 0,
    global,
    byTeam: [],
    byUser: []
  };
}

export async function loadKommoResponseMetrics(searchParams?: URLSearchParams, directory: KommoDirectoryUser[] = []) {
  const scopeId = process.env.KOMMO_SCOPE_ID?.trim() || process.env.KOMMO_CHAT_SCOPE_ID?.trim();
  if (!scopeId) return fallbackMetrics();

  const talksPayload = await kommoRequest<unknown>("/api/v4/talks", {
    query: new URLSearchParams({ limit: String(Number(process.env.KOMMO_RESPONSE_TALK_LIMIT ?? 80)) })
  });
  const talks = getEmbeddedArray(talksPayload, "talks").map(normalizeTalk);
  if (!talks.length) return fallbackMetrics("Sincronizado");

  const detailResults = await Promise.allSettled(
    talks.map(async (talk) => {
      const detail = talk.id ? await kommoRequest<unknown>(`/api/v4/talks/${talk.id}`) : null;
      const conversationId = getConversationId(talk, detail);
      if (!conversationId) return null;
      const history = await kommoChatsRequest<unknown>(`/v2/origin/custom/${scopeId}/chats/${conversationId}/history`, {
        query: new URLSearchParams({ offset: "0", limit: String(Number(process.env.KOMMO_RESPONSE_HISTORY_LIMIT ?? 100)) })
      });
      const { windows, openWindow } = computeWindows(conversationId, getHistoryMessages(history), talk.responsible_user_name);
      return { windows, openWindow };
    })
  );

  const allWindows: ReplyWindow[] = [];
  const openWindows: OpenWindow[] = [];
  detailResults.forEach((result) => {
    if (result.status !== "fulfilled" || !result.value) return;
    allWindows.push(...result.value.windows);
    if (result.value.openWindow) openWindows.push(result.value.openWindow);
  });

  const { fromSeconds, toSeconds } = parseDateBoundaries(searchParams);
  const windows = filterByRange(allWindows, fromSeconds, toSeconds);
  const unanswered = filterByRange(openWindows, fromSeconds, toSeconds);
  const global = buildGroup("global", "Global", windows, unanswered.length);

  const userMap = new Map<string, { userName: string; userId?: string; teamId?: string; teamName?: string; windows: ReplyWindow[] }>();
  windows.forEach((window) => {
    const matched = matchDirectoryUser(window, directory);
    const id = matched?.userId ?? window.userId ?? normalizeName(window.userName) ?? "unknown";
    const current = userMap.get(id) ?? {
      userName: matched?.fullName ?? window.userName,
      userId: matched?.userId ?? window.userId,
      teamId: matched?.teamId,
      teamName: matched?.teamName,
      windows: []
    };
    current.windows.push(window);
    userMap.set(id, current);
  });

  const byUser = [...userMap.entries()]
    .map(([id, item]) => buildGroup(id, item.userName, item.windows, 0, item.teamId, item.teamName))
    .sort((a, b) => b.answeredWindows - a.answeredWindows || a.avgReplySeconds - b.avgReplySeconds);

  const teamMap = new Map<string, { name: string; windows: ReplyWindow[] }>();
  windows.forEach((window) => {
    const matched = matchDirectoryUser(window, directory);
    const teamId = matched?.teamId ?? matched?.teamName ?? "sin-equipo";
    const current = teamMap.get(teamId) ?? { name: matched?.teamName ?? "Sin equipo", windows: [] };
    current.windows.push(window);
    teamMap.set(teamId, current);
  });

  const byTeam = [...teamMap.entries()]
    .map(([id, item]) => buildGroup(id, item.name, item.windows, 0, id))
    .sort((a, b) => b.answeredWindows - a.answeredWindows || a.avgReplySeconds - b.avgReplySeconds);

  return {
    connected: true,
    status: "Sincronizado" as const,
    averageResponseSeconds: global.avgReplySeconds,
    averageResponseLabel: global.avgReplyFormatted,
    samples: windows.length,
    lastSyncedAt: new Date().toISOString(),
    activeDialogs: unanswered.length,
    global,
    byTeam,
    byUser
  };
}

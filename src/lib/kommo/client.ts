import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export type KommoMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type KommoRequestOptions = {
  method?: KommoMethod;
  query?: URLSearchParams;
  body?: unknown;
  headers?: HeadersInit;
};

export class KommoApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`Kommo API error ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

async function getKommoBaseUrl() {
  const explicitBaseUrl = process.env.KOMMO_BASE_URL?.trim();
  const subdomain = process.env.KOMMO_SUBDOMAIN?.trim();

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  if (subdomain) {
    return `https://${subdomain}.kommo.com`;
  }

  const cookieStore = await cookies();
  const cookieBaseUrl = cookieStore.get("kommo_base_url")?.value;
  if (cookieBaseUrl) {
    return cookieBaseUrl.replace(/\/$/, "");
  }

  throw new Error("Missing KOMMO_BASE_URL or KOMMO_SUBDOMAIN.");
}

export async function getKommoAccessToken() {
  const token = process.env.KOMMO_ACCESS_TOKEN?.trim();
  if (!token) {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("kommo_access_token")?.value;
    if (cookieToken) return cookieToken;
    throw new Error("Missing KOMMO_ACCESS_TOKEN.");
  }
  return token;
}

export async function kommoChatsRequest<T = unknown>(path: string, options: KommoRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const baseUrl = (process.env.KOMMO_CHATS_BASE_URL?.trim() || "https://amojo.kommo.com").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  options.query?.forEach((value, key) => {
    if (value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await getKommoAccessToken()}`,
      Accept: "application/json",
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    body: method === "GET" || options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new KommoApiError(response.status, payload);
  }

  return payload as T;
}

async function buildUrl(path: string, query?: URLSearchParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${await getKommoBaseUrl()}${normalizedPath}`);
  query?.forEach((value, key) => {
    if (value !== "") url.searchParams.set(key, value);
  });
  return url;
}

export async function kommoRequest<T = unknown>(path: string, options: KommoRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(await buildUrl(path, options.query), {
    method,
    headers: {
      Authorization: `Bearer ${await getKommoAccessToken()}`,
      Accept: "application/json",
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    body: method === "GET" || options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new KommoApiError(response.status, payload);
  }

  return payload as T;
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof KommoApiError) {
    return NextResponse.json(
      { ok: false, error: "kommo_api_error", details: error.payload },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

export function copyAllowedParams(source: URLSearchParams, allowed: string[]) {
  const target = new URLSearchParams();
  allowed.forEach((key) => {
    const value = source.get(key);
    if (value) target.set(key, value);
  });
  return target;
}

export function toEntityArray(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  return [payload];
}

import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonOk, kommoRequest, type KommoMethod } from "@/lib/kommo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ path: string[] }>;
};

const allowedRoots = new Set([
  "account",
  "contacts",
  "companies",
  "customers",
  "events",
  "leads",
  "notes",
  "pipelines",
  "tasks",
  "users"
]);

async function handler(request: NextRequest, { params }: Params, method: KommoMethod) {
  try {
    const { path } = await params;
    const root = path[0];

    if (!root || !allowedRoots.has(root)) {
      return NextResponse.json({ ok: false, error: "Kommo path is not allowed." }, { status: 403 });
    }

    const body = method === "GET" || method === "DELETE" ? undefined : await request.json();
    const data = await kommoRequest(`/api/v4/${path.join("/")}`, {
      method,
      query: request.nextUrl.searchParams,
      body
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export function GET(request: NextRequest, context: Params) {
  return handler(request, context, "GET");
}

export function POST(request: NextRequest, context: Params) {
  return handler(request, context, "POST");
}

export function PATCH(request: NextRequest, context: Params) {
  return handler(request, context, "PATCH");
}

export function DELETE(request: NextRequest, context: Params) {
  return handler(request, context, "DELETE");
}

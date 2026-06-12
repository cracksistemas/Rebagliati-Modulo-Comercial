import { NextRequest } from "next/server";
import { copyAllowedParams, jsonError, jsonOk, kommoRequest, toEntityArray } from "@/lib/kommo/client";
import { mapLeadInput } from "@/lib/kommo/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leadQueryParams = [
  "page",
  "limit",
  "query",
  "with",
  "filter[id]",
  "filter[name]",
  "filter[price][from]",
  "filter[price][to]",
  "filter[pipeline_id]",
  "filter[status_id]",
  "filter[responsible_user_id]",
  "order[created_at]",
  "order[updated_at]"
];

export async function GET(request: NextRequest) {
  try {
    const query = copyAllowedParams(request.nextUrl.searchParams, leadQueryParams);
    const leads = await kommoRequest("/api/v4/leads", { query });
    return jsonOk(leads);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawPayload = body.raw ?? body;
    const payload = toEntityArray(rawPayload).map((item) => (body.raw ? item : mapLeadInput(item)));
    const created = await kommoRequest("/api/v4/leads", {
      method: "POST",
      body: payload
    });
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

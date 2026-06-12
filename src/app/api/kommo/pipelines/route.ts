import { NextRequest } from "next/server";
import { copyAllowedParams, jsonError, jsonOk, kommoRequest } from "@/lib/kommo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const query = copyAllowedParams(request.nextUrl.searchParams, ["with"]);
    const pipelines = await kommoRequest("/api/v4/leads/pipelines", { query });
    return jsonOk(pipelines);
  } catch (error) {
    return jsonError(error);
  }
}

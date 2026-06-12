import { NextRequest } from "next/server";
import { copyAllowedParams, jsonError, jsonOk, kommoRequest } from "@/lib/kommo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const query = copyAllowedParams(request.nextUrl.searchParams, ["page", "limit", "with", "filter[id]"]);
    const users = await kommoRequest("/api/v4/users", { query });
    return jsonOk(users);
  } catch (error) {
    return jsonError(error);
  }
}

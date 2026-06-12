import { jsonError, jsonOk, kommoRequest } from "@/lib/kommo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await kommoRequest("/api/v4/account", {
      query: new URLSearchParams({ with: "users" })
    });
    return jsonOk(account);
  } catch (error) {
    return jsonError(error);
  }
}

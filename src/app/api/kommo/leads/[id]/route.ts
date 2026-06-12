import { NextRequest } from "next/server";
import { jsonError, jsonOk, kommoRequest } from "@/lib/kommo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lead = await kommoRequest(`/api/v4/leads/${id}`);
    return jsonOk(lead);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await kommoRequest(`/api/v4/leads/${id}`, {
      method: "PATCH",
      body: body.raw ?? body
    });
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}

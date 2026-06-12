import { NextRequest, NextResponse } from "next/server";
import { buildKommoAuthorizeUrl, saveOAuthState } from "@/lib/kommo/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const mode = request.nextUrl.searchParams.get("mode") ?? "popup";
    const { authorizeUrl, state } = buildKommoAuthorizeUrl(origin, mode);

    await saveOAuthState(state);

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kommo OAuth start failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

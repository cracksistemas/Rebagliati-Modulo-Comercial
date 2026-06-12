import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getRedirectUri,
  oauthHtml,
  saveTokenCookies,
  validateOAuthState
} from "@/lib/kommo/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const referrer = searchParams.get("referer") ?? searchParams.get("referrer");

  if (error) {
    return new NextResponse(
      oauthHtml("Autorizacion cancelada", `Kommo respondio: ${error}.`, "error"),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    await validateOAuthState(state);

    if (!code) {
      return new NextResponse(
        oauthHtml("Falta codigo OAuth", "Kommo no envio el parametro code en el callback.", "error"),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const tokenResult = await exchangeCodeForTokens({
      code,
      referrer,
      redirectUri: getRedirectUri(request.nextUrl.origin)
    });

    if (!tokenResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kommo token exchange failed.",
          details: tokenResult.payload
        },
        { status: tokenResult.status }
      );
    }

    await saveTokenCookies(tokenResult.baseUrl, tokenResult.payload);

    return new NextResponse(
      oauthHtml(
        "Kommo conectado",
        "La autorizacion se completo correctamente. Los tokens quedaron guardados en cookies HttpOnly del servidor para esta sesion."
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Kommo OAuth callback failed.";
    return new NextResponse(oauthHtml("No se pudo conectar Kommo", message, "error"), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();

  return NextResponse.json({
    ok: true,
    configured: {
      clientId: Boolean(process.env.KOMMO_CLIENT_ID || process.env.KOMMO_INTEGRATION_ID),
      clientSecret: Boolean(process.env.KOMMO_CLIENT_SECRET),
      redirectUri: Boolean(process.env.KOMMO_REDIRECT_URI),
      baseUrl: Boolean(process.env.KOMMO_BASE_URL || process.env.KOMMO_SUBDOMAIN || cookieStore.get("kommo_base_url")?.value),
      envAccessToken: Boolean(process.env.KOMMO_ACCESS_TOKEN),
      oauthCookie: Boolean(cookieStore.get("kommo_access_token")?.value)
    }
  });
}

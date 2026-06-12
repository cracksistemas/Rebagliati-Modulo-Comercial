import { cookies } from "next/headers";

const STATE_COOKIE = "kommo_oauth_state";
const ACCESS_TOKEN_COOKIE = "kommo_access_token";
const REFRESH_TOKEN_COOKIE = "kommo_refresh_token";
const BASE_URL_COOKIE = "kommo_base_url";

type TokenResponse = {
  token_type?: string;
  expires_in?: number;
  access_token: string;
  refresh_token?: string;
};

function getClientId() {
  const value = process.env.KOMMO_CLIENT_ID?.trim() ?? process.env.KOMMO_INTEGRATION_ID?.trim();
  if (!value) throw new Error("Missing KOMMO_CLIENT_ID or KOMMO_INTEGRATION_ID.");
  return value;
}

function getClientSecret() {
  const value = process.env.KOMMO_CLIENT_SECRET?.trim();
  if (!value) throw new Error("Missing KOMMO_CLIENT_SECRET.");
  return value;
}

export function getRedirectUri(origin: string) {
  return process.env.KOMMO_REDIRECT_URI?.trim() ?? `${origin}/api/kommo/oauth/callback`;
}

export function buildKommoAuthorizeUrl(origin: string, mode = "popup") {
  const state = crypto.randomUUID();
  const authorizeUrl = new URL("https://www.kommo.com/oauth");
  authorizeUrl.searchParams.set("client_id", getClientId());
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("mode", mode);

  return {
    authorizeUrl,
    state,
    redirectUri: getRedirectUri(origin)
  };
}

export async function saveOAuthState(state: string) {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60
  });
}

export async function validateOAuthState(receivedState: string | null) {
  if (process.env.KOMMO_SKIP_STATE_CHECK === "true") return;
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  if (!receivedState || !expectedState || receivedState !== expectedState) {
    throw new Error("Invalid OAuth state.");
  }

  cookieStore.delete(STATE_COOKIE);
}

export function getKommoBaseUrlFromReferrer(referrer: string | null) {
  const fallback = process.env.KOMMO_BASE_URL?.trim();
  if (referrer) {
    const cleanReferrer = referrer.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${cleanReferrer}`;
  }
  if (fallback) return fallback.replace(/\/$/, "");
  const subdomain = process.env.KOMMO_SUBDOMAIN?.trim();
  if (subdomain) return `https://${subdomain}.kommo.com`;
  throw new Error("Missing Kommo account referrer.");
}

export async function exchangeCodeForTokens(params: {
  code: string;
  referrer: string | null;
  redirectUri: string;
}) {
  const baseUrl = getKommoBaseUrlFromReferrer(params.referrer);
  const response = await fetch(`${baseUrl}/oauth2/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri
    }),
    cache: "no-store"
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      baseUrl,
      payload
    };
  }

  return {
    ok: true as const,
    status: response.status,
    baseUrl,
    payload: payload as TokenResponse
  };
}

export async function saveTokenCookies(baseUrl: string, token: TokenResponse) {
  const cookieStore = await cookies();
  const accessMaxAge = Math.max(Number(token.expires_in ?? 86400) - 60, 60);

  cookieStore.set(BASE_URL_COOKIE, baseUrl, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 60 * 60
  });

  cookieStore.set(ACCESS_TOKEN_COOKIE, token.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge
  });

  if (token.refresh_token) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, token.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 90 * 24 * 60 * 60
    });
  }
}

export function oauthHtml(title: string, message: string, status: "ok" | "error" = "ok") {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:#F5F5F7;color:#1D1D1F;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;min-height:100vh}
    main{width:min(520px,92vw);background:#fff;border:1px solid #E5E5EA;border-radius:28px;box-shadow:0 24px 70px rgba(29,29,31,.12);padding:28px}
    .mark{width:54px;height:54px;border-radius:18px;background:${status === "ok" ? "#E5F7FF" : "#FFF0EF"};display:grid;place-items:center;color:${status === "ok" ? "#00A7EB" : "#FF3B30"};font-weight:900;margin-bottom:18px}
    h1{margin:0 0 10px;font-size:30px;letter-spacing:0}
    p{margin:0;color:#74747A;line-height:1.55}
    a{display:inline-flex;margin-top:20px;background:#00A7EB;color:#fff;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:800}
  </style>
</head>
<body>
  <main>
    <div class="mark">${status === "ok" ? "OK" : "!"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/dashboard">Volver al dashboard</a>
  </main>
  <script>
    if (window.opener) {
      window.opener.postMessage({ source: "rebagliati-kommo-oauth", status: "${status}" }, "*");
    }
  </script>
</body>
</html>`;
}

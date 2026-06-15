import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseUrl } from "@/lib/supabase/env";

const publicPaths = new Set([
  "/login",
  "/api/kommo/oauth/callback",
  "/api/kommo/webhook",
  "/api/maintenance/repair-admin-login"
]);

function isPublicPath(pathname: string) {
  return publicPaths.has(pathname) || pathname.startsWith("/api/maintenance/");
}

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/avatars") ||
    pathname.match(/\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|map)$/)
  );
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function isBlockedByRole(pathname: string, role = "") {
  const normalized = role.toLowerCase();
  const isSuperAdmin = normalized.includes("superadministrador") || normalized.includes("admin_sistema");

  if (pathname.startsWith("/api/admin")) {
    return !isSuperAdmin;
  }

  if (pathname.startsWith("/settings")) {
    return !isSuperAdmin;
  }

  if (normalized.includes("ejecutivo") && !normalized.includes("lider")) {
    return (
      pathname.startsWith("/settings") ||
      pathname.startsWith("/executives") ||
      pathname.startsWith("/goals") ||
      pathname.startsWith("/sales/validation")
    );
  }

  if (normalized.includes("marketing") || normalized.includes("solo lectura") || normalized.includes("marketing_soporte")) {
    return (
      pathname.startsWith("/settings") ||
      pathname.startsWith("/executives") ||
      pathname.startsWith("/goals") ||
      pathname.startsWith("/sales/new") ||
      pathname.startsWith("/sales/validation")
    );
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isAssetPath(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname) && isApiPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = getPublicSupabaseUrl();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (!isPublicPath(pathname)) {
      if (isApiPath(pathname)) {
        return NextResponse.json({ ok: false, error: "Supabase no esta configurado en el servidor." }, { status: 503 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (isBlockedByRole(pathname, String(profile?.role ?? ""))) {
      if (isApiPath(pathname)) {
        return NextResponse.json({ ok: false, error: "No tienes permisos para realizar esta accion." }, { status: 403 });
      }
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

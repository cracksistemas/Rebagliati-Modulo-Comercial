"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Target,
  Trophy,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type SessionHeaderProfile = {
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  greeting?: string;
  permissions?: string[];
};

const navItems = [
  { href: "/dashboard", label: "Resumen mensual", icon: LayoutDashboard, permission: "dashboard.resumen" },
  { href: "/sales/new", label: "Registrar venta", icon: CircleDollarSign, permission: "sales.new" },
  { href: "/ranking", label: "Ranking de ejecutivos", icon: Trophy, permission: "ranking.executives" },
  { href: "/teams", label: "Ventas por equipo", icon: UsersRound, permission: "teams.view" },
  { href: "/executives", label: "Ejecutivos", icon: Flag, permission: "executives.manage" },
  { href: "/goals", label: "Metas", icon: Target, permission: "goals.manage" },
  { href: "/sales/validation", label: "Validacion de ventas", icon: ClipboardCheck, permission: "sales.validation" },
  { href: "/customer-map", label: "Mapa de Clientes", icon: BookOpenCheck, permission: "customer-map.view" },
  { href: "/reports", label: "Reportes", icon: BarChart3, permission: "reports.export" },
  { href: "/settings", label: "Configuracion", icon: Settings, permission: "settings.users" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<SessionHeaderProfile | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const title = useMemo(() => {
    if (pathname.includes("customer-map")) return "Mapa de Clientes";
    if (pathname.includes("settings")) return "Configuracion";
    if (pathname.includes("executives")) return "Directorio comercial";
    if (pathname.includes("teams")) return "Ventas por equipo";
    if (pathname.includes("ranking")) return "Ranking de ejecutivos";
    if (pathname.includes("sales")) return "Control de ventas";
    if (pathname.includes("reports")) return "Reportes";
    if (pathname.includes("goals")) return "Metas comerciales";
    return "Ranking de Ventas - Junio 2026";
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/login") return;
    let mounted = true;
    fetch("/api/session/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (mounted && payload?.data) setProfile(payload.data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const visibleNavItems = useMemo(() => {
    if (profile?.permissions?.length) {
      return navItems.filter((item) => profile.permissions?.includes(item.permission));
    }

    const role = profile?.role.toLowerCase() ?? "";
    if (role.includes("ejecutivo") && !role.includes("lider")) {
      return navItems.filter((item) =>
        ["/dashboard", "/sales/new", "/ranking", "/teams", "/customer-map", "/reports"].includes(item.href)
      );
    }
    if (role.includes("marketing") || role.includes("solo lectura") || role.includes("marketing_soporte")) {
      return navItems.filter((item) =>
        ["/dashboard", "/ranking", "/teams", "/customer-map", "/reports"].includes(item.href)
      );
    }
    return navItems;
  }, [profile?.role]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`} style={{ "--sidebar-width": collapsed ? "82px" : "280px" } as React.CSSProperties}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="icon-button" onClick={() => setCollapsed((value) => !value)} aria-label="Contraer barra lateral">
            {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
          </button>
          <div className="brand">
            <div className="brand-mark"><img src="/brand/rebagliati-logo.webp" alt="Rebagliati" /></div>
            <div className="brand-text">
              <strong>Rebagliati</strong>
              <div className="muted" style={{ fontSize: 12 }}>Modulo comercial</div>
            </div>
          </div>
        </div>

        {visibleNavItems.some((item) => item.href === "/sales/new") ? (
          <Link className="primary-button" href="/sales/new">
            <Plus size={18} />
            <span className="nav-label">Registrar venta</span>
          </Link>
        ) : null}

        <div className="sidebar-section">Dashboard</div>
        <nav className="nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link className={`nav-item ${active ? "active" : ""}`} href={item.href} key={item.href} title={item.label}>
                <Icon size={18} />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <BarChart3 size={18} />
          <div>Junio 2026</div>
          <small className="muted">Ranking y control en tiempo real</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel interno</p>
            <h1>{title}</h1>
            {profile?.greeting ? <p className="muted" style={{ marginTop: 8 }}>{profile.greeting}</p> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="badge">Junio 2026</span>
            <span className="badge">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.fullName} style={{ width: 22, height: 22, borderRadius: 999, objectFit: "cover" }} /> : null}
              {profile?.fullName ?? "Gerencia Comercial"}
            </span>
            <button className="danger-button" onClick={logout}>
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

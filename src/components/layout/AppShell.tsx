"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  AlertTriangle,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PackageOpen,
  Plus,
  Settings,
  Target,
  Trophy,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import { Avatar } from "@/components/ui/Avatar";

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
  { href: "/products", label: "Productos y Eventos", icon: PackageOpen, permission: "products.view" },
  { href: "/ranking", label: "Ranking de ejecutivos", icon: Trophy, permission: "ranking.executives" },
  { href: "/teams", label: "Ventas por equipo", icon: UsersRound, permission: "teams.view" },
  { href: "/executives", label: "Ejecutivos", icon: Flag, permission: "executives.manage" },
  { href: "/incidents", label: "Incidencias", icon: AlertTriangle, permission: "incidents.view" },
  { href: "/goals", label: "Metas", icon: Target, permission: "goals.manage" },
  { href: "/training", label: "Academia Comercial", icon: GraduationCap, permission: "training.view" },
  { href: "/sales/validation", label: "Validación de ventas", icon: ClipboardCheck, permission: "sales.validation" },
  { href: "/customer-map", label: "Mapa de Clientes", icon: BookOpenCheck, permission: "customer-map.view" },
  { href: "/reports", label: "Reportes", icon: BarChart3, permission: "reports.export" },
  { href: "/settings", label: "Configuración", icon: Settings, permission: "settings.users" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<SessionHeaderProfile | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const title = useMemo(() => {
    if (pathname.includes("customer-map")) return "Mapa de Clientes";
    if (pathname.includes("settings")) return "Configuración";
    if (pathname.includes("executives")) return "Directorio comercial";
    if (pathname.includes("incidents")) return "Incidencias";
    if (pathname.includes("training")) return "Academia Comercial";
    if (pathname.includes("products")) return "Productos y Eventos";
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

  useEffect(() => {
    if (pathname === "/login") return;
    let mounted = true;
    fetch("/api/commercial/snapshot", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted || !payload?.ok || !payload.data) return;
        const current = getCommercialState();
        const next = {
          ...current,
          teams: Array.isArray(payload.data.teams) ? payload.data.teams : current.teams,
          executives: Array.isArray(payload.data.executives) ? payload.data.executives : current.executives,
          sales: Array.isArray(payload.data.sales) ? payload.data.sales : current.sales
        };
        setCommercialState(next);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/login") return;
    let mounted = true;
    fetch("/api/commercial/options", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted || !payload?.ok || !payload.data) return;
        const current = getCommercialState();
        const next = {
          ...current,
          programs: Array.isArray(payload.data.programs) ? payload.data.programs : current.programs,
          discounts: Array.isArray(payload.data.discounts) ? payload.data.discounts : current.discounts,
          leadSources: Array.isArray(payload.data.leadSources) ? payload.data.leadSources : current.leadSources,
          paymentMethods: Array.isArray(payload.data.paymentMethods) ? payload.data.paymentMethods : current.paymentMethods
        };
        setCommercialState(next);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const visibleNavItems = useMemo(() => {
    const role = profile?.role.toLowerCase() ?? "";
    if (role.includes("super") || role.includes("admin_sistema")) return navItems;
    if (profile?.permissions?.length) {
      return navItems.filter((item) => profile.permissions?.includes(item.permission));
    }

    if (role.includes("ejecutivo") && !role.includes("lider")) {
      return navItems.filter((item) =>
        ["/dashboard", "/sales/new", "/products", "/ranking", "/teams", "/incidents", "/training", "/customer-map", "/reports"].includes(item.href)
      );
    }
    if (role.includes("marketing") || role.includes("solo lectura") || role.includes("marketing_soporte")) {
      return navItems.filter((item) =>
        ["/dashboard", "/products", "/ranking", "/teams", "/incidents", "/training", "/customer-map", "/reports"].includes(item.href)
      );
    }
    return navItems;
  }, [profile?.permissions, profile?.role]);

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
            <p className="muted" style={{ marginTop: 8 }}>
              {timeGreeting()} {profile?.fullName ? profile.fullName.split(" ")[0] : "equipo"}. {profile?.greeting ?? "Revisa tus prioridades comerciales del día."}
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">Junio 2026</span>
            <span className="badge">
              <Avatar src={profile?.avatarUrl} name={profile?.fullName ?? "Usuario"} size="sm" />
              {profile?.fullName ?? "Gerencia Comercial"}
            </span>
            <NotificationCenter profileName={profile?.fullName ?? "Usuario"} role={profile?.role ?? ""} />
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

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

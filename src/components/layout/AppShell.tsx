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
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Resumen mensual", icon: LayoutDashboard },
  { href: "/sales/new", label: "Registrar venta", icon: CircleDollarSign },
  { href: "/ranking", label: "Ranking de ejecutivos", icon: Trophy },
  { href: "/teams", label: "Ventas por equipo", icon: UsersRound },
  { href: "/executives", label: "Ejecutivos", icon: Flag },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/sales/validation", label: "Validacion de ventas", icon: ClipboardCheck },
  { href: "/customer-map", label: "Mapa de Clientes", icon: BookOpenCheck },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/settings", label: "Configuracion", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") {
    return <>{children}</>;
  }

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
            <div className="brand-mark">R</div>
            <div className="brand-text">
              <strong>Rebagliati</strong>
              <div className="muted" style={{ fontSize: 12 }}>Modulo comercial</div>
            </div>
          </div>
        </div>

        <Link className="primary-button" href="/sales/new">
          <Plus size={18} />
          <span className="nav-label">Registrar venta</span>
        </Link>

        <div className="sidebar-section">Dashboard</div>
        <nav className="nav">
          {navItems.map((item) => {
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
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="badge">Junio 2026</span>
            <span className="badge">Gerencia Comercial</span>
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

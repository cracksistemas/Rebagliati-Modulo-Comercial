"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, ClipboardList, Crown, Flag, LayoutDashboard, LineChart, PanelLeftClose, PanelLeftOpen, Plus, Settings, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loadCurrentProfile } from "@/lib/supabase/auth";
import { can } from "@/lib/security/permissions";

const navItems = [
  { href: "/dashboard", label: "Resumen mensual", icon: LayoutDashboard },
  { href: "/sales/new", label: "Registrar venta", icon: ClipboardList },
  { href: "/ranking", label: "Ranking de ejecutivos", icon: Crown },
  { href: "/teams", label: "Ventas por equipo", icon: UsersRound },
  { href: "/customer-map", label: "Mapa de Clientes", icon: Target },
  { href: "/executives", label: "Ejecutivos", icon: Flag },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/sales/validation", label: "Validacion de ventas", icon: CheckCircle2 },
  { href: "/reports", label: "Reportes", icon: LineChart },
  { href: "/settings", label: "Configuracion", icon: Settings }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const [canManageSettings, setCanManageSettings] = useState(false);

  useEffect(() => {
    loadCurrentProfile()
      .then((profile) => setCanManageSettings(profile ? can(profile.role, "settings:manage") || can(profile.role, "audit:read") : false))
      .catch(() => setCanManageSettings(false));
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="brand-block">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          title={collapsed ? "Mostrar menu" : "Ocultar menu"}
          aria-label={collapsed ? "Mostrar menu" : "Ocultar menu"}
        >
          <ToggleIcon size={19} />
        </button>
        <div className="brand-logo">
          <img src="/brand/rebagliati-logo.webp" alt="Rebagliati Diplomados" />
        </div>
        <div className="brand-copy">
          <strong>Rebagliati</strong>
          <span>Modulo comercial</span>
        </div>
      </div>
      <Link className="primary-nav-action" href="/sales/new" title="Registrar venta">
        <Plus size={18} />
        <span className="sidebar-label">Registrar venta</span>
      </Link>
      <nav className="nav-list" aria-label="Navegacion comercial">
        <p className="nav-title sidebar-label">Dashboard</p>
        {navItems.filter((item) => item.href !== "/settings" || canManageSettings).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link className={`nav-link ${active ? "is-active" : ""}`} href={item.href} key={item.href} title={item.label}>
              <Icon size={18} />
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-summary">
        <BarChart3 size={18} />
        <div className="sidebar-label">
          <strong>Junio 2026</strong>
          <span>Ranking y control en tiempo real</span>
        </div>
      </div>
    </aside>
  );
}

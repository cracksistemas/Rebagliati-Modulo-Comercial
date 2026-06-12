"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("reba-sidebar-collapsed") === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("reba-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className={`app-grid ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className="main-region">
        <Topbar />
        <div className="page-stack fade-in">{children}</div>
      </main>
    </div>
  );
}

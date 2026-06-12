import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
}

export function KpiCard({ label, value, helper, icon }: KpiCardProps) {
  return (
    <article className="card kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div>
        <p className="metric-label">{label}</p>
        <p className="metric-value">{value}</p>
        <span>{helper}</span>
      </div>
    </article>
  );
}

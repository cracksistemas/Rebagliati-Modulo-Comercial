"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Clock3, Target, TrendingUp } from "lucide-react";
import { ExecutiveBattleCard } from "@/components/dashboard/ExecutiveBattleCard";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ProductMixChart } from "@/components/dashboard/ProductMixChart";
import { TeamContributionCard } from "@/components/dashboard/TeamContributionCard";
import { RankingTable } from "@/components/ranking/RankingTable";
import { currency, number } from "@/lib/metrics/format";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import {
  getCompanyGoalProgress,
  getDailyAccumulatedFromData,
  getExecutiveRankingFromData,
  getPendingValidationCountFromData,
  getProductMixFromData,
  getTeamRankingFromData,
  loadLinkedCommercialData,
  type LinkedCommercialData
} from "@/lib/commercial/linked-data";

export function LinkedDashboard() {
  const [data, setData] = useState<LinkedCommercialData | null>(null);

  useEffect(() => {
    const refresh = () => loadLinkedCommercialData().then(setData);
    refresh();
    return subscribeCommercialDataChange(refresh);
  }, []);

  if (!data) {
    return <section className="card card-pad">Cargando indicadores comerciales...</section>;
  }

  const progress = getCompanyGoalProgress(data);
  const ranking = getExecutiveRankingFromData(data);
  const teamRanking = getTeamRankingFromData(data);
  const dailyTrend = getDailyAccumulatedFromData(data);
  const lastTrend = dailyTrend.at(-1);
  const pendingCount = getPendingValidationCountFromData(data);
  const responseTime = getAverageResponseTimeLabel(data);

  return (
    <>
      <section className="section-grid grid-4">
        <KpiCard label="Meta mensual" value={currency(progress.goalAmount)} helper="Objetivo comercial del mes" icon={<Target size={22} />} />
        <KpiCard label="Acumulado" value={currency(progress.accumulated)} helper="Solo ventas validadas" icon={<Banknote size={22} />} />
        <KpiCard label="Avance" value={`${progress.progressPct.toFixed(2)}%`} helper={`Brecha ${currency(progress.gap)}`} icon={<TrendingUp size={22} />} />
        <KpiCard label="Tiempo respuesta" value={responseTime} helper="Promedio comercial objetivo" icon={<Clock3 size={22} />} />
      </section>

      <RankingTable items={ranking.slice(0, 8)} />

      <section className="section-grid grid-2">
        <ExecutiveBattleCard contenders={ranking.slice(0, 2)} />
        <article className="card card-pad">
          <div className="toolbar">
            <div>
              <p className="eyebrow">Ventas por equipo</p>
              <h2>Ranking por equipos</h2>
            </div>
            <span className="pill">Top comercial</span>
          </div>
          <div className="section-grid" style={{ marginTop: 18 }}>
            {teamRanking.map((team) => <TeamContributionCard team={team} key={team.teamId} />)}
          </div>
        </article>
      </section>

      <section className="section-grid grid-2">
        <article className="card card-pad">
          <div className="toolbar">
            <div>
              <p className="eyebrow">Alertas</p>
              <h2>Seguimiento comercial</h2>
            </div>
            <span className="pill">{number(pendingCount)} pendientes</span>
          </div>
          <div className="dashboard-alert-list">
            <DashboardAlert label="Ventas pendientes u observadas" value={pendingCount} tone={pendingCount ? "warning" : "success"} />
            <DashboardAlert label="Brecha contra meta mensual" value={currency(progress.gap)} tone={progress.gap > 0 ? "accent" : "success"} />
            <DashboardAlert label="Fuente de datos" value={data.source === "supabase" ? "Supabase" : "Local"} tone="neutral" />
          </div>
        </article>
        <div className="section-grid">
          <article className="card card-pad">
            <p className="eyebrow">Tendencia diaria</p>
            <h2 style={{ margin: 0 }}>Acumulado al {lastTrend?.date ?? "mes"}</h2>
            <p className="metric-value">{currency(lastTrend?.amount ?? 0)}</p>
            <p className="muted">Se recalcula desde ventas validadas guardadas.</p>
            <div className="daily-trend-bars">
              {dailyTrend.slice(-10).map((item) => (
                <span key={item.date} title={`${item.date} · ${currency(item.amount)}`} style={{ height: `${Math.max(8, Math.min(100, (item.amount / Math.max(lastTrend?.amount ?? 1, 1)) * 100))}%` }} />
              ))}
            </div>
          </article>
          <GoalProgress {...progress} />
          <ProductMixChart items={getProductMixFromData(data)} />
        </div>
      </section>
    </>
  );
}

function DashboardAlert({ label, value, tone }: { label: string; value: string | number; tone: "warning" | "success" | "accent" | "neutral" }) {
  return (
    <div className={`dashboard-alert dashboard-alert-${tone}`}>
      <AlertTriangle size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getAverageResponseTimeLabel(data: LinkedCommercialData) {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem("reba-average-response-time") : null;
  if (stored) return stored;
  const pendingWeight = getPendingValidationCountFromData(data);
  const seconds = Math.max(180, 462 + pendingWeight * 18);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}m ${String(rest).padStart(2, "0")}s`;
}

"use client";

import { AlertTriangle, ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCommercialState, getValidatedSales, money } from "@/lib/commercial/store";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import type { CommercialState, Executive } from "@/lib/commercial/types";

function initials(name: string) {
  return (name || "NA")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function rankExecutives(state: CommercialState) {
  return [...state.executives]
    .filter((item) => item.status === "Activo")
    .sort((a, b) => b.points - a.points || b.currentSales - a.currentSales);
}

function BattleCard({ leaders, total }: { leaders: Executive[]; total: number }) {
  const [first, second] = leaders;
  if (!first || !second) return null;
  const firstPercent = total ? (first.currentSales / (first.currentSales + second.currentSales)) * 100 : 50;
  const secondPercent = 100 - firstPercent;

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {[first, second].map((item, index) => {
              const pct = Number.isFinite(index === 0 ? firstPercent : secondPercent) ? (index === 0 ? firstPercent : secondPercent) : 0;
          return (
            <div key={item.id} style={{ flex: 1, textAlign: "center" }}>
              {item.photoUrl ? <img className="avatar" src={item.photoUrl} alt={item.fullName} style={{ width: 92, height: 92, margin: "0 auto 12px" }} /> : <div className="avatar" style={{ width: 92, height: 92, margin: "0 auto 12px" }}>{initials(item.fullName)}</div>}
              <div style={{ fontSize: "2.3rem", fontWeight: 950, color: index === 0 ? "#01017B" : "#00A7EB" }}>{pct.toFixed(3)}%</div>
              <h3 style={{ marginBottom: 4 }}>{item.fullName}</h3>
              <p className="muted">{item.points} puntos · {money(item.currentSales)}</p>
              <div className="progress"><span style={{ width: `${pct}%`, background: index === 0 ? "#01017B" : "#00A7EB" }} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardView() {
  const [state, setState] = useState(getCommercialState);

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const metrics = useMemo(() => {
    const validated = getValidatedSales(state);
    const accumulated = validated.reduce((sum, sale) => sum + sale.netAmount, 0) || state.executives.reduce((sum, item) => sum + item.currentSales, 0);
    const progress = state.companyGoal ? (accumulated / state.companyGoal) * 100 : 0;
    return {
      accumulated,
      progress,
      gap: Math.max(state.companyGoal - accumulated, 0),
      pending: state.sales.filter((sale) => sale.validationStatus === "pendiente_validacion").length
    };
  }, [state]);

  const ranking = rankExecutives(state);
  const totalExecutives = ranking.reduce((sum, item) => sum + item.currentSales, 0);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="grid grid-4">
        <div className="card metric"><span className="muted">Meta mensual</span><strong>{money(state.companyGoal)}</strong></div>
        <div className="card metric"><span className="muted">Acumulado</span><strong>{money(metrics.accumulated)}</strong></div>
        <div className="card metric"><span className="muted">Avance</span><strong>{metrics.progress.toFixed(2)}%</strong><div className="progress"><span style={{ width: `${Math.min(metrics.progress, 100)}%` }} /></div></div>
        <div className="card metric"><span className="muted">Tiempo respuesta</span><strong>{state.avgResponseTime}</strong></div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <p className="eyebrow">Ranking ejecutivos</p>
          <h2>Top comercial</h2>
          <div className="grid">
            {ranking.slice(0, 5).map((item, index) => {
              const movement = (item.previousRank ?? index + 1) - (index + 1);
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <strong style={{ width: 34 }}>#{index + 1}</strong>
                  {item.photoUrl ? <img className="avatar" src={item.photoUrl} alt={item.fullName} /> : <div className="avatar">{initials(item.fullName)}</div>}
                  <div style={{ flex: 1 }}>
                    <strong>{item.fullName}</strong>
                    <div className="muted">{state.teams.find((team) => team.id === item.teamId)?.name ?? "Sin equipo"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{item.points} pts</strong>
                    <div className="muted">{totalExecutives ? ((item.currentSales / totalExecutives) * 100).toFixed(1) : "0.0"}%</div>
                  </div>
                  <span className="badge" style={{ color: movement >= 0 ? "#34C759" : "#FF3B30" }}>
                    {movement >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {Math.abs(movement)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <BattleCard leaders={ranking.slice(0, 2)} total={totalExecutives} />
      </section>

      <section className="grid grid-3">
        <div className="card">
          <p className="eyebrow">Ventas por equipo</p>
          <h2>Aporte por equipo</h2>
          <div className="grid">
            {state.teams.map((team) => {
              const amount = state.executives.filter((item) => item.teamId === team.id).reduce((sum, item) => sum + item.currentSales, 0);
              return (
                <div key={team.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{team.name}</strong>
                    <span>{money(amount)}</span>
                  </div>
                  <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${team.goalAmount ? Math.min((amount / team.goalAmount) * 100, 100) : 0}%`, background: team.color }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Alertas</p>
          <h2>Validacion</h2>
          <p className="badge"><AlertTriangle size={16} /> {metrics.pending} ventas pendientes</p>
          <p className="muted">Las ventas pendientes no impactan el ranking oficial hasta validarse.</p>
        </div>
        <div className="card">
          <p className="eyebrow">Tendencia diaria</p>
          <h2>Acumulado</h2>
          <div style={{ height: 150, display: "flex", alignItems: "end", gap: 10 }}>
            {[32, 44, 38, 58, 71, 62, 84, 92].map((height, index) => (
              <div key={index} style={{ flex: 1, height: `${height}%`, borderRadius: 999, background: index === 7 ? "#00A7EB" : "#dfe6ee" }} />
            ))}
          </div>
          <p className="muted" style={{ marginTop: 12 }}><TrendingUp size={16} /> Brecha: {money(metrics.gap)}</p>
        </div>
      </section>
    </div>
  );
}

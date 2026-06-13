"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Download, Link2, TrendingUp } from "lucide-react";
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

type KommoResponseMetric = {
  connected: boolean;
  status: string;
  averageResponseLabel: string;
  averageResponseSeconds: number;
  samples: number;
  lastSyncedAt: string;
  activeDialogs: number;
  byTeam: Array<{
    id: string;
    name: string;
    avgReplyFormatted: string;
    answeredWindows: number;
    unansweredDialogs: number;
    slaCompliance: number;
  }>;
  byUser: Array<{
    id: string;
    name: string;
    teamName?: string;
    avgReplyFormatted: string;
    answeredWindows: number;
    unansweredDialogs: number;
    slaCompliance: number;
  }>;
};

function formatLastSync(value?: string) {
  if (!value) return "Sin sincronizar";
  try {
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "Sin sincronizar";
  }
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
  const [kommoMetric, setKommoMetric] = useState<KommoResponseMetric | null>(null);
  const [kommoOpen, setKommoOpen] = useState(false);

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  useEffect(() => {
    let mounted = true;
    async function loadKommoMetric() {
      try {
        const response = await fetch(`/api/kommo/metrics/response-time?from=2026-06-01&to=2026-06-30&ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();
        if (mounted && payload?.data) setKommoMetric(payload.data);
      } catch {
        if (mounted) {
          setKommoMetric({
            connected: false,
            status: "Pendiente de sincronizacion",
            averageResponseLabel: state.avgResponseTime,
            averageResponseSeconds: 462,
            samples: 0,
            lastSyncedAt: new Date().toISOString(),
            activeDialogs: 0,
            byTeam: [],
            byUser: []
          });
        }
      }
    }
    loadKommoMetric();
    const interval = window.setInterval(loadKommoMetric, 5 * 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [state.avgResponseTime]);

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
  const incidentSummary = useMemo(() => {
    const graves = state.incidents.filter((item) => item.severity === "Grave" || item.severity === "Critica").length;
    const pendientes = state.incidents.filter((item) => item.status !== "Cerrado" && item.status !== "Corregido").length;
    const criticalExecutive = state.executives.find((executive) => {
      const items = state.incidents.filter((incident) => incident.executiveId === executive.id);
      return items.length >= 3 || items.some((incident) => incident.severity === "Grave" || incident.severity === "Critica");
    });
    return { total: state.incidents.length, graves, pendientes, criticalExecutive: criticalExecutive?.fullName ?? "Sin criticos" };
  }, [state.executives, state.incidents]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={() => setKommoOpen(true)}><Link2 size={16} /> Tiempos Kommo</button>
        <button className="primary-button" onClick={() => window.print()}><Download size={16} /> Descargar PDF</button>
      </section>
      <section className="grid grid-4">
        <div className="card metric"><span className="muted">Meta mensual</span><strong>{money(state.companyGoal)}</strong></div>
        <div className="card metric"><span className="muted">Acumulado</span><strong>{money(metrics.accumulated)}</strong></div>
        <div className="card metric"><span className="muted">Avance</span><strong>{metrics.progress.toFixed(2)}%</strong><div className="progress"><span style={{ width: `${Math.min(metrics.progress, 100)}%` }} /></div></div>
        <div className="card metric">
          <span className="muted">Tiempo respuesta</span>
          <strong>{kommoMetric?.averageResponseLabel ?? state.avgResponseTime}</strong>
          <span className="badge" style={{ width: "fit-content" }}>
            <Link2 size={14} />
            {kommoMetric?.connected ? `${kommoMetric.samples} respuestas` : "Pendiente de sincronizacion"}
          </span>
          <small className="muted">Ultima sync: {formatLastSync(kommoMetric?.lastSyncedAt)}</small>
        </div>
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
          <p className="badge"><Link2 size={16} /> CRM: {kommoMetric?.connected ? "Mensajes sincronizados" : "Pendiente"}</p>
          <p className="badge"><AlertTriangle size={16} /> {incidentSummary.total} incidencias del mes</p>
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
      <section className="grid grid-3">
        <div className="card">
          <p className="eyebrow">Incidencias</p>
          <h2>Control del mes</h2>
          <div className="grid">
            <p className="badge"><AlertTriangle size={16} /> Total: {incidentSummary.total}</p>
            <p className="badge">Graves: {incidentSummary.graves}</p>
            <p className="badge">Pendientes: {incidentSummary.pendientes}</p>
            <p className="muted">Ejecutivo en estado critico: {incidentSummary.criticalExecutive}</p>
          </div>
        </div>
      </section>
      {kommoOpen ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(760px, 94vw)" }}>
            <p className="eyebrow">CRM Kommo</p>
            <h2>Tiempos de respuesta por usuario</h2>
            <p className="muted">Calculado con mensajes reales: entrante del cliente y primera respuesta saliente posterior. Ultima sync: {formatLastSync(kommoMetric?.lastSyncedAt)}.</p>
            <table className="table">
              <thead><tr><th>Usuario</th><th>Equipo</th><th>Tiempo promedio</th><th>Respuestas</th><th>SLA</th></tr></thead>
              <tbody>
                {(kommoMetric?.byUser.length ? kommoMetric.byUser : []).map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.teamName ?? "Sin equipo"}</td>
                    <td>{user.avgReplyFormatted}</td>
                    <td>{user.answeredWindows}</td>
                    <td>{user.slaCompliance}%</td>
                  </tr>
                ))}
                {!kommoMetric?.byUser.length ? (
                  <tr>
                    <td colSpan={5} className="muted">Aun no hay mensajes sincronizados por usuario.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <h3 style={{ marginTop: 18 }}>Resumen por equipo</h3>
            <table className="table">
              <thead><tr><th>Equipo</th><th>Tiempo promedio</th><th>Respuestas</th><th>SLA</th></tr></thead>
              <tbody>
                {(kommoMetric?.byTeam.length ? kommoMetric.byTeam : []).map((team) => (
                  <tr key={team.id}>
                    <td><strong>{team.name}</strong></td>
                    <td>{team.avgReplyFormatted}</td>
                    <td>{team.answeredWindows}</td>
                    <td>{team.slaCompliance}%</td>
                  </tr>
                ))}
                {!kommoMetric?.byTeam.length ? (
                  <tr>
                    <td colSpan={4} className="muted">Aun no hay mensajes sincronizados por equipo.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="primary-button" onClick={() => setKommoOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

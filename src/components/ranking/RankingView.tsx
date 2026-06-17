"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money } from "@/lib/commercial/store";
import { Avatar } from "@/components/ui/Avatar";

export function RankingView() {
  const [state, setState] = useState(getCommercialState);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const ranking = useMemo(
    () => [...state.executives].filter((item) => item.status === "Activo").sort((a, b) => b.points - a.points || b.currentSales - a.currentSales),
    [state.executives]
  );
  const total = ranking.reduce((sum, item) => sum + item.currentSales, 0);

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Ranking vertical</p>
          <h2>Ejecutivos comerciales</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Mes", "Semana", "Equipo", "Tipo", "Turno", "Estado"].map((filter) => <span className="badge" key={filter}>{filter}</span>)}
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Posicion</th>
            <th>Ejecutivo</th>
            <th>Equipo</th>
            <th>Ventas</th>
            <th>Puntos</th>
            <th>Monto</th>
            <th>Aporte</th>
            <th>Variacion</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((item, index) => {
            const movement = (item.previousRank ?? index + 1) - (index + 1);
            const team = state.teams.find((entry) => entry.id === item.teamId);
            return (
              <tr key={item.id}>
                <td><strong>#{index + 1}</strong></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar src={item.photoUrl} name={item.fullName} />
                    <strong>{item.fullName}</strong>
                  </div>
                </td>
                <td>{team?.name ?? "Sin equipo"}</td>
                <td>{Math.round(item.currentSales / 900)}</td>
                <td>{item.points}</td>
                <td>{money(item.currentSales)}</td>
                <td>{total ? ((item.currentSales / total) * 100).toFixed(1) : "0"}%</td>
                <td>
                  <span className="badge" style={{ color: movement > 0 ? "#34C759" : movement < 0 ? "#FF3B30" : "#74747A" }}>
                    {movement > 0 ? <ArrowUp size={14} /> : movement < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
                    {movement === 0 ? "Igual" : `${Math.abs(movement)} puestos`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

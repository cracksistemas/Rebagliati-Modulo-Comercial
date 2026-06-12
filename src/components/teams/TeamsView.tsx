"use client";

import { Pencil, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, upsertTeam } from "@/lib/commercial/store";
import type { Team } from "@/lib/commercial/types";

const emptyTeam: Team = {
  id: "",
  name: "",
  color: "#00A7EB",
  goalAmount: 0,
  active: true
};

export function TeamsView() {
  const [state, setState] = useState(getCommercialState);
  const [editing, setEditing] = useState<Team | null>(null);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const total = useMemo(() => state.executives.reduce((sum, item) => sum + item.currentSales, 0), [state.executives]);

  function openEditor(team?: Team) {
    setEditing(team ?? { ...emptyTeam, id: crypto.randomUUID() });
  }

  return (
    <div className="grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Ventas por equipo</p>
            <h2>Equipos comerciales</h2>
          </div>
          <button className="primary-button" onClick={() => openEditor()}><Plus size={18} /> Crear equipo</button>
        </div>
      </section>

      <section className="grid grid-3">
        {state.teams.map((team) => {
          const members = state.executives.filter((item) => item.teamId === team.id && item.status === "Activo");
          const amount = members.reduce((sum, item) => sum + item.currentSales, 0);
          const leader = state.executives.find((item) => item.id === team.leaderId);
          return (
            <article className="card" key={team.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <span className="badge" style={{ background: `${team.color}22`, color: team.color }}><Users size={15} /> {members.length} integrantes</span>
                  <h2 style={{ marginTop: 12 }}>{team.name}</h2>
                  <p className="muted">Lider: {leader?.fullName ?? "Sin lider"}</p>
                </div>
                <button className="icon-button" onClick={() => openEditor(team)} title="Editar equipo"><Pencil size={16} /></button>
              </div>
              <div className="grid" style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Acumulado</span><strong>{money(amount)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Puntos</span><strong>{members.reduce((sum, item) => sum + item.points, 0)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Aporte total</span><strong>{total ? ((amount / total) * 100).toFixed(1) : "0"}%</strong></div>
                <div className="progress"><span style={{ width: `${Math.min((amount / team.goalAmount) * 100, 100)}%`, background: team.color }} /></div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Ver integrantes", "Ver ventas", "Ranking interno", "Mix productos"].map((action) => <span className="badge" key={action}>{action}</span>)}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="eyebrow">Equipo comercial</p>
            <h2>{editing.name || "Nuevo equipo"}</h2>
            <div className="form-grid">
              <div className="field">
                <label>Nombre del equipo</label>
                <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
              </div>
              <div className="field">
                <label>Lider del equipo</label>
                <select value={editing.leaderId ?? ""} onChange={(event) => setEditing({ ...editing, leaderId: event.target.value })}>
                  <option value="">Sin lider</option>
                  {state.executives.map((executive) => <option key={executive.id} value={executive.id}>{executive.fullName}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Color del equipo</label>
                <input type="color" value={editing.color} onChange={(event) => setEditing({ ...editing, color: event.target.value })} />
              </div>
              <div className="field">
                <label>Meta mensual</label>
                <input type="number" value={editing.goalAmount} onChange={(event) => setEditing({ ...editing, goalAmount: Number(event.target.value) })} />
              </div>
              <div className="field">
                <label>Estado</label>
                <select value={editing.active ? "Activo" : "Inactivo"} onChange={(event) => setEditing({ ...editing, active: event.target.value === "Activo" })}>
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <p className="eyebrow">Ejecutivos asignados</p>
              <div className="grid grid-2">
                {state.executives.map((executive) => (
                  <label key={executive.id} className="card" style={{ boxShadow: "none", display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={executive.teamId === editing.id}
                      readOnly
                    />
                    <span>{executive.fullName}</span>
                    <span className="muted">{money(executive.currentSales)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={() => { upsertTeam(editing); setEditing(null); }}>Guardar equipo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

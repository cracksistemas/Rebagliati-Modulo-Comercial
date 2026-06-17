"use client";

import { ClipboardList, PieChart, Trophy, Pencil, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, setCommercialState } from "@/lib/commercial/store";
import type { Executive, Team, UserProfile } from "@/lib/commercial/types";
import { Avatar } from "@/components/ui/Avatar";

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
  const [editingMembers, setEditingMembers] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [detail, setDetail] = useState<{ team: Team; view: "members" | "sales" | "ranking" | "mix" } | null>(null);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const total = useMemo(() => state.executives.reduce((sum, item) => sum + item.currentSales, 0), [state.executives]);
  const uniqueExecutives = useMemo(() => dedupeExecutives(state.executives).filter((item) => item.status !== "Baja"), [state.executives]);
  const leaderOptions = useMemo(() => buildLeaderOptions(state.users, uniqueExecutives), [state.users, uniqueExecutives]);

  useEffect(() => {
    let alive = true;
    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        const payload = (await response.json()) as { ok?: boolean; data?: { users?: UserProfile[] } };
        if (!alive || !response.ok || !payload.ok || !payload.data?.users) return;
        setState((current) => {
          const next = { ...current, users: dedupeUsers(payload.data?.users ?? []) };
          setCommercialState(next);
          return next;
        });
      } catch {
        // Si no tiene permisos administrativos, se usan los ejecutivos visibles.
      }
    }
    loadUsers();
    return () => {
      alive = false;
    };
  }, []);

  function openEditor(team?: Team) {
    const draft = team ?? { ...emptyTeam, id: crypto.randomUUID() };
    setEditing(draft);
    setEditingMembers(uniqueExecutives.filter((executive) => executive.teamId === draft.id).map((executive) => executive.id));
    setSaveStatus("");
  }

  function teamMembers(team: Team) {
    return uniqueExecutives.filter((item) => item.teamId === team.id && item.status === "Activo");
  }

  function teamSales(team: Team) {
    return state.sales.filter((sale) => sale.teamId === team.id);
  }

  function teamMix(team: Team) {
    const sales = teamSales(team);
    const totalAmount = sales.reduce((sum, sale) => sum + sale.netAmount, 0);
    return ["Curso", "Curso Modular", "Diplomado"].map((type) => {
      const items = sales.filter((sale) => sale.productType === type);
      const amount = items.reduce((sum, sale) => sum + sale.netAmount, 0);
      return {
        type,
        quantity: items.reduce((sum, sale) => sum + sale.quantity, 0),
        amount,
        percent: totalAmount ? (amount / totalAmount) * 100 : 0
      };
    });
  }

  function toggleMember(executiveId: string) {
    setEditingMembers((current) => current.includes(executiveId) ? current.filter((id) => id !== executiveId) : [...current, executiveId]);
  }

  async function saveTeam() {
    if (!editing) return;
    setSaveStatus("Guardando equipo...");
    try {
      const response = await fetch("/api/commercial/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editing, memberIds: editingMembers })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: { team?: Team; memberIds?: string[] } };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo guardar el equipo.");

      const savedTeam = payload.data?.team ?? editing;
      const memberIds = new Set(payload.data?.memberIds ?? editingMembers);
      const next = {
        ...state,
        teams: state.teams.some((team) => team.id === savedTeam.id) ? state.teams.map((team) => (team.id === savedTeam.id ? savedTeam : team)) : [savedTeam, ...state.teams],
        executives: uniqueExecutives.map((executive) => {
          if (memberIds.has(executive.id)) return { ...executive, teamId: savedTeam.id };
          if (executive.teamId === savedTeam.id) return { ...executive, teamId: "" };
          return executive;
        })
      };
      setState(next);
      setCommercialState(next);
      setEditing(null);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "No se pudo guardar el equipo.");
    }
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
          const members = teamMembers(team);
          const amount = members.reduce((sum, item) => sum + item.currentSales, 0);
          const leader = uniqueExecutives.find((item) => item.id === team.leaderId);
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
                  <button className="ghost-button" onClick={() => setDetail({ team, view: "members" })}><Users size={15} /> Ver integrantes</button>
                  <button className="ghost-button" onClick={() => setDetail({ team, view: "sales" })}><ClipboardList size={15} /> Ver ventas</button>
                  <button className="ghost-button" onClick={() => setDetail({ team, view: "ranking" })}><Trophy size={15} /> Ranking interno</button>
                  <button className="ghost-button" onClick={() => setDetail({ team, view: "mix" })}><PieChart size={15} /> Mix productos</button>
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
                  {leaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                {uniqueExecutives.map((executive) => (
                  <label key={executive.id} className="card" style={{ boxShadow: "none", display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={editingMembers.includes(executive.id)}
                      onChange={() => toggleMember(executive.id)}
                    />
                    <span>{executive.fullName}</span>
                    <span className="muted">{money(executive.currentSales)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={saveTeam}>Guardar equipo</button>
            </div>
            {saveStatus ? <p className="muted" style={{ marginTop: 10 }}>{saveStatus}</p> : null}
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <p className="eyebrow">Ventas por equipo</p>
                <h2>{detail.team.name}</h2>
              </div>
              <button className="ghost-button" onClick={() => setDetail(null)}>Cerrar</button>
            </div>

            {detail.view === "members" ? (
              <section className="grid" style={{ marginTop: 16 }}>
                <h3>Integrantes</h3>
                {teamMembers(detail.team).map((member) => (
                  <div className="card" style={{ boxShadow: "none", display: "flex", alignItems: "center", gap: 12 }} key={member.id}>
                    <Avatar src={member.photoUrl} name={member.fullName} />
                    <div style={{ flex: 1 }}>
                      <strong>{member.fullName}</strong>
                      <p className="muted">{member.code} - {member.shift} - {member.status}</p>
                    </div>
                    <span className="badge">{money(member.currentSales)}</span>
                    <span className="badge">{member.points} pts</span>
                  </div>
                ))}
              </section>
            ) : null}

            {detail.view === "sales" ? (
              <section style={{ marginTop: 16 }}>
                <h3>Ventas registradas</h3>
                <table className="table">
                  <thead><tr><th>Fecha</th><th>Ejecutivo</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Neto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {teamSales(detail.team).map((sale) => (
                      <tr key={sale.id}>
                        <td>{sale.saleDate}</td>
                        <td>{uniqueExecutives.find((item) => item.id === sale.executiveId)?.fullName ?? "Sin ejecutivo"}</td>
                        <td>{sale.productName}</td>
                        <td>{sale.productType}</td>
                        <td>{sale.quantity}</td>
                        <td>{money(sale.netAmount)}</td>
                        <td><span className="badge">{sale.validationStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!teamSales(detail.team).length ? <p className="muted">Este equipo aun no tiene ventas registradas.</p> : null}
              </section>
            ) : null}

            {detail.view === "ranking" ? (
              <section className="grid" style={{ marginTop: 16 }}>
                <h3>Ranking interno</h3>
                {[...teamMembers(detail.team)].sort((a, b) => b.points - a.points || b.currentSales - a.currentSales).map((member, index) => (
                  <div className="card" style={{ boxShadow: "none", display: "flex", alignItems: "center", gap: 12 }} key={member.id}>
                    <strong style={{ width: 36 }}>#{index + 1}</strong>
                    <Avatar src={member.photoUrl} name={member.fullName} />
                    <div style={{ flex: 1 }}>
                      <strong>{member.fullName}</strong>
                      <p className="muted">{money(member.currentSales)} acumulado</p>
                    </div>
                    <span className="badge">{member.points} pts</span>
                  </div>
                ))}
              </section>
            ) : null}

            {detail.view === "mix" ? (
              <section className="grid" style={{ marginTop: 16 }}>
                <h3>Mix de productos</h3>
                {teamMix(detail.team).map((item) => (
                  <div key={item.type}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{item.type}</strong>
                      <span>{item.quantity} ventas - {money(item.amount)} - {item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${Math.min(item.percent, 100)}%`, background: detail.team.color }} /></div>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function dedupeExecutives(executives: Executive[]) {
  const byKey = new Map<string, Executive>();
  executives.forEach((executive) => {
    const key = executive.id || executive.fullName.trim().toLowerCase();
    const existing = byKey.get(key);
    if (!existing || existing.status === "Baja") byKey.set(key, executive);
  });
  return Array.from(byKey.values());
}

function dedupeUsers(users: UserProfile[]) {
  const byEmail = new Map<string, UserProfile>();
  users.forEach((user) => {
    const key = user.email.trim().toLowerCase() || user.id;
    if (!byEmail.has(key)) byEmail.set(key, user);
  });
  return Array.from(byEmail.values());
}

function buildLeaderOptions(users: UserProfile[], executives: Executive[]) {
  const options = new Map<string, { value: string; label: string }>();
  users.forEach((user) => {
    options.set(user.executiveId || user.id, {
      value: user.executiveId || user.id,
      label: `${user.fullName} - ${user.role}${user.email ? ` - ${user.email}` : ""}`
    });
  });
  executives.forEach((executive) => {
    if (!options.has(executive.id)) {
      options.set(executive.id, { value: executive.id, label: `${executive.fullName} - Ejecutivo` });
    }
  });
  return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
}

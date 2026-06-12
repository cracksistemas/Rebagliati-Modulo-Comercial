"use client";

import { Lock, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import type { UserProfile } from "@/lib/commercial/types";

const roles = [
  "Superadministrador",
  "Administrador",
  "Jefe de ventas",
  "Lider de ventas",
  "Ejecutivo",
  "Marketing",
  "Solo lectura"
];

export function SettingsView() {
  const [state, setState] = useState(getCommercialState);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<UserProfile | null>(null);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const users = useMemo(
    () => state.users.filter((user) => `${user.fullName} ${user.email} ${user.area} ${user.role}`.toLowerCase().includes(query.toLowerCase())),
    [query, state.users]
  );

  function saveUser(user: UserProfile) {
    const exists = state.users.some((item) => item.id === user.id);
    const next = {
      ...state,
      users: exists ? state.users.map((item) => (item.id === user.id ? user : item)) : [user, ...state.users],
      audit: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("es-PE"),
          actor: "Administrador Comercial",
          action: exists ? "Edito usuario" : "Creo usuario",
          module: "Configuracion",
          target: user.email,
          result: "Exitoso" as const,
          criticality: "Alta" as const
        },
        ...state.audit
      ]
    };
    setState(next);
    setCommercialState(next);
    setEditing(null);
  }

  return (
    <div className="grid">
      <section className="grid grid-4">
        <div className="card metric"><span className="muted">Usuarios activos</span><strong>{state.users.filter((u) => u.status === "Activo").length}</strong></div>
        <div className="card metric"><span className="muted">Usuarios inactivos</span><strong>{state.users.filter((u) => u.status !== "Activo").length}</strong></div>
        <div className="card metric"><span className="muted">Roles creados</span><strong>{roles.length}</strong></div>
        <div className="card metric"><span className="muted">Alertas seguridad</span><strong>0</strong></div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Usuarios</p>
            <h2>Usuarios, roles y auditoria</h2>
          </div>
          <button className="primary-button" onClick={() => setEditing({ id: crypto.randomUUID(), fullName: "", email: "", role: "Ejecutivo", area: "Ventas", status: "Pendiente", lastAccess: "Sin acceso", createdAt: new Date().toISOString().slice(0, 10) })}>
            <UserPlus size={18} />
            Crear usuario
          </button>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Buscar por nombre, correo, area o rol</label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario" />
        </div>
        <table className="table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Area</th><th>Estado</th><th>Ultimo acceso</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.fullName}</strong></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.area}</td>
                <td><span className="badge">{user.status}</span></td>
                <td>{user.lastAccess}</td>
                <td><button className="ghost-button" onClick={() => setEditing(user)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <p className="eyebrow">Roles y permisos</p>
          <h2>Matriz por modulo</h2>
          {["Ventas", "Ranking", "Equipos", "Mapa de Clientes", "Configuracion", "Reportes"].map((module) => (
            <div key={module} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #E5E5EA" }}>
              <strong>{module}</strong>
              <span className="badge"><ShieldCheck size={15} /> Ver · Crear · Editar · Exportar</span>
            </div>
          ))}
        </div>
        <div className="card">
          <p className="eyebrow">Auditoria</p>
          <h2>Eventos sensibles</h2>
          <div className="grid">
            {state.audit.slice(0, 6).map((event) => (
              <div key={event.id} style={{ display: "flex", gap: 10 }}>
                <span className="avatar"><Lock size={16} /></span>
                <div>
                  <strong>{event.action}</strong>
                  <p className="muted">{event.actor} · {event.module} · {event.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="eyebrow">Usuario</p>
            <h2>{editing.fullName || "Nuevo usuario"}</h2>
            <div className="form-grid">
              <div className="field"><label>Nombre completo</label><input value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /></div>
              <div className="field"><label>Correo</label><input value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></div>
              <div className="field"><label>Area</label><input value={editing.area} onChange={(event) => setEditing({ ...editing, area: event.target.value })} /></div>
              <div className="field"><label>Rol</label><select value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></div>
              <div className="field"><label>Estado</label><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as UserProfile["status"] })}><option>Activo</option><option>Inactivo</option><option>Pendiente</option><option>Bloqueado</option><option>Archivado</option></select></div>
            </div>
            <div className="card" style={{ boxShadow: "none", marginTop: 16 }}>
              <strong>Permisos heredados</strong>
              <p className="muted">El rol seleccionado define acceso a modulos, edicion, auditoria y exportacion.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={() => saveUser(editing)}>Guardar usuario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

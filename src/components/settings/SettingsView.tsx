"use client";

import { Camera, Lock, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import type { Executive, UserProfile } from "@/lib/commercial/types";

const roles = [
  "Superadministrador",
  "Administrador",
  "Jefe de ventas",
  "Lider de ventas",
  "Ejecutivo",
  "Marketing",
  "Solo lectura"
];

type EditableUser = UserProfile & {
  password?: string;
  avatarDataUrl?: string;
};

function isExecutiveRole(role: string) {
  return role.toLowerCase().includes("ejecutivo") || role.toLowerCase().includes("lider");
}

function blankUser(): EditableUser {
  return {
    id: `draft-${Date.now()}`,
    fullName: "",
    email: "",
    role: "Ejecutivo",
    area: "Ventas",
    status: "Pendiente",
    lastAccess: "Sin acceso",
    createdAt: new Date().toISOString().slice(0, 10),
    code: "",
    shift: "Manana",
    teamId: "",
    password: ""
  };
}

export function SettingsView() {
  const [state, setState] = useState(getCommercialState);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const users = useMemo(
    () => state.users.filter((user) => `${user.fullName} ${user.email} ${user.area} ${user.role}`.toLowerCase().includes(query.toLowerCase())),
    [query, state.users]
  );

  function openEditor(user?: UserProfile) {
    setErrorMessage("");
    setEditing(user ? { ...user, password: "" } : blankUser());
  }

  function readAvatar(file?: File) {
    if (!file || !editing) return;
    const reader = new FileReader();
    reader.onload = () => {
      const avatarDataUrl = String(reader.result);
      setEditing({ ...editing, avatarDataUrl, avatarUrl: avatarDataUrl });
    };
    reader.readAsDataURL(file);
  }

  function applyUserLocally(user: UserProfile, executiveId?: string | null) {
    const exists = state.users.some((item) => item.id === user.id);
    const executives = [...state.executives];

    if (isExecutiveRole(user.role)) {
      const existingExecutiveIndex = executives.findIndex((item) => item.id === executiveId || item.id === user.id || item.code === user.code);
      const executive: Executive = {
        id: executiveId ?? user.id,
        fullName: user.fullName,
        code: user.code || `E-${user.id.slice(0, 4).toUpperCase()}`,
        teamId: user.teamId,
        shift: user.shift ?? "Manana",
        status: user.status === "Activo" || user.status === "Pendiente" ? "Activo" : "Inactivo",
        photoUrl: user.avatarUrl,
        goalAmount: 0,
        currentSales: 0,
        points: 0,
        previousRank: 99
      };
      if (existingExecutiveIndex >= 0) {
        executives[existingExecutiveIndex] = { ...executives[existingExecutiveIndex], ...executive };
      } else {
        executives.unshift(executive);
      }
    }

    const next = {
      ...state,
      users: exists ? state.users.map((item) => (item.id === user.id ? user : item)) : [user, ...state.users],
      executives,
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
  }

  async function saveUser(user: EditableUser) {
    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user)
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo crear el usuario.");
      }

      const saved = payload.data;
      const nextUser: UserProfile = {
        id: saved.id,
        fullName: saved.fullName,
        email: saved.email,
        role: saved.role,
        area: saved.area,
        status: saved.status,
        lastAccess: user.lastAccess,
        createdAt: user.createdAt,
        avatarUrl: saved.avatarUrl ?? user.avatarUrl,
        code: user.code,
        shift: user.shift,
        teamId: user.teamId
      };
      applyUserLocally(nextUser, saved.executiveId);
      setEditing(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el usuario.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      <section className="grid grid-4">
        <div className="card metric"><span className="muted">Usuarios activos</span><strong>{state.users.filter((u) => u.status === "Activo").length}</strong></div>
        <div className="card metric"><span className="muted">Usuarios inactivos</span><strong>{state.users.filter((u) => u.status !== "Activo").length}</strong></div>
        <div className="card metric"><span className="muted">Roles creados</span><strong>{roles.length}</strong></div>
        <div className="card metric"><span className="muted">Ejecutivos vinculados</span><strong>{state.executives.length}</strong></div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Usuarios</p>
            <h2>Usuarios, roles y auditoria</h2>
            <p className="muted">Al crear un usuario ejecutivo, tambien se crea su registro comercial vinculado.</p>
          </div>
          <button className="primary-button" onClick={() => openEditor()}>
            <UserPlus size={18} />
            Crear usuario
          </button>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Buscar por nombre, correo, area o rol</label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario" />
        </div>
        <table className="table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Area</th><th>Estado</th><th>Ultimo acceso</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {user.avatarUrl ? <img className="avatar" src={user.avatarUrl} alt={user.fullName} /> : <span className="avatar">{user.fullName.slice(0, 2).toUpperCase()}</span>}
                    <strong>{user.fullName}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.area}</td>
                <td><span className="badge">{user.status}</span></td>
                <td>{user.lastAccess}</td>
                <td><button className="ghost-button" onClick={() => openEditor(user)}>Editar</button></td>
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
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <div style={{ display: "grid", placeItems: "center", gap: 14 }}>
                  {editing.avatarUrl ? <img className="avatar" src={editing.avatarUrl} alt={editing.fullName} style={{ width: 128, height: 128 }} /> : <span className="avatar" style={{ width: 128, height: 128, fontSize: 28 }}>RF</span>}
                  <label className="ghost-button">
                    <Camera size={16} />
                    Subir foto
                    <input hidden type="file" accept="image/*" onChange={(event) => readAvatar(event.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div className="form-grid">
                <div className="field"><label>Nombre completo</label><input value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /></div>
                <div className="field"><label>Correo</label><input value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></div>
                <div className="field"><label>Contrasena inicial</label><input type="password" value={editing.password ?? ""} onChange={(event) => setEditing({ ...editing, password: event.target.value })} /></div>
                <div className="field"><label>Area</label><input value={editing.area} onChange={(event) => setEditing({ ...editing, area: event.target.value })} /></div>
                <div className="field"><label>Rol</label><select value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></div>
                <div className="field"><label>Estado</label><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as UserProfile["status"] })}><option>Activo</option><option>Pendiente</option><option>Inactivo</option><option>Bloqueado</option><option>Archivado</option></select></div>
              </div>
            </div>

            {isExecutiveRole(editing.role) && (
              <div className="card" style={{ boxShadow: "none", marginTop: 16 }}>
                <p className="eyebrow">Ficha comercial vinculada</p>
                <div className="form-grid">
                  <div className="field"><label>Codigo ejecutivo</label><input value={editing.code ?? ""} onChange={(event) => setEditing({ ...editing, code: event.target.value })} placeholder="Ej. E-120" /></div>
                  <div className="field"><label>Turno</label><select value={editing.shift ?? "Manana"} onChange={(event) => setEditing({ ...editing, shift: event.target.value as UserProfile["shift"] })}><option>Manana</option><option>Tarde</option><option>Noche</option></select></div>
                  <div className="field"><label>Equipo</label><select value={editing.teamId ?? ""} onChange={(event) => setEditing({ ...editing, teamId: event.target.value })}><option value="">Sin equipo</option>{state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
                </div>
              </div>
            )}

            <div className="card" style={{ boxShadow: "none", marginTop: 16 }}>
              <strong>Permisos heredados</strong>
              <p className="muted">El rol seleccionado define navegacion, permisos y saludo personalizado. Los usuarios ejecutivos quedan vinculados automaticamente al directorio comercial.</p>
              {errorMessage ? <p style={{ color: "#FF3B30", marginTop: 10 }}>{errorMessage}</p> : null}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={() => saveUser(editing)} disabled={saving}>{saving ? "Guardando..." : "Guardar usuario"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

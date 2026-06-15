"use client";

import { Camera, GitMerge, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, setCommercialState, deactivateExecutive } from "@/lib/commercial/store";
import type { Executive, UserProfile } from "@/lib/commercial/types";

const roles = ["Ejecutivo", "Lider de ventas", "Jefe de ventas", "Gerencia", "Administrador", "Superadministrador", "Marketing"];

type EditableExecutive = Executive & {
  email?: string;
  role?: string;
  password?: string;
};

type MergeResult = {
  canonicalId: string;
  fullName: string;
  email: string;
  mergedIds: string[];
  mergedNames: string[];
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

const emptyExecutive: Executive = {
  id: "",
  fullName: "",
  code: "",
  teamId: "",
  shift: "Manana",
  status: "Activo",
  goalAmount: 0,
  currentSales: 0,
  points: 0
};

export function ExecutiveManagement() {
  const [state, setState] = useState(getCommercialState);
  const [editing, setEditing] = useState<EditableExecutive | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0, zoom: 100 });
  const [saveStatus, setSaveStatus] = useState("");
  const [mergeStatus, setMergeStatus] = useState("");
  const [merging, setMerging] = useState(false);

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

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
        // Mantiene el directorio visible aunque el usuario no pueda leer usuarios administrativos.
      }
    }
    loadUsers();
    return () => {
      alive = false;
    };
  }, []);

  const executives = useMemo(() => dedupeExecutives(state.executives).filter((item) => item.status !== "Baja"), [state.executives]);

  function openEditor(executive?: Executive) {
    const linkedUser = executive ? userForExecutive(executive, state.users) : undefined;
    const draft = executive ?? { ...emptyExecutive, id: crypto.randomUUID(), code: nextCodeForRole("Ejecutivo", state.executives, state.users) };
    setEditing({
      ...draft,
      email: linkedUser?.email ?? "",
      role: linkedUser?.role ?? "Ejecutivo",
      password: ""
    });
    setPhotoFile(null);
    setPhotoPreview(executive ? photoForExecutive(executive, state.users) : "");
    setCrop({ x: 0, y: 0, zoom: 100 });
    setSaveStatus("");
  }

  function handlePhoto(file?: File) {
    if (!file || !editing) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function saveExecutive() {
    if (!editing) return;
    setSaveStatus("Guardando ejecutivo...");
    try {
      const photoDataUrl = photoFile && photoPreview ? await cropPhotoToDataUrl(photoPreview, crop) : undefined;
      const executiveCode = editing.code?.trim() || nextCodeForRole(editing.role ?? "Ejecutivo", state.executives, state.users, editing.id);
      const response = await fetch("/api/commercial/executives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editing, code: executiveCode, photoDataUrl })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: any };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo guardar el ejecutivo.");

      const saved = payload.data;
      const nextExecutive: Executive = {
        id: saved.id,
        fullName: saved.fullName,
        code: saved.code,
        teamId: saved.teamId,
        shift: saved.shift,
        status: saved.status,
        photoUrl: saved.photoUrl ?? editing.photoUrl,
        goalAmount: Number(saved.goalAmount ?? editing.goalAmount),
        currentSales: editing.currentSales,
        points: editing.points,
        previousRank: editing.previousRank
      };
      const existingUser = state.users.find((user) => user.executiveId === saved.id || user.email.toLowerCase() === String(saved.email ?? "").toLowerCase());
      const nextUser: UserProfile | null = saved.email
        ? {
            id: existingUser?.id ?? saved.id,
            fullName: saved.fullName,
            email: saved.email,
            role: saved.role ?? editing.role ?? "Ejecutivo",
            area: existingUser?.area ?? "Ventas",
            status: saved.status === "Activo" ? "Activo" : "Inactivo",
            lastAccess: existingUser?.lastAccess ?? "Sin acceso",
            createdAt: existingUser?.createdAt ?? new Date().toISOString().slice(0, 10),
            avatarUrl: saved.photoUrl ?? editing.photoUrl,
            executiveId: saved.id,
            code: saved.code,
            shift: saved.shift,
            teamId: saved.teamId
          }
        : null;
      const next = {
        ...state,
        executives: state.executives.some((item) => item.id === nextExecutive.id)
          ? state.executives.map((item) => (item.id === nextExecutive.id ? nextExecutive : item))
          : [nextExecutive, ...state.executives],
        users: nextUser ? upsertUser(state.users, nextUser) : state.users
      };
      setState(next);
      setCommercialState(next);
      setEditing(null);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "No se pudo guardar el ejecutivo.");
    }
  }

  async function deactivateExecutivePersisted(executive: Executive) {
    setSaveStatus(`Dando de baja a ${executive.fullName}...`);
    const nextExecutive = { ...executive, status: "Baja" as const };
    deactivateExecutive(executive.id);
    setState(getCommercialState());
    try {
      const response = await fetch(`/api/commercial/executives?id=${encodeURIComponent(executive.id)}`, { method: "DELETE" });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo dar de baja en Supabase.");
      setSaveStatus(`${executive.fullName} fue dado de baja.`);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "No se pudo dar de baja en Supabase.");
      const current = getCommercialState();
      setCommercialState({
        ...current,
        executives: current.executives.map((item) => (item.id === executive.id ? nextExecutive : item))
      });
    }
  }

  async function mergeDuplicateExecutives() {
    setMerging(true);
    setMergeStatus("Fusionando duplicados...");
    try {
      const response = await fetch("/api/commercial/executives/merge", { method: "POST" });
      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: { merged?: MergeResult[] } };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudieron fusionar duplicados.");

      const merged = payload.data?.merged ?? [];
      if (!merged.length) {
        setMergeStatus("No se encontraron duplicados activos para fusionar.");
        return;
      }

      const duplicateToCanonical = new Map<string, MergeResult>();
      merged.forEach((item) => item.mergedIds.forEach((id) => duplicateToCanonical.set(id, item)));
      const canonicalById = new Map(merged.map((item) => [item.canonicalId, item]));
      const duplicateIds = new Set([...duplicateToCanonical.keys()]);

      const next = {
        ...state,
        executives: state.executives
          .filter((executive) => !duplicateIds.has(executive.id))
          .map((executive) => {
            const canonical = canonicalById.get(executive.id);
            return canonical ? { ...executive, fullName: canonical.fullName } : executive;
          }),
        sales: state.sales.map((sale) => {
          const canonical = duplicateToCanonical.get(sale.executiveId);
          return canonical ? { ...sale, executiveId: canonical.canonicalId } : sale;
        }),
        incidents: state.incidents.map((incident) => {
          const executiveCanonical = duplicateToCanonical.get(incident.executiveId);
          const leaderCanonical = incident.salesLeaderId ? duplicateToCanonical.get(incident.salesLeaderId) : undefined;
          return {
            ...incident,
            executiveId: executiveCanonical?.canonicalId ?? incident.executiveId,
            executiveName: executiveCanonical?.fullName ?? incident.executiveName,
            salesLeaderId: leaderCanonical?.canonicalId ?? incident.salesLeaderId,
            salesLeaderName: leaderCanonical?.fullName ?? incident.salesLeaderName
          };
        }),
        teams: state.teams.map((team) => {
          const canonical = team.leaderId ? duplicateToCanonical.get(team.leaderId) : undefined;
          return canonical ? { ...team, leaderId: canonical.canonicalId } : team;
        }),
        users: state.users.map((user) => {
          if (!user.executiveId) return user;
          const canonical = duplicateToCanonical.get(user.executiveId);
          return canonical ? { ...user, executiveId: canonical.canonicalId, fullName: canonical.fullName, email: canonical.email || user.email } : user;
        })
      };
      setState(next);
      setCommercialState(next);
      setMergeStatus(`${merged.length} grupo(s) fusionado(s).`);
    } catch (error) {
      setMergeStatus(error instanceof Error ? error.message : "No se pudieron fusionar duplicados.");
    } finally {
      setMerging(false);
    }
  }

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Ejecutivos</p>
          <h2>Directorio comercial editable</h2>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="ghost-button" onClick={mergeDuplicateExecutives} disabled={merging}>
            <GitMerge size={18} />
            {merging ? "Fusionando..." : "Fusionar duplicados"}
          </button>
          <button className="primary-button" onClick={() => openEditor()}>
            <Plus size={18} />
            Agregar ejecutivo
          </button>
        </div>
      </div>
      {mergeStatus ? <p className="muted" style={{ marginTop: 10 }}>{mergeStatus}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Ejecutivo</th>
            <th>Codigo</th>
            <th>Equipo</th>
            <th>Incidencias</th>
            <th>Turno</th>
            <th>Estado</th>
            <th>Opciones</th>
          </tr>
        </thead>
        <tbody>
          {executives.map((item) => {
            const linkedUser = userForExecutive(item, state.users);
            return (
            <tr key={item.id}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {photoForExecutive(item, state.users) ? <img className="avatar" src={photoForExecutive(item, state.users)} alt={item.fullName} /> : <div className="avatar">{initials(item.fullName)}</div>}
                  <div>
                    <strong>{item.fullName}</strong>
                    <p className="muted" style={{ margin: 0 }}>{linkedUser?.email ?? "Sin correo asignado"}</p>
                  </div>
                </div>
              </td>
              <td>{item.code}</td>
              <td>{state.teams.find((team) => team.id === item.teamId)?.name ?? "Sin equipo"}</td>
              <td>
                <span className="badge">
                  {state.incidents.filter((incident) => incident.executiveId === item.id).length}
                </span>
              </td>
              <td>{item.shift}</td>
              <td><span className="badge">{item.status}</span></td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="icon-button" onClick={() => openEditor(item)} title="Editar perfil"><Pencil size={16} /></button>
                  <button className="icon-button" onClick={() => openEditor(item)} title="Subir foto"><Camera size={16} /></button>
                  <button className="icon-button" onClick={() => deactivateExecutivePersisted(item)} title="Dar de baja"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          );})}
        </tbody>
      </table>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal executive-profile-modal">
            <div className="executive-profile-header">
              <div>
                <p className="eyebrow">Perfil comercial</p>
                <h2>{editing.fullName || "Nuevo ejecutivo"}</h2>
              </div>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cerrar</button>
            </div>

            <div className="executive-profile-layout">
              <div className="executive-photo-panel">
                <div className="executive-photo-preview">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Vista previa"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom / 100})`,
                        transformOrigin: "center"
                      }}
                    />
                  ) : (
                    <div className="muted">Vista previa</div>
                  )}
                  <div
                    aria-hidden="true"
                    className="executive-photo-mask"
                  />
                </div>
                <label className="primary-button" style={{ width: "100%" }}>
                  <Upload size={17} />
                  Cargar foto
                  <input type="file" accept="image/*" hidden onChange={(event) => handlePhoto(event.target.files?.[0])} />
                </label>
                <div className="field" style={{ marginTop: 14 }}>
                  <label>Posicion horizontal</label>
                  <input type="range" min="-180" max="180" value={crop.x} onChange={(event) => setCrop({ ...crop, x: Number(event.target.value) })} />
                </div>
                <div className="field">
                  <label>Posicion vertical</label>
                  <input type="range" min="-180" max="180" value={crop.y} onChange={(event) => setCrop({ ...crop, y: Number(event.target.value) })} />
                </div>
                <div className="field">
                  <label>Zoom</label>
                  <input type="range" min="60" max="260" value={crop.zoom} onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value) })} />
                </div>
              </div>

              <div className="executive-fields-grid">
                <div className="field">
                  <label>Correo asignado</label>
                  <input type="email" value={editing.email ?? ""} onChange={(event) => setEditing({ ...editing, email: event.target.value })} placeholder="ejecutivo@rebagliati.com" />
                </div>
                <div className="field">
                  <label>Rol</label>
                  <select
                    value={editing.role ?? "Ejecutivo"}
                    onChange={(event) => setEditing({ ...editing, role: event.target.value, code: nextCodeForRole(event.target.value, state.executives, state.users, editing.id) })}
                  >
                    {roles.map((role) => <option key={role}>{role}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Contrasena temporal</label>
                  <input type="password" value={editing.password ?? ""} onChange={(event) => setEditing({ ...editing, password: event.target.value })} placeholder="Solo si es acceso nuevo o cambio" />
                </div>
                <div className="field">
                  <label>Nombre completo</label>
                  <input value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} />
                </div>
                <div className="field">
                  <label>Codigo</label>
                  <input value={editing.code} readOnly />
                </div>
                <div className="field">
                  <label>Equipo</label>
                  <select value={editing.teamId ?? ""} onChange={(event) => setEditing({ ...editing, teamId: event.target.value })}>
                    <option value="">Sin equipo</option>
                    {state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Turno</label>
                  <select value={editing.shift} onChange={(event) => setEditing({ ...editing, shift: event.target.value as Executive["shift"] })}>
                    <option value="Manana">Mañana</option>
                    <option>Tarde</option>
                    <option>Noche</option>
                  </select>
                </div>
                <div className="field">
                  <label>Meta mensual</label>
                  <input type="number" value={editing.goalAmount} onChange={(event) => setEditing({ ...editing, goalAmount: Number(event.target.value) })} />
                </div>
                <div className="field">
                  <label>Ventas actuales</label>
                  <input type="number" value={editing.currentSales} onChange={(event) => setEditing({ ...editing, currentSales: Number(event.target.value) })} />
                </div>
                <div className="field">
                  <label>Puntos</label>
                  <input type="number" value={editing.points} onChange={(event) => setEditing({ ...editing, points: Number(event.target.value) })} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as Executive["status"] })}>
                    <option>Activo</option>
                    <option>Inactivo</option>
                    <option>Baja</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="executive-profile-actions">
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={saveExecutive}>Guardar cambios</button>
            </div>
            {saveStatus ? <p className="muted" style={{ marginTop: 10 }}>{saveStatus}</p> : null}
          </div>
        </div>
      )}
    </section>
  );
}

function userForExecutive(executive: Executive, users: UserProfile[]) {
  return users.find((user) => user.executiveId === executive.id || user.code === executive.code || user.fullName.trim().toLowerCase() === executive.fullName.trim().toLowerCase());
}

function photoForExecutive(executive: Executive, users: UserProfile[]) {
  return executive.photoUrl || userForExecutive(executive, users)?.avatarUrl || "";
}

function dedupeUsers(users: UserProfile[]) {
  const byEmail = new Map<string, UserProfile>();
  users.forEach((user) => {
    const key = user.email.trim().toLowerCase() || user.id;
    if (!byEmail.has(key)) byEmail.set(key, user);
  });
  return Array.from(byEmail.values());
}

function upsertUser(users: UserProfile[], user: UserProfile) {
  const key = user.email.trim().toLowerCase();
  const exists = users.some((item) => item.id === user.id || item.email.trim().toLowerCase() === key);
  return exists ? users.map((item) => (item.id === user.id || item.email.trim().toLowerCase() === key ? { ...item, ...user } : item)) : [user, ...users];
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

function nextCodeForRole(role: string, executives: Executive[], users: UserProfile[], editingId = "") {
  const prefix = codePrefixForRole(role);
  const usedCodes = [
    ...executives.filter((item) => item.id !== editingId).map((item) => item.code),
    ...users.filter((item) => item.executiveId !== editingId).map((item) => item.code ?? "")
  ];
  const max = usedCodes.reduce((highest, code) => {
    const match = String(code).match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function codePrefixForRole(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("super")) return "SA";
  if (normalized.includes("admin")) return "AD";
  if (normalized.includes("gerencia")) return "GE";
  if (normalized.includes("jefe")) return "JV";
  if (normalized.includes("lider")) return "LV";
  if (normalized.includes("supervisor")) return "SU";
  if (normalized.includes("marketing")) return "MK";
  return "E";
}

function cropPhotoToDataUrl(source: string, crop: { x: number; y: number; zoom: number }) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const outputSize = 512;
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo preparar la foto."));
        return;
      }
      const containScale = Math.min(outputSize / image.width, outputSize / image.height) * (crop.zoom / 100);
      const displayWidth = image.width * containScale;
      const displayHeight = image.height * containScale;
      const offsetX = (outputSize - displayWidth) / 2 + crop.x * (outputSize / 300);
      const offsetY = (outputSize - displayHeight) / 2 + crop.y * (outputSize / 300);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, outputSize, outputSize);
      ctx.drawImage(image, offsetX, offsetY, displayWidth, displayHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => reject(new Error("No se pudo leer la foto."));
    image.src = source;
  });
}

"use client";

import { Camera, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, persistExecutivePhoto, upsertExecutive, deactivateExecutive } from "@/lib/commercial/store";
import type { Executive } from "@/lib/commercial/types";

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
  const [editing, setEditing] = useState<Executive | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0, zoom: 100 });

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const executives = useMemo(() => state.executives.filter((item) => item.status !== "Baja"), [state.executives]);

  function openEditor(executive?: Executive) {
    setEditing(executive ?? { ...emptyExecutive, id: crypto.randomUUID() });
    setPhotoFile(null);
    setPhotoPreview(executive?.photoUrl ?? "");
    setCrop({ x: 0, y: 0, zoom: 100 });
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
    let photoUrl = editing.photoUrl;
    if (photoFile) {
      try {
        photoUrl = await persistExecutivePhoto(photoFile, editing.id);
      } catch {
        photoUrl = photoPreview;
      }
    }
    upsertExecutive({ ...editing, photoUrl });
    setEditing(null);
  }

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Ejecutivos</p>
          <h2>Directorio comercial editable</h2>
        </div>
        <button className="primary-button" onClick={() => openEditor()}>
          <Plus size={18} />
          Agregar ejecutivo
        </button>
      </div>
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
          {executives.map((item) => (
            <tr key={item.id}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {item.photoUrl ? <img className="avatar" src={item.photoUrl} alt={item.fullName} /> : <div className="avatar">{initials(item.fullName)}</div>}
                  <strong>{item.fullName}</strong>
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
                  <button className="icon-button" onClick={() => deactivateExecutive(item.id)} title="Dar de baja"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <p className="eyebrow">Perfil comercial</p>
                <h2>{editing.fullName || "Nuevo ejecutivo"}</h2>
              </div>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cerrar</button>
            </div>

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <div style={{ width: 280, height: 280, borderRadius: 24, overflow: "hidden", background: "#fff", border: "1px solid #E5E5EA", margin: "0 auto 18px", display: "grid", placeItems: "center", position: "relative" }}>
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
                    style={{
                      position: "absolute",
                      inset: 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(0, 167, 235, 0.85)",
                      boxShadow: "0 0 0 999px rgba(245,245,247,0.5)",
                      pointerEvents: "none"
                    }}
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

              <div className="form-grid">
                <div className="field">
                  <label>Nombre completo</label>
                  <input value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} />
                </div>
                <div className="field">
                  <label>Codigo</label>
                  <input value={editing.code} onChange={(event) => setEditing({ ...editing, code: event.target.value })} />
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={saveExecutive}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

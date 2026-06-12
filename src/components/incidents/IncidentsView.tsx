"use client";

import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileText, Plus, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/lib/commercial/types";

function nextIncidentCode(total: number) {
  return `INC-2026-${String(total + 1).padStart(4, "0")}`;
}

function executiveStatus(count: number, graveCount: number, recurrent: boolean) {
  if (recurrent) return "Reincidente critico";
  if (count === 0) return "Correcto";
  if (count === 1 && graveCount === 0) return "Observacion";
  if (count === 2 && graveCount === 0) return "En mejora";
  return "Critico";
}

function severityTone(severity: IncidentSeverity) {
  if (severity === "Critica") return "#1D1D1F";
  if (severity === "Grave") return "#FF3B30";
  if (severity === "Moderada") return "#FF9500";
  return "#34C759";
}

function downloadCsv(incidents: Incident[]) {
  const header = ["Codigo", "Fecha", "Ejecutivo", "Gravedad", "Categoria", "Estado", "Medida", "Puntos"];
  const rows = incidents.map((item) => [
    item.incidentCode,
    item.incidentDate,
    item.executiveName,
    item.severity,
    item.category,
    item.status,
    item.solutionOrMeasure ?? "",
    String(item.pointsDeducted)
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "incidencias-rebagliati.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function IncidentsView() {
  const [state, setState] = useState(getCommercialState);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [editing, setEditing] = useState<Incident | null>(null);

  const filtered = useMemo(() => {
    return state.incidents.filter((incident) => {
      const haystack = `${incident.incidentCode} ${incident.executiveName} ${incident.salesLeaderName} ${incident.description} ${incident.category} ${incident.kommoLeadId}`.toLowerCase();
      return (
        haystack.includes(query.toLowerCase()) &&
        (severity === "Todas" || incident.severity === severity) &&
        (status === "Todos" || incident.status === status)
      );
    });
  }, [query, severity, state.incidents, status]);

  const kpis = useMemo(() => {
    const openStatuses: IncidentStatus[] = ["Pendiente", "En revision", "Conversado con ejecutivo", "Medida aplicada", "Reabierto"];
    const byExecutive = new Map<string, number>();
    state.incidents.forEach((incident) => byExecutive.set(incident.executiveName, (byExecutive.get(incident.executiveName) ?? 0) + 1));
    const top = Array.from(byExecutive.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      total: state.incidents.length,
      leves: state.incidents.filter((item) => item.severity === "Leve").length,
      moderadas: state.incidents.filter((item) => item.severity === "Moderada").length,
      graves: state.incidents.filter((item) => item.severity === "Grave").length,
      criticas: state.incidents.filter((item) => item.severity === "Critica").length,
      pendientes: state.incidents.filter((item) => openStatuses.includes(item.status)).length,
      medidas: state.incidents.filter((item) => Boolean(item.disciplinaryActionType)).length,
      top: top ? `${top[0]} (${top[1]})` : "Sin recurrencia"
    };
  }, [state.incidents]);

  function openNewIncident() {
    const executive = state.executives[0];
    const leader = state.executives.find((item) => item.id === state.teams.find((team) => team.id === executive?.teamId)?.leaderId);
    setEditing({
      id: `incident-${crypto.randomUUID()}`,
      incidentCode: nextIncidentCode(state.incidents.length),
      incidentDate: new Date().toISOString().slice(0, 10),
      executiveId: executive?.id ?? "",
      executiveName: executive?.fullName ?? "",
      salesLeaderId: leader?.id,
      salesLeaderName: leader?.fullName ?? "Jefatura comercial",
      description: "",
      severity: "Leve",
      category: state.incidentCriteria.categories[0],
      status: "Pendiente",
      solutionOrMeasure: "",
      disciplinaryActionType: "",
      pointsDeducted: 0,
      createdBy: "Administrador Comercial",
      createdAt: new Date().toLocaleString("es-PE"),
      isRecurrent: false
    });
  }

  function updateDraft<K extends keyof Incident>(key: K, value: Incident[K]) {
    if (!editing) return;
    const next = { ...editing, [key]: value };
    if (key === "executiveId") {
      const executive = state.executives.find((item) => item.id === value);
      next.executiveName = executive?.fullName ?? "";
      const leader = state.executives.find((item) => item.id === state.teams.find((team) => team.id === executive?.teamId)?.leaderId);
      next.salesLeaderId = leader?.id;
      next.salesLeaderName = leader?.fullName ?? "Jefatura comercial";
    }
    if (key === "severity") {
      next.pointsDeducted = Math.abs(state.incidentCriteria.severities.find((item) => item.label === value)?.points ?? 0);
    }
    setEditing(next);
  }

  function saveIncident() {
    if (!editing || !editing.incidentDate || !editing.executiveId || !editing.description.trim() || !editing.salesLeaderName) return;
    const recurrent = state.incidents.some(
      (item) => item.executiveId === editing.executiveId && item.category === editing.category && item.incidentDate.slice(0, 7) === editing.incidentDate.slice(0, 7)
    );
    const nextIncident = { ...editing, isRecurrent: recurrent, updatedAt: new Date().toLocaleString("es-PE"), updatedBy: "Administrador Comercial" };
    const exists = state.incidents.some((item) => item.id === nextIncident.id);
    const next = {
      ...state,
      incidents: exists ? state.incidents.map((item) => (item.id === nextIncident.id ? nextIncident : item)) : [nextIncident, ...state.incidents],
      audit: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("es-PE"),
          actor: "Administrador Comercial",
          action: exists ? "Edito incidencia" : "Registro incidencia",
          module: "Incidencias",
          target: nextIncident.incidentCode,
          result: "Exitoso" as const,
          criticality: nextIncident.severity === "Critica" || nextIncident.severity === "Grave" ? "Alta" as const : "Media" as const
        },
        ...state.audit
      ]
    };
    setState(next);
    setCommercialState(next);
    setEditing(null);
  }

  function closeIncident(incident: Incident) {
    if ((incident.severity === "Grave" || incident.severity === "Critica") && !incident.solutionOrMeasure?.trim()) {
      setSelected({ ...incident, solutionOrMeasure: "Completar medida o comentario de cierre antes de cerrar." });
      return;
    }
    const closed = {
      ...incident,
      status: "Cerrado" as const,
      closedAt: new Date().toLocaleString("es-PE"),
      closedBy: "Administrador Comercial",
      updatedAt: new Date().toLocaleString("es-PE")
    };
    const next = { ...state, incidents: state.incidents.map((item) => (item.id === incident.id ? closed : item)) };
    setState(next);
    setCommercialState(next);
    setSelected(closed);
  }

  const executiveSummary = state.executives.map((executive) => {
    const items = state.incidents.filter((incident) => incident.executiveId === executive.id);
    const graveCount = items.filter((item) => item.severity === "Grave" || item.severity === "Critica").length;
    return {
      executive,
      total: items.length,
      graveCount,
      points: items.reduce((sum, item) => sum + item.pointsDeducted, 0),
      recurrent: items.some((item) => item.isRecurrent),
      status: executiveStatus(items.length, graveCount, items.some((item) => item.isRecurrent)),
      category: items[0]?.category ?? "Sin incidencias"
    };
  });

  return (
    <div className="grid">
      <section className="grid grid-4">
        <div className="card metric"><span className="muted">Incidencias del mes</span><strong>{kpis.total}</strong></div>
        <div className="card metric"><span className="muted">Graves / criticas</span><strong>{kpis.graves + kpis.criticas}</strong></div>
        <div className="card metric"><span className="muted">Pendientes</span><strong>{kpis.pendientes}</strong></div>
        <div className="card metric"><span className="muted">Mayor recurrencia</span><strong style={{ fontSize: "1rem" }}>{kpis.top}</strong></div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Control operativo</p>
            <h2>Registro de incidencias</h2>
            <p className="muted">Errores, medidas, reincidencias y seguimiento por ejecutivo.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ghost-button" onClick={() => downloadCsv(filtered)}><Download size={16} /> Exportar CSV</button>
            <button className="ghost-button" onClick={() => window.print()}><FileText size={16} /> PDF</button>
            <button className="primary-button" onClick={openNewIncident}><Plus size={18} /> Registrar incidencia</button>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field"><label>Buscador inteligente</label><div style={{ display: "flex", gap: 8 }}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="pago, promocion, llamada, Kommo, precio" /></div></div>
          <div className="field"><label>Gravedad</label><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>Todas</option>{state.incidentCriteria.severities.map((item) => <option key={item.label}>{item.label}</option>)}</select></div>
          <div className="field"><label>Estado</label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos</option>{state.incidentCriteria.statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
        </div>
        <table className="table">
          <thead><tr><th>Fecha</th><th>Ejecutivo</th><th>Incidencia</th><th>Tipo</th><th>Categoria</th><th>Jefe</th><th>Estado</th><th>Medida</th><th>Puntos</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map((incident) => (
              <tr key={incident.id}>
                <td>{incident.incidentDate}</td>
                <td><strong>{incident.executiveName}</strong></td>
                <td>{incident.incidentCode}<p className="muted">{incident.description.slice(0, 72)}</p></td>
                <td><span className="badge" style={{ color: severityTone(incident.severity) }}>{incident.severity}</span></td>
                <td>{incident.category}</td>
                <td>{incident.salesLeaderName}</td>
                <td>{incident.status}</td>
                <td>{incident.disciplinaryActionType || "Sin medida"}</td>
                <td>{incident.pointsDeducted}</td>
                <td><button className="ghost-button" onClick={() => setSelected(incident)}>Detalle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <p className="muted">No se encontraron incidencias con los filtros seleccionados.</p> : null}
      </section>

      <section className="grid grid-2">
        <div className="card">
          <p className="eyebrow">Incidencias por ejecutivo</p>
          <h2>Estado mensual</h2>
          <div className="grid">
            {executiveSummary.map((item) => (
              <div key={item.executive.id} style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid #E5E5EA", paddingBottom: 10 }}>
                {item.executive.photoUrl ? <img className="avatar" src={item.executive.photoUrl} alt={item.executive.fullName} /> : <span className="avatar">{item.executive.fullName.slice(0, 2).toUpperCase()}</span>}
                <div style={{ flex: 1 }}>
                  <strong>{item.executive.fullName}</strong>
                  <p className="muted">{item.total} incidencias - {item.category}</p>
                </div>
                <span className="badge">{item.status}</span>
                <strong>{item.points} pts</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Configuracion de criterios</p>
          <h2>Reglas actuales</h2>
          <div className="grid">
            {state.incidentCriteria.severities.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E5E5EA", paddingBottom: 8 }}>
                <strong style={{ color: severityTone(item.label) }}>{item.label}</strong>
                <span className="badge">{item.points} puntos</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 12 }}>Las categorias y puntajes quedan listos para llevarse a Supabase y ajustarse desde configuracion.</p>
        </div>
      </section>

      {editing ? (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="eyebrow">Registro de incidencias</p>
            <h2>{editing.incidentCode}</h2>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field"><label>Fecha</label><input type="date" value={editing.incidentDate} onChange={(event) => updateDraft("incidentDate", event.target.value)} /></div>
              <div className="field"><label>Ejecutivo involucrado</label><select value={editing.executiveId} onChange={(event) => updateDraft("executiveId", event.target.value)}>{state.executives.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></div>
              <div className="field"><label>Gravedad</label><select value={editing.severity} onChange={(event) => updateDraft("severity", event.target.value as IncidentSeverity)}>{state.incidentCriteria.severities.map((item) => <option key={item.label}>{item.label}</option>)}</select></div>
              <div className="field"><label>Categoria</label><select value={editing.category} onChange={(event) => updateDraft("category", event.target.value)}>{state.incidentCriteria.categories.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="field"><label>Jefe responsable</label><input value={editing.salesLeaderName} onChange={(event) => updateDraft("salesLeaderName", event.target.value)} /></div>
              <div className="field"><label>Estado inicial</label><select value={editing.status} onChange={(event) => updateDraft("status", event.target.value as IncidentStatus)}>{state.incidentCriteria.statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="field" style={{ gridColumn: "1 / -1" }}><label>Descripcion</label><textarea value={editing.description} onChange={(event) => updateDraft("description", event.target.value)} /></div>
              <div className="field"><label>Cliente relacionado</label><input value={editing.clientName ?? ""} onChange={(event) => updateDraft("clientName", event.target.value)} /></div>
              <div className="field"><label>Lead Kommo</label><input value={editing.kommoLeadId ?? ""} onChange={(event) => updateDraft("kommoLeadId", event.target.value)} /></div>
              <div className="field"><label>Programa / curso</label><input value={editing.courseOrProgram ?? ""} onChange={(event) => updateDraft("courseOrProgram", event.target.value)} /></div>
              <div className="field"><label>Canal</label><input value={editing.channel ?? ""} onChange={(event) => updateDraft("channel", event.target.value)} /></div>
              <div className="field"><label>Medida aplicada</label><select value={editing.disciplinaryActionType ?? ""} onChange={(event) => updateDraft("disciplinaryActionType", event.target.value)}><option value="">Sin medida</option>{state.incidentCriteria.measures.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="field"><label>Puntos descontados</label><input type="number" value={editing.pointsDeducted} onChange={(event) => updateDraft("pointsDeducted", Number(event.target.value))} /></div>
              <div className="field" style={{ gridColumn: "1 / -1" }}><label>Solucion o medida</label><textarea value={editing.solutionOrMeasure ?? ""} onChange={(event) => updateDraft("solutionOrMeasure", event.target.value)} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-button" onClick={saveIncident}>Registrar incidencia</button>
            </div>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="eyebrow">Detalle de incidencia</p>
            <h2>{selected.incidentCode}</h2>
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <strong>{selected.executiveName}</strong>
                <p className="muted">{selected.category} - {selected.severity} - {selected.status}</p>
                <p>{selected.description}</p>
                {selected.isRecurrent ? <p className="badge"><AlertTriangle size={16} /> Reincidencia detectada</p> : null}
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <strong>Seguimiento</strong>
                <p className="muted">Jefe: {selected.salesLeaderName}</p>
                <p>Medida: {selected.disciplinaryActionType || "Sin medida"}</p>
                <p>Puntos descontados: {selected.pointsDeducted}</p>
                {selected.kommoLeadId ? <button className="ghost-button"><ExternalLink size={16} /> Ver lead en Kommo</button> : null}
              </div>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Solucion o comentario de cierre</label>
              <textarea value={selected.solutionOrMeasure ?? ""} onChange={(event) => setSelected({ ...selected, solutionOrMeasure: event.target.value })} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setSelected({ ...selected, status: "Reabierto" })}><RotateCcw size={16} /> Reabrir</button>
              <button className="ghost-button" onClick={() => setSelected(null)}>Cerrar modal</button>
              <button className="primary-button" onClick={() => closeIncident(selected)}><CheckCircle2 size={16} /> Cerrar incidencia</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

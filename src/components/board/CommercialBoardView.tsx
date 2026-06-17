"use client";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  Link2,
  MessageCircle,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import type { CommercialState } from "@/lib/commercial/types";
import "./commercial-board.css";

type Priority = "Alta" | "Media" | "Baja";
type BoardTab = "excel" | "events" | "executives" | "hours" | "leads" | "alerts" | "config";
type SheetMode = "semana" | "finSemana";

type BoardRow = {
  id: string;
  boardDate: string;
  executiveId: string;
  executiveName: string;
  teamName: string;
  eventStartDate?: string;
  productName: string;
  productCode?: string;
  productType?: string;
  modality?: string;
  leadSource?: string;
  assignedLeadsCount: number;
  callsMade: number;
  messagesSent: number;
  messagesReceived: number;
  contactsMade: number;
  salesCount: number;
  salesAmount: number;
  dailyCallGoal: number;
  priority: Priority;
  status: string;
  advanceRate: number;
  goalCompletionRate: number;
  pendingLeads: number;
  lastUpdatedAt?: string;
};

type UserSlot = {
  id: string;
  code: string;
  range: string;
  primary: string;
  secondary: string;
  count: number;
  status?: string;
};

type ApiBucket = {
  api: string;
  label: string;
  total: number;
};

type CutBlock = {
  label: string;
  weekdayGoal: number;
  weekendGoal: number;
  weight: number;
};

const priorityOptions: Priority[] = ["Alta", "Media", "Baja"];

const tabs: { id: BoardTab; label: string }[] = [
  { id: "excel", label: "Pizarra Excel" },
  { id: "events", label: "Eventos" },
  { id: "executives", label: "Ejecutivos" },
  { id: "hours", label: "Horarios" },
  { id: "leads", label: "Por asignar" },
  { id: "alerts", label: "Alertas" },
  { id: "config", label: "Configuracion" }
];

const defaultUserSlots: UserSlot[] = [
  { id: "u1", code: "U1", range: "598 - 779", primary: "Carolina", secondary: "Eliana", count: 7 },
  { id: "u2", code: "U2", range: "598 - 779", primary: "Mariana", secondary: "Mariana", count: 1 },
  { id: "u3", code: "U3", range: "567 - 177", primary: "Maria", secondary: "Samantha", count: 0 },
  { id: "u4", code: "U4", range: "567 - 177", primary: "Samantha", secondary: "Samantha", count: 0 },
  { id: "u5", code: "U5", range: "002 - 945", primary: "Eliana", secondary: "Eliana", count: 0 },
  { id: "u6", code: "U6", range: "002 - 945", primary: "Eliana", secondary: "Alexandra", count: 6 }
];

const defaultWhatsappSlots: UserSlot[] = [
  { id: "w1", code: "W1", range: "098", primary: "Mariana", secondary: "", count: 0 },
  { id: "w2", code: "W2", range: "185", primary: "Bloqueado", secondary: "", count: 11, status: "BLOQUEADO" },
  { id: "w3", code: "W3", range: "833", primary: "Samantha / Bonnie", secondary: "", count: 0 }
];

const defaultExtraSlots: UserSlot[] = [
  { id: "e1", code: "443", range: "", primary: "Alexandra", secondary: "", count: 0 },
  { id: "e2", code: "772", range: "", primary: "Eliana", secondary: "", count: 0 },
  { id: "e3", code: "920", range: "", primary: "Alexandra / Nikool / Ariana", secondary: "", count: 0 },
  { id: "e4", code: "654", range: "", primary: "Bonnie", secondary: "", count: 0 },
  { id: "e5", code: "302", range: "", primary: "Bonnie", secondary: "", count: 0 },
  { id: "e6", code: "929", range: "", primary: "Restringido", secondary: "", count: 0, status: "RESTRINGIDO" }
];

const defaultApiBuckets: ApiBucket[] = [
  { api: "517", label: "Diplomado", total: 1 },
  { api: "691", label: "Cursos", total: 1 },
  { api: "678", label: "Obstetricia", total: 2 }
];

const defaultCutBlocks: CutBlock[] = [
  { label: "8:00 AM", weekdayGoal: 25, weekendGoal: 0, weight: 0.15 },
  { label: "12:00 PM", weekdayGoal: 18, weekendGoal: 0, weight: 0.2 },
  { label: "2:30 PM", weekdayGoal: 0, weekendGoal: 0, weight: 0.2 },
  { label: "5:00 PM", weekdayGoal: 0, weekendGoal: 0, weight: 0.2 },
  { label: "7:00 PM", weekdayGoal: 0, weekendGoal: 0, weight: 0.15 },
  { label: "8:45 PM", weekdayGoal: 0, weekendGoal: 0, weight: 0.1 }
];

const sourceRows = ["F", "IG", "TIKTOK"];
const sourceColumns = ["C", "D", "OBST"];

export function CommercialBoardView() {
  const [state, setState] = useState<CommercialState>(() => getCommercialState());
  const [tab, setTab] = useState<BoardTab>("excel");
  const [mode, setMode] = useState<SheetMode>(isWeekend(new Date()) ? "finSemana" : "semana");
  const [date, setDate] = useState(today());
  const [query, setQuery] = useState("");
  const [executiveFilter, setExecutiveFilter] = useState("Todos");
  const [priorityFilter, setPriorityFilter] = useState("Todos");
  const [editing, setEditing] = useState<BoardRow | null>(null);
  const [draft, setDraft] = useState<Partial<BoardRow>>({});

  useEffect(() => {
    let mounted = true;
    fetch("/api/commercial/board", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted || !payload?.ok || !payload.data) return;
        const current = getCommercialState();
        const next = {
          ...current,
          boardAssignments: Array.isArray(payload.data.boardAssignments) && payload.data.boardAssignments.length
            ? payload.data.boardAssignments
            : current.boardAssignments,
          boardLeads: Array.isArray(payload.data.boardLeads) && payload.data.boardLeads.length
            ? payload.data.boardLeads
            : current.boardLeads,
          boardTimeBlocks: Array.isArray(payload.data.boardTimeBlocks) && payload.data.boardTimeBlocks.length
            ? payload.data.boardTimeBlocks
            : current.boardTimeBlocks
        } as CommercialState;
        setState(next);
        setCommercialState(next);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => buildRows(state, date), [state, date]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = `${row.executiveName} ${row.teamName} ${row.productName} ${row.productCode ?? ""} ${row.productType ?? ""} ${row.modality ?? ""} ${row.leadSource ?? ""}`.toLowerCase();
      return (!q || haystack.includes(q)) &&
        (executiveFilter === "Todos" || row.executiveId === executiveFilter) &&
        (priorityFilter === "Todos" || row.priority === priorityFilter);
    });
  }, [rows, query, executiveFilter, priorityFilter]);

  const kpis = useMemo(() => buildKpis(filteredRows, state), [filteredRows, state]);
  const socialMatrix = useMemo(() => buildSocialMatrix(filteredRows, state), [filteredRows, state]);
  const apiBuckets = useMemo(() => buildApiBuckets(filteredRows), [filteredRows]);
  const alerts = useMemo(() => buildAlerts(filteredRows, state), [filteredRows, state]);
  const cutBlocks = useMemo(() => buildCutBlocks(state, filteredRows), [state, filteredRows]);
  const userSlots = useMemo(() => buildUserSlots(defaultUserSlots, filteredRows), [filteredRows]);
  const whatsappSlots = useMemo(() => buildOperationalSlots(defaultWhatsappSlots, state), [state]);
  const extraSlots = useMemo(() => buildOperationalSlots(defaultExtraSlots, state), [state]);

  function openEditor(row?: BoardRow) {
    const base = row ?? buildEmptyRow(state, date);
    setEditing(base);
    setDraft(base);
  }

  function saveDraft() {
    if (!editing) return;
    const assignment = {
      ...findOriginalAssignment(state, editing.id),
      id: editing.id.startsWith("generated-") ? `board-${crypto.randomUUID()}` : editing.id,
      boardDate: date,
      executiveId: String(draft.executiveId ?? editing.executiveId),
      teamId: findExecutive(state, String(draft.executiveId ?? editing.executiveId))?.teamId,
      productName: String(draft.productName ?? editing.productName),
      productCode: String(draft.productCode ?? editing.productCode ?? ""),
      productType: String(draft.productType ?? editing.productType ?? "Curso"),
      modality: String(draft.modality ?? editing.modality ?? "Virtual"),
      eventStartDate: String(draft.eventStartDate ?? editing.eventStartDate ?? ""),
      leadSource: String(draft.leadSource ?? editing.leadSource ?? "Kommo"),
      assignedLeadsCount: Number(draft.assignedLeadsCount ?? editing.assignedLeadsCount ?? 0),
      dailyCallGoal: Number(draft.dailyCallGoal ?? editing.dailyCallGoal ?? 70),
      callsMade: Number(draft.callsMade ?? editing.callsMade ?? 0),
      messagesSent: Number(draft.messagesSent ?? editing.messagesSent ?? 0),
      messagesReceived: Number(draft.messagesReceived ?? editing.messagesReceived ?? 0),
      contactsMade: Number(draft.contactsMade ?? editing.contactsMade ?? 0),
      salesCount: Number(draft.salesCount ?? editing.salesCount ?? 0),
      salesAmount: Number(draft.salesAmount ?? editing.salesAmount ?? 0),
      priority: (draft.priority ?? editing.priority ?? "Media") as Priority,
      status: inferStatus(
        Number(draft.callsMade ?? editing.callsMade ?? 0),
        Number(draft.assignedLeadsCount ?? editing.assignedLeadsCount ?? 0),
        Number(draft.dailyCallGoal ?? editing.dailyCallGoal ?? 70),
        String(draft.eventStartDate ?? editing.eventStartDate ?? "")
      ),
      lastUpdatedAt: new Date().toLocaleString("es-PE")
    };

    const currentAssignments = Array.isArray((state as any).boardAssignments) ? [...(state as any).boardAssignments] : [];
    const exists = currentAssignments.some((item: any) => item.id === editing.id && !editing.id.startsWith("generated-"));
    const nextAssignments = exists
      ? currentAssignments.map((item: any) => (item.id === editing.id ? assignment : item))
      : [assignment, ...currentAssignments];

    const nextState = {
      ...state,
      boardAssignments: nextAssignments,
      audit: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("es-PE"),
          actor: "Administrador Comercial",
          action: exists ? "Actualizo Mi Pizarra Virtual" : "Creo asignacion en Mi Pizarra Virtual",
          module: "Mi Pizarra Virtual",
          target: assignment.productName,
          result: "Exitoso",
          criticality: assignment.priority === "Alta" ? "Alta" : "Media"
        },
        ...((state as any).audit ?? [])
      ]
    } as CommercialState;

    setState(nextState);
    setCommercialState(nextState);
    fetch("/api/commercial/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment })
    }).catch(() => undefined);
    setEditing(null);
    setDraft({});
  }

  return (
    <div className="board-page board-excel-page">
      <section className="board-excel-header card">
        <div>
          <p className="eyebrow">Mi Pizarra Virtual</p>
          <h2>Pizarra digital comercial</h2>
          <p className="muted">Vista familiar al Excel actual, con leads, llamadas, prioridades, cortes horarios y alertas por ejecutivo.</p>
        </div>
        <div className="board-excel-actions">
          <button className="ghost-button" onClick={() => window.location.reload()}><RefreshCw size={16} /> Actualizar</button>
          <button className="ghost-button" onClick={() => exportRows(filteredRows)}><Download size={16} /> Exportar CSV</button>
          <button className="primary-button" onClick={() => openEditor()}><Plus size={16} /> Nueva fila</button>
        </div>
      </section>

      <section className="board-excel-toolbar card">
        <label><CalendarDays size={15} /> Fecha <input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label><UsersRound size={15} /> Ejecutivo <select value={executiveFilter} onChange={(event) => setExecutiveFilter(event.target.value)}><option>Todos</option>{activeExecutives(state).map((item: any) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
        <label><AlertTriangle size={15} /> Prioridad <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>Todos</option>{priorityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><Clock3 size={15} /> Tipo de corte <select value={mode} onChange={(event) => setMode(event.target.value as SheetMode)}><option value="semana">Cortes de semana</option><option value="finSemana">Cortes fin de semana</option></select></label>
        <label className="board-excel-search"><Search size={15} /> Buscar <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ejecutivo, evento, fuente, codigo" /></label>
      </section>

      <nav className="board-excel-tabs" aria-label="Vistas de Mi Pizarra Virtual">
        {tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      <section className="board-excel-kpis">
        <MetricCard icon={<FileSpreadsheet />} label="Total actual" value={String(kpis.totalCurrent)} helper="Leads por asignar + bloques" />
        <MetricCard icon={<UsersRound />} label="Leads asignados" value={String(kpis.assignedLeads)} helper={`${kpis.pendingLeads} pendientes`} />
        <MetricCard icon={<PhoneCall />} label="Llamadas" value={String(kpis.callsMade)} helper={`Meta ${kpis.dailyGoal}`} />
        <MetricCard icon={<BarChart3 />} label="Avance" value={`${kpis.advance.toFixed(2)}%`} helper={`${kpis.goalCompletion.toFixed(1)}% del objetivo`} />
        <MetricCard icon={<MessageCircle />} label="WhatsApp" value={`${kpis.whatsappResponse.toFixed(1)}%`} helper={`${kpis.messagesReceived} respuestas`} />
        <MetricCard icon={<AlertTriangle />} label="Alertas" value={String(alerts.length)} helper="Acciones sugeridas" />
      </section>

      {tab === "excel" ? (
        <section className="board-excel-grid">
          <div className="board-excel-left card">
            <PorAsignarPanel total={kpis.totalCurrent} />
            <SlotTable title="Usuarios CRM / Kommo" rows={userSlots} highlight />
            <SlotTable title="WhatsApp / Bloqueos" rows={whatsappSlots} />
            <SlotTable title="Otros bloques" rows={extraSlots} />
          </div>

          <div className="board-excel-center card">
            <div className="sheet-title-row">
              <div><p className="eyebrow">Pizarra operativa</p><h3>Eventos por ejecutivo</h3></div>
              <span className="sheet-chip"><Filter size={14} /> {filteredRows.length} filas</span>
            </div>
            <ExcelMainTable rows={filteredRows} onEdit={openEditor} />
          </div>

          <div className="board-excel-right card">
            <SocialMatrix matrix={socialMatrix} />
            <ApiSummary buckets={apiBuckets} />
            <CutSchedule blocks={cutBlocks} mode={mode} />
          </div>
        </section>
      ) : null}

      {tab === "events" ? <EventsView rows={filteredRows} onEdit={openEditor} /> : null}
      {tab === "executives" ? <ExecutivesView rows={filteredRows} state={state} /> : null}
      {tab === "hours" ? <HoursView blocks={cutBlocks} rows={filteredRows} /> : null}
      {tab === "leads" ? <LeadsView state={state} /> : null}
      {tab === "alerts" ? <AlertsView alerts={alerts} rows={filteredRows} /> : null}
      {tab === "config" ? <ConfigView /> : null}

      {editing ? (
        <div className="modal-backdrop">
          <div className="modal board-excel-modal">
            <div className="board-excel-modal-header">
              <div><p className="eyebrow">Mi Pizarra Virtual</p><h2>{editing.id.startsWith("generated-") ? "Crear asignacion" : "Editar fila"}</h2><p className="muted">Los campos guardados actualizan la pizarra y quedan listos para sincronizar con Kommo.</p></div>
              <button className="ghost-button" onClick={() => setEditing(null)}>Cerrar</button>
            </div>
            <div className="board-excel-form-grid">
              <Field label="Ejecutivo"><select value={String(draft.executiveId ?? "")} onChange={(event) => setDraft({ ...draft, executiveId: event.target.value })}><option value="">Seleccionar</option>{activeExecutives(state).map((item: any) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></Field>
              <Field label="Inicio"><input type="date" value={String(draft.eventStartDate ?? "")} onChange={(event) => setDraft({ ...draft, eventStartDate: event.target.value })} /></Field>
              <Field label="Tipo"><input value={String(draft.productType ?? "")} onChange={(event) => setDraft({ ...draft, productType: event.target.value })} /></Field>
              <Field label="Programa / evento"><input value={String(draft.productName ?? "")} onChange={(event) => setDraft({ ...draft, productName: event.target.value })} /></Field>
              <Field label="Codigo"><input value={String(draft.productCode ?? "")} onChange={(event) => setDraft({ ...draft, productCode: event.target.value })} /></Field>
              <Field label="Modalidad"><input value={String(draft.modality ?? "")} onChange={(event) => setDraft({ ...draft, modality: event.target.value })} /></Field>
              <Field label="Cantidad de leads"><input type="number" value={Number(draft.assignedLeadsCount ?? 0)} onChange={(event) => setDraft({ ...draft, assignedLeadsCount: Number(event.target.value) })} /></Field>
              <Field label="Llamadas realizadas"><input type="number" value={Number(draft.callsMade ?? 0)} onChange={(event) => setDraft({ ...draft, callsMade: Number(event.target.value) })} /></Field>
              <Field label="Objetivo diario"><input type="number" value={Number(draft.dailyCallGoal ?? 70)} onChange={(event) => setDraft({ ...draft, dailyCallGoal: Number(event.target.value) })} /></Field>
              <Field label="Prioridad"><select value={String(draft.priority ?? "Media")} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorityOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Fuente"><input value={String(draft.leadSource ?? "Kommo")} onChange={(event) => setDraft({ ...draft, leadSource: event.target.value })} /></Field>
              <Field label="Mensajes / Respuestas"><div className="board-dual-input"><input type="number" value={Number(draft.messagesSent ?? 0)} onChange={(event) => setDraft({ ...draft, messagesSent: Number(event.target.value) })} /><input type="number" value={Number(draft.messagesReceived ?? 0)} onChange={(event) => setDraft({ ...draft, messagesReceived: Number(event.target.value) })} /></div></Field>
            </div>
            <div className="board-excel-modal-actions"><button className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" onClick={saveDraft}>Guardar fila</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PorAsignarPanel({ total }: { total: number }) {
  return (
    <div className="por-asignar-panel">
      <div className="por-asignar-label">POR ASIGNAR</div>
      <div className="por-asignar-value">{total}</div>
    </div>
  );
}

function SlotTable({ title, rows, highlight = false }: { title: string; rows: UserSlot[]; highlight?: boolean }) {
  return (
    <div className="slot-block">
      <div className="slot-title">{title}</div>
      <table className="excel-mini-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th>{row.code}</th>
              <td>{row.range || row.count}</td>
              <td className={row.status ? "restricted-cell" : ""}>{row.status || row.primary}</td>
              {highlight ? <td>{row.secondary}</td> : null}
              {highlight ? <td className="number-cell">{row.count}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExcelMainTable({ rows, onEdit }: { rows: BoardRow[]; onEdit: (row: BoardRow) => void }) {
  const grouped = Array.from(groupBy(rows, (row) => row.executiveName).entries());
  return (
    <div className="excel-table-wrap">
      <table className="excel-board-table">
        <thead>
          <tr>
            <th>Ejecutivo</th>
            <th>Inicio</th>
            <th>Producto / evento</th>
            <th>Cant. leads</th>
            <th>Llamadas</th>
            <th>Avance</th>
            <th>Prioridad</th>
            <th>Objetivo diario</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([executive, items]) => items.map((row, index) => (
            <tr key={row.id} className={row.priority === "Alta" ? "row-high" : row.goalCompletionRate >= 100 ? "row-done" : ""} onDoubleClick={() => onEdit(row)}>
              {index === 0 ? <td className="executive-merged" rowSpan={items.length}>{executive}</td> : null}
              <td className={isSoon(row.eventStartDate) ? "date-cell hot-date" : "date-cell"}>{formatShortDate(row.eventStartDate)}</td>
              <td className="event-cell"><strong>{row.productName}</strong>{row.modality ? <em>({row.modality})</em> : null}</td>
              <td className="number-cell">{row.assignedLeadsCount || ""}</td>
              <td className="number-cell">{row.callsMade || ""}</td>
              <td><span className={`excel-percent ${tone(row.advanceRate)}`}>{row.assignedLeadsCount ? `${row.advanceRate.toFixed(2)}%` : "#DIV/0!"}</span></td>
              <td><span className={`excel-priority ${row.priority.toLowerCase()}`}>{row.priority.toUpperCase()}</span></td>
              <td className="goal-cell">{row.dailyCallGoal} llamada</td>
              <td><span className={`excel-status ${statusTone(row)}`}>{row.status}</span></td>
            </tr>
          )))}
        </tbody>
      </table>
      {!rows.length ? <div className="board-excel-empty">No hay filas con los filtros seleccionados.</div> : null}
    </div>
  );
}

function SocialMatrix({ matrix }: { matrix: Record<string, Record<string, number>> }) {
  return (
    <div className="sheet-side-section">
      <h3>REDES SOCIALES</h3>
      <table className="excel-mini-table matrix-table">
        <thead><tr><th></th>{sourceColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {sourceRows.map((row) => <tr key={row}><th>{row}</th>{sourceColumns.map((column) => <td key={column} className="number-cell">{matrix[row]?.[column] ?? 0}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function ApiSummary({ buckets }: { buckets: ApiBucket[] }) {
  return (
    <div className="sheet-side-section">
      <table className="excel-mini-table api-table">
        <thead><tr><th>API</th><th>Total</th><th></th></tr></thead>
        <tbody>{buckets.map((bucket) => <tr key={bucket.api}><td>{bucket.api}</td><td>{bucket.label}</td><td className="number-cell">{bucket.total}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function CutSchedule({ blocks, mode }: { blocks: CutBlock[]; mode: SheetMode }) {
  const key = mode === "semana" ? "weekdayGoal" : "weekendGoal";
  return (
    <div className="sheet-side-section cuts-section">
      <h3>{mode === "semana" ? "CORTES DE SEMANA" : "CORTES FIN DE SEMANA"}</h3>
      <table className="cut-table"><tbody>{blocks.map((block) => <tr key={block.label}><td>{block.label}</td><td className="number-cell">{block[key] || ""}</td></tr>)}</tbody></table>
    </div>
  );
}

function EventsView({ rows, onEdit }: { rows: BoardRow[]; onEdit: (row: BoardRow) => void }) {
  const events = Array.from(groupBy(rows, (row) => row.productName).entries()).map(([name, items]) => ({
    name,
    start: items[0]?.eventStartDate,
    modality: items[0]?.modality,
    type: items[0]?.productType,
    priority: items.some((item) => item.priority === "Alta") ? "Alta" : items.some((item) => item.priority === "Media") ? "Media" : "Baja",
    leads: sum(items, "assignedLeadsCount"),
    calls: sum(items, "callsMade"),
    goal: sum(items, "dailyCallGoal"),
    sales: sum(items, "salesAmount"),
    first: items[0]
  }));
  return <section className="card board-detail-section"><div className="sheet-title-row"><div><p className="eyebrow">Por evento</p><h3>Gestion por producto</h3></div></div><div className="event-card-grid">{events.map((event) => <article className="event-card" key={event.name} onClick={() => onEdit(event.first)}><strong>{event.name}</strong><span>{event.type} - {event.modality} - Inicio {formatShortDate(event.start)}</span><div className="event-metrics"><b>{event.leads}</b><small>leads</small><b>{event.calls}</b><small>llamadas</small><b>{ratio(event.calls, event.leads).toFixed(1)}%</b><small>avance</small></div><span className={`excel-priority ${String(event.priority).toLowerCase()}`}>{event.priority}</span></article>)}</div></section>;
}

function ExecutivesView({ rows, state }: { rows: BoardRow[]; state: CommercialState }) {
  return (
    <section className="card board-detail-section">
      <div className="sheet-title-row"><div><p className="eyebrow">Por ejecutivo</p><h3>Cumplimiento diario</h3></div></div>
      <div className="executive-card-grid">
        {activeExecutives(state).map((executive: any) => {
          const items = rows.filter((row) => row.executiveId === executive.id);
          const calls = sum(items, "callsMade");
          const goal = sum(items, "dailyCallGoal");
          return <article className="executive-card" key={executive.id}><strong>{executive.fullName}</strong><span>{items[0]?.teamName ?? "Sin equipo"}</span><div className="progress-bar"><i style={{ width: `${Math.min(ratio(calls, goal), 100)}%` }} /></div><div className="board-stat-line"><span>Llamadas</span><b>{calls}/{goal || 0}</b></div><div className="board-stat-line"><span>Leads</span><b>{sum(items, "assignedLeadsCount")}</b></div><div className="board-stat-line"><span>Alta prioridad</span><b>{items.filter((item) => item.priority === "Alta").length}</b></div></article>;
        })}
      </div>
    </section>
  );
}

function HoursView({ blocks, rows }: { blocks: CutBlock[]; rows: BoardRow[] }) {
  const calls = sum(rows, "callsMade");
  const messages = sum(rows, "messagesSent");
  const responses = sum(rows, "messagesReceived");
  return (
    <section className="card board-detail-section">
      <div className="sheet-title-row"><div><p className="eyebrow">Cortes horarios</p><h3>Horarios fuertes</h3></div></div>
      <div className="hour-card-grid">{blocks.map((block) => <article className="hour-card" key={block.label}><strong>{block.label}</strong><span>Peso {(block.weight * 100).toFixed(0)}%</span><div className="board-stat-line"><span>Llamadas estimadas</span><b>{Math.round(calls * block.weight)}</b></div><div className="board-stat-line"><span>WhatsApp</span><b>{Math.round(messages * block.weight)}</b></div><div className="board-stat-line"><span>Respuesta</span><b>{Math.round(responses * block.weight)}</b></div></article>)}</div>
    </section>
  );
}

function LeadsView({ state }: { state: CommercialState }) {
  const leads = Array.isArray((state as any).boardLeads) ? (state as any).boardLeads : [];
  return <section className="card board-detail-section"><div className="sheet-title-row"><div><p className="eyebrow">Por asignar</p><h3>Bandeja de leads</h3></div><span className="sheet-chip">{leads.filter((lead: any) => !lead.assignedTo).length} pendientes</span></div><div className="excel-table-wrap"><table className="excel-board-table compact"><thead><tr><th>Lead</th><th>Telefono</th><th>Fuente</th><th>Campana</th><th>Producto</th><th>Estado</th><th>Score</th></tr></thead><tbody>{leads.map((lead: any) => <tr key={lead.id}><td>{lead.leadName}</td><td>{lead.phone ?? ""}</td><td>{lead.source ?? ""}</td><td>{lead.campaign ?? ""}</td><td>{lead.productInterest ?? ""}</td><td>{lead.kommoStatus ?? "Nuevo"}</td><td>{lead.score ?? 0}</td></tr>)}</tbody></table></div></section>;
}

function AlertsView({ alerts, rows }: { alerts: string[]; rows: BoardRow[] }) {
  return <section className="card board-detail-section"><div className="sheet-title-row"><div><p className="eyebrow">Alertas</p><h3>Control visual</h3></div></div><div className="alert-grid">{alerts.map((alert) => <div className="board-alert-card" key={alert}><AlertTriangle size={18} /><span>{alert}</span></div>)}</div><div className="assistant-card"><strong>Asistente de pizarra</strong><p>{assistantMessage(rows)}</p></div></section>;
}

function ConfigView() {
  return <section className="card board-detail-section"><div className="sheet-title-row"><div><p className="eyebrow">Configuracion</p><h3>Reglas de la pizarra</h3></div></div><div className="config-grid"><article><strong>Objetivo base</strong><span>70 llamadas diarias por fila operativa.</span></article><article><strong>Prioridad Alta</strong><span>Evento próximo, avance bajo o alto volumen de leads.</span></article><article><strong>Cortes</strong><span>8:00 AM, 12:00 PM, 2:30 PM, 5:00 PM, 7:00 PM y 8:45 PM.</span></article><article><strong>Kommo</strong><span>Preparado para alimentar leads, llamadas, mensajes y responsables desde CRM.</span></article></div></section>;
}

function MetricCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return <article className="metric-card card"><span>{icon}</span><small>{label}</small><strong>{value}</strong><em>{helper}</em></article>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="board-field"><span>{label}</span>{children}</label>;
}

function buildRows(state: CommercialState, date: string): BoardRow[] {
  const assignments = Array.isArray((state as any).boardAssignments) ? (state as any).boardAssignments : [];
  const assignmentRows = assignments
    .filter((assignment: any) => !assignment.boardDate || assignment.boardDate === date)
    .map((assignment: any) => normalizeAssignment(state, assignment));

  if (assignmentRows.length) return assignmentRows;

  const programs = Array.isArray((state as any).programs) ? (state as any).programs : [];
  const activePrograms = programs.filter((program: any) => program.active || program.status === "Activo para ventas").slice(0, 8);
  const executives = activeExecutives(state);
  if (!activePrograms.length || !executives.length) return [];

  return activePrograms.map((program: any, index: number) => {
    const executive = executives[index % executives.length];
    const leads = Number(program.leadsCount ?? program.leads ?? 0);
    const calls = Number(program.callsMade ?? 0);
    return normalizeAssignment(state, {
      id: `generated-${program.id ?? index}`,
      boardDate: date,
      executiveId: executive.id,
      teamId: executive.teamId,
      productEditionId: program.id,
      productName: program.name,
      productCode: program.code,
      productType: program.productType,
      modality: program.modality,
      eventStartDate: program.startDate,
      leadSource: program.source ?? "Kommo / Sheet pendiente",
      assignedLeadsCount: leads,
      callsMade: calls,
      dailyCallGoal: 70,
      priority: inferPriority(program.startDate, leads, calls),
      status: inferStatus(calls, leads, 70, program.startDate)
    });
  });
}

function normalizeAssignment(state: CommercialState, assignment: any): BoardRow {
  const executive = findExecutive(state, assignment.executiveId);
  const team = findTeam(state, assignment.teamId ?? executive?.teamId);
  const leads = Number(assignment.assignedLeadsCount ?? assignment.leads ?? 0);
  const calls = Number(assignment.callsMade ?? 0);
  const goal = Number(assignment.dailyCallGoal ?? 70);
  const messagesSent = Number(assignment.messagesSent ?? 0);
  const messagesReceived = Number(assignment.messagesReceived ?? 0);
  const priority = (assignment.priority ?? inferPriority(assignment.eventStartDate, leads, calls)) as Priority;
  const status = String(assignment.status ?? inferStatus(calls, leads, goal, assignment.eventStartDate));
  return {
    id: String(assignment.id ?? crypto.randomUUID()),
    boardDate: String(assignment.boardDate ?? today()),
    executiveId: String(assignment.executiveId ?? executive?.id ?? ""),
    executiveName: String(executive?.fullName ?? assignment.executiveName ?? "Sin ejecutivo"),
    teamName: String(team?.name ?? assignment.teamName ?? "Sin equipo"),
    eventStartDate: assignment.eventStartDate,
    productName: String(assignment.productName ?? assignment.programName ?? "Sin evento"),
    productCode: assignment.productCode,
    productType: assignment.productType,
    modality: assignment.modality,
    leadSource: assignment.leadSource,
    assignedLeadsCount: leads,
    callsMade: calls,
    messagesSent,
    messagesReceived,
    contactsMade: Number(assignment.contactsMade ?? 0),
    salesCount: Number(assignment.salesCount ?? 0),
    salesAmount: Number(assignment.salesAmount ?? 0),
    dailyCallGoal: goal,
    priority,
    status,
    advanceRate: ratio(calls, leads),
    goalCompletionRate: ratio(calls, goal),
    pendingLeads: Math.max(leads - calls, 0),
    lastUpdatedAt: assignment.lastUpdatedAt
  };
}

function buildKpis(rows: BoardRow[], state: CommercialState) {
  const leads = Array.isArray((state as any).boardLeads) ? (state as any).boardLeads : [];
  const unassigned = leads.filter((lead: any) => !lead.assignedTo).length;
  const assignedLeads = sum(rows, "assignedLeadsCount");
  const callsMade = sum(rows, "callsMade");
  const dailyGoal = sum(rows, "dailyCallGoal");
  const messagesSent = sum(rows, "messagesSent");
  const messagesReceived = sum(rows, "messagesReceived");
  const operationalTotal = defaultUserSlots.reduce((total, item) => total + item.count, 0) + defaultWhatsappSlots.reduce((total, item) => total + item.count, 0) + unassigned;
  return {
    totalCurrent: operationalTotal,
    assignedLeads,
    callsMade,
    dailyGoal,
    advance: ratio(callsMade, assignedLeads),
    goalCompletion: ratio(callsMade, dailyGoal),
    pendingLeads: Math.max(assignedLeads - callsMade, 0) + unassigned,
    whatsappResponse: ratio(messagesReceived, messagesSent),
    messagesReceived
  };
}

function buildSocialMatrix(rows: BoardRow[], state: CommercialState) {
  const matrix: Record<string, Record<string, number>> = {};
  sourceRows.forEach((row) => { matrix[row] = {}; sourceColumns.forEach((column) => { matrix[row][column] = 0; }); });
  rows.forEach((row) => {
    const source = (row.leadSource ?? "").toUpperCase();
    const product = `${row.productType ?? ""} ${row.productName}`.toUpperCase();
    const sourceKey = source.includes("INSTAGRAM") || source.includes("IG") ? "IG" : source.includes("TIKTOK") ? "TIKTOK" : "F";
    const columnKey = product.includes("OBST") ? "OBST" : product.includes("DIPLOM") ? "D" : "C";
    matrix[sourceKey][columnKey] += row.assignedLeadsCount ? 1 : 0;
  });
  const leads = Array.isArray((state as any).boardLeads) ? (state as any).boardLeads : [];
  leads.forEach((lead: any) => {
    const source = String(lead.source ?? "").toUpperCase();
    const product = String(lead.productInterest ?? "").toUpperCase();
    const sourceKey = source.includes("INSTAGRAM") || source.includes("IG") ? "IG" : source.includes("TIKTOK") ? "TIKTOK" : "F";
    const columnKey = product.includes("OBST") ? "OBST" : product.includes("DIPLOM") ? "D" : "C";
    matrix[sourceKey][columnKey] += 1;
  });
  return matrix;
}

function buildApiBuckets(rows: BoardRow[]): ApiBucket[] {
  const diplomados = rows.filter((row) => String(row.productType ?? row.productName).toLowerCase().includes("diplom")).length;
  const cursos = rows.filter((row) => String(row.productType ?? row.productName).toLowerCase().includes("curso") || String(row.productName).toLowerCase().includes("taller")).length;
  const obst = rows.filter((row) => String(row.productName).toLowerCase().includes("obst") || String(row.teamName).toLowerCase().includes("guinda")).length;
  return [
    { api: "517", label: "Diplomado", total: diplomados || defaultApiBuckets[0].total },
    { api: "691", label: "Cursos", total: cursos || defaultApiBuckets[1].total },
    { api: "678", label: "Obstetricia", total: obst || defaultApiBuckets[2].total }
  ];
}

function buildCutBlocks(state: CommercialState, rows: BoardRow[]): CutBlock[] {
  const stored = Array.isArray((state as any).boardTimeBlocks) ? (state as any).boardTimeBlocks : [];
  if (!stored.length) return defaultCutBlocks;
  return stored.map((block: any, index: number) => ({
    label: String(block.blockLabel ?? defaultCutBlocks[index]?.label ?? "Corte"),
    weekdayGoal: Number(block.weekdayGoal ?? block.callGoal ?? defaultCutBlocks[index]?.weekdayGoal ?? 0),
    weekendGoal: Number(block.weekendGoal ?? defaultCutBlocks[index]?.weekendGoal ?? 0),
    weight: Number(block.blockWeight ?? defaultCutBlocks[index]?.weight ?? 0.1)
  }));
}

function buildUserSlots(defaults: UserSlot[], rows: BoardRow[]) {
  const byExecutive = groupBy(rows, (row) => firstName(row.executiveName));
  return defaults.map((slot) => ({
    ...slot,
    count: byExecutive.get(firstName(slot.secondary))?.length ?? byExecutive.get(firstName(slot.primary))?.length ?? slot.count
  }));
}

function buildOperationalSlots(defaults: UserSlot[], state: CommercialState) {
  const leads = Array.isArray((state as any).boardLeads) ? (state as any).boardLeads : [];
  return defaults.map((slot) => ({ ...slot, count: slot.count || leads.filter((lead: any) => String(lead.source ?? "").includes(slot.code)).length }));
}

function buildAlerts(rows: BoardRow[], state: CommercialState) {
  const alerts: string[] = [];
  rows.filter((row) => row.priority === "Alta" && row.advanceRate < 20).slice(0, 4).forEach((row) => alerts.push(`${row.executiveName} tiene ${row.assignedLeadsCount} leads en ${row.productName} y avance ${row.advanceRate.toFixed(2)}%.`));
  rows.filter((row) => row.goalCompletionRate < 50 && row.dailyCallGoal > 0).slice(0, 4).forEach((row) => alerts.push(`${row.executiveName} esta debajo del 50% de su objetivo diario en ${row.productName}.`));
  const leads = Array.isArray((state as any).boardLeads) ? (state as any).boardLeads : [];
  const unassigned = leads.filter((lead: any) => !lead.assignedTo).length;
  if (unassigned) alerts.push(`Hay ${unassigned} leads por asignar antes del cierre del dia.`);
  return alerts.length ? alerts : ["Sin alertas criticas con los filtros actuales."];
}

function buildEmptyRow(state: CommercialState, date: string): BoardRow {
  const executive = activeExecutives(state)[0];
  return normalizeAssignment(state, {
    id: `generated-${crypto.randomUUID()}`,
    boardDate: date,
    executiveId: executive?.id ?? "",
    teamId: executive?.teamId,
    productName: "",
    productType: "Curso",
    modality: "Virtual",
    eventStartDate: date,
    leadSource: "Kommo",
    assignedLeadsCount: 0,
    callsMade: 0,
    dailyCallGoal: 70,
    priority: "Media"
  });
}

function activeExecutives(state: CommercialState) {
  return (Array.isArray((state as any).executives) ? (state as any).executives : []).filter((item: any) => item.status === "Activo");
}

function findExecutive(state: CommercialState, id?: string) {
  return (Array.isArray((state as any).executives) ? (state as any).executives : []).find((item: any) => item.id === id);
}

function findTeam(state: CommercialState, id?: string) {
  return (Array.isArray((state as any).teams) ? (state as any).teams : []).find((item: any) => item.id === id);
}

function findOriginalAssignment(state: CommercialState, id: string) {
  return (Array.isArray((state as any).boardAssignments) ? (state as any).boardAssignments : []).find((item: any) => item.id === id) ?? {};
}

function inferPriority(startDate?: string, leads = 0, calls = 0): Priority {
  const days = startDate ? daysBetween(today(), startDate) : 30;
  const advance = ratio(calls, leads);
  if (days <= 7 || (leads >= 200 && advance < 20)) return "Alta";
  if (days <= 15 || advance < 40) return "Media";
  return "Baja";
}

function inferStatus(calls: number, leads: number, goal: number, startDate?: string) {
  const progress = ratio(calls, leads);
  const completion = ratio(calls, goal);
  const urgent = startDate ? daysBetween(today(), startDate) <= 7 : false;
  if (calls <= 0) return "Sin iniciar";
  if (urgent && progress < 20) return "En riesgo";
  if (progress < 20) return "Avance bajo";
  if (completion >= 100) return "Objetivo cumplido";
  if (completion >= 80) return "En ritmo";
  return "En gestion";
}

function assistantMessage(rows: BoardRow[]) {
  const risk = [...rows].sort((a, b) => b.pendingLeads - a.pendingLeads || a.advanceRate - b.advanceRate)[0];
  if (!risk) return "La pizarra esta lista para operar cuando ingresen leads o sincronice Kommo.";
  return `${risk.executiveName} tiene ${risk.assignedLeadsCount} leads en ${risk.productName}, ${risk.callsMade} llamadas y avance ${risk.advanceRate.toFixed(2)}%. Recomiendo revisar esa fila en el proximo corte.`;
}

function exportRows(rows: BoardRow[]) {
  const header = ["Ejecutivo", "Inicio", "Evento", "Leads", "Llamadas", "Avance", "Prioridad", "Objetivo", "Estado"];
  const lines = rows.map((row) => [row.executiveName, formatShortDate(row.eventStartDate), row.productName, row.assignedLeadsCount, row.callsMade, `${row.advanceRate.toFixed(2)}%`, row.priority, row.dailyCallGoal, row.status]);
  const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mi-pizarra-virtual-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function sum(items: any[], key: string) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item) || "Sin grupo";
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return map;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(date?: string) {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  return Math.ceil((end - start) / 86_400_000);
}

function isSoon(date?: string) {
  if (!date) return false;
  const days = daysBetween(today(), date);
  return days >= 0 && days <= 15;
}

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function firstName(value?: string) {
  return String(value ?? "").trim().split(/\s+/)[0].toLowerCase();
}

function tone(value: number) {
  if (value <= 10) return "critical";
  if (value <= 30) return "risk";
  if (value <= 60) return "watch";
  return "good";
}

function statusTone(row: BoardRow) {
  if (row.status === "Objetivo cumplido") return "done";
  if (row.status === "En riesgo" || row.status === "Avance bajo") return "risk";
  if (row.status === "Sin iniciar") return "idle";
  return "active";
}

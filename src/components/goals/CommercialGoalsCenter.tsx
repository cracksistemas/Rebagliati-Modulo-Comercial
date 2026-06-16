"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Pencil,
  RefreshCw,
  Save,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import type { LinkedCommercialData } from "@/lib/commercial/linked-data";
import { saveCommercialGoal, saveCommercialGoalVersion } from "@/lib/supabase/commercial";
import type { CommercialState } from "@/lib/commercial/types";
import type { MonthlyGoal, Sale } from "@/types/sales";

const CURRENT_MONTH = "2026-06";
const DEFAULT_GOAL = 120000;
const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DAY_WEIGHTS = [0.4, 1.1, 1.05, 1, 1, 1.15, 0.7];
const GOAL_CRITERIA_KEY = "reba-goal-criteria-v1";

type ViewScope = "Empresa" | "Equipo" | "Ejecutivo" | "Producto / Curso" | "Canal";
type GoalStatus = "Borrador" | "Activa" | "Cerrada" | "Recalculada" | "Archivada";
type GoalScopeDraft = "Empresa" | "Equipo" | "Ejecutivo";

type GoalCriteria = {
  dayWeights: number[];
  amountMode: "Monto pagado validado" | "Monto neto vendido";
  warningThreshold: number;
  riskThreshold: number;
};

type TeamGoalDraft = {
  id: string;
  name: string;
  color: string;
  leaderId?: string;
  goalAmount: number;
};

type ExecutiveGoalDraft = {
  id: string;
  fullName: string;
  teamId?: string;
  goalAmount: number;
};

type DailyPlan = {
  date: string;
  dayName: string;
  dayType: string;
  weight: number;
  target: number;
  actual: number;
  gap: number;
  expectedAccumulated: number;
  actualAccumulated: number;
  status: string;
};

type WeeklyPlan = {
  weekNumber: number;
  startDate: string;
  endDate: string;
  weight: number;
  target: number;
  actual: number;
  gap: number;
  requiredToClose: number;
  status: string;
};

type GoalMetrics = ReturnType<typeof buildGoalMetrics>;

const DEFAULT_CRITERIA: GoalCriteria = {
  dayWeights: DAY_WEIGHTS,
  amountMode: "Monto pagado validado",
  warningThreshold: 95,
  riskThreshold: 85
};

export function CommercialGoalsCenter() {
  const [data, setData] = useState<LinkedCommercialData | null>(null);
  const [commercialState, setCommercialStateView] = useState<CommercialState>(() => getCommercialState());
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [viewScope, setViewScope] = useState<ViewScope>("Empresa");
  const [goalStatus, setGoalStatus] = useState<GoalStatus>("Activa");
  const [editScope, setEditScope] = useState<GoalScopeDraft>("Empresa");
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formGoal, setFormGoal] = useState(DEFAULT_GOAL);
  const [teamGoals, setTeamGoals] = useState<TeamGoalDraft[]>([]);
  const [executiveGoals, setExecutiveGoals] = useState<ExecutiveGoalDraft[]>([]);
  const [criteria, setCriteria] = useState<GoalCriteria>(() => loadGoalCriteria());
  const [statusMessage, setStatusMessage] = useState("");
  const [changeReason, setChangeReason] = useState("");

  useEffect(() => {
    hydrate();
  }, []);

  async function hydrate() {
    let current = getCommercialState();
    try {
      const response = await fetch("/api/commercial/snapshot", { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; data?: Partial<CommercialState> };
      if (response.ok && payload.ok && payload.data) {
        current = {
          ...current,
          teams: Array.isArray(payload.data.teams) ? payload.data.teams : current.teams,
          executives: Array.isArray(payload.data.executives) ? payload.data.executives : current.executives,
          sales: Array.isArray(payload.data.sales) ? payload.data.sales : current.sales
        };
        setCommercialState(current);
      }
    } catch {
      undefined;
    }
    const linkedData = buildLinkedDataFromCommercialState(current, selectedMonth);
    setCommercialStateView(current);
    setData(linkedData);
    setFormGoal(current.companyGoal || DEFAULT_GOAL);
    setTeamGoals(current.teams.map((team) => ({ id: team.id, name: team.name, color: team.color, leaderId: team.leaderId, goalAmount: Number(team.goalAmount ?? 0) })));
    setExecutiveGoals(current.executives.filter((executive) => executive.status === "Activo").map((executive) => ({ id: executive.id, fullName: executive.fullName, teamId: executive.teamId, goalAmount: Number(executive.goalAmount ?? 0) })));
  }

  const metrics = useMemo(() => buildGoalMetrics(data, selectedMonth, formGoal, criteria), [criteria, data, selectedMonth, formGoal]);

  async function saveGoal() {
    if (!data || formGoal <= 0 || !changeReason.trim()) return;
    setSaving(true);
    const existing = findCompanyGoal(data, selectedMonth);
    const previousAmount = existing?.goalAmount ?? 0;
    const nextGoal: MonthlyGoal = {
      id: existing?.id ?? crypto.randomUUID(),
      month: `${selectedMonth}-01`,
      scope: "company",
      goalAmount: formGoal,
      goalPoints: existing?.goalPoints ?? 0
    };

    const nextCommercialState: CommercialState = {
      ...commercialState,
      companyGoal: formGoal,
      teams: commercialState.teams.map((team) => {
        const draft = teamGoals.find((item) => item.id === team.id);
        return draft ? { ...team, goalAmount: Math.max(Number(draft.goalAmount ?? 0), 0) } : team;
      }),
      executives: commercialState.executives.map((executive) => {
        const draft = executiveGoals.find((item) => item.id === executive.id);
        return draft ? { ...executive, goalAmount: Math.max(Number(draft.goalAmount ?? 0), 0) } : executive;
      }),
      audit: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("es-PE"),
          actor: "Administrador Comercial",
          action: "Actualizo metas comerciales",
          module: "Metas",
          target: `${selectedMonth} · ${editScope}`,
          result: "Exitoso",
          criticality: "Alta",
          before: money(previousAmount),
          after: money(formGoal)
        },
        ...commercialState.audit
      ]
    };
    setCommercialState(nextCommercialState);
    setCommercialStateView(nextCommercialState);
    setData(buildLinkedDataFromCommercialState(nextCommercialState, selectedMonth));
    setStatusMessage("Metas guardadas y replicadas en Dashboard, Equipos y Ejecutivos.");

    try {
      await saveCommercialGoal(nextGoal);
      await saveCommercialGoalVersion(nextGoal.id, previousAmount, formGoal, changeReason.trim()).catch((error) => {
        console.warn("No se pudo guardar version de meta", error);
      });
      await persistTeamGoalDrafts(nextCommercialState, teamGoals);
      await persistExecutiveGoalDrafts(nextCommercialState, executiveGoals);
    } finally {
      setSaving(false);
      setEditOpen(false);
      setChangeReason("");
    }
  }

  function exportSummary() {
    const rows = [
      ["Indicador", "Valor"],
      ["Meta mensual", money(metrics.goalAmount)],
      ["Venta acumulada", money(metrics.accumulated)],
      ["Avance real", pct(metrics.progressPct)],
      ["Avance esperado", pct(metrics.expectedProgressPct)],
      ["Brecha", money(metrics.gap)],
      ["Venta diaria requerida", money(metrics.requiredDailySales)],
      ["Pronostico esperado", money(metrics.smartForecast)],
      ["Estado", metrics.complianceStatus],
      ["Confianza", metrics.confidence]
    ];
    downloadCsv("metas-comerciales.csv", rows);
  }

  function openGoalEditor(scope: GoalScopeDraft) {
    setEditScope(scope);
    setEditOpen(true);
    setStatusMessage("");
  }

  function recalculateDistribution() {
    const company = Math.max(formGoal, 1);
    const teamBase = commercialState.teams.length ? Math.round(company / commercialState.teams.length) : 0;
    const executiveBase = commercialState.executives.filter((executive) => executive.status === "Activo").length
      ? Math.round(company / commercialState.executives.filter((executive) => executive.status === "Activo").length)
      : 0;
    setTeamGoals((items) => items.map((item) => ({ ...item, goalAmount: teamBase })));
    setExecutiveGoals((items) => items.map((item) => ({ ...item, goalAmount: executiveBase })));
    setGoalStatus("Recalculada");
    setStatusMessage("Distribucion recalculada. Revisa y guarda para replicar en los demas modulos.");
  }

  if (!data) {
    return (
      <section className="card card-pad goal-loading">
        <RefreshCw size={22} />
        <strong>Cargando metas comerciales...</strong>
      </section>
    );
  }

  return (
    <div className="goals-center page-stack">
      <section className="goals-hero card card-pad">
        <div>
          <p className="eyebrow">Metas comerciales</p>
          <h2>Configuracion de metas comerciales</h2>
          <p className="muted">Planifica meta mensual, ritmo diario, brechas, pronostico y acciones comerciales.</p>
        </div>
        <div className="goal-controls">
          <label>
            Mes
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </label>
          <label>
            Vista
            <select value={viewScope} onChange={(event) => setViewScope(event.target.value as ViewScope)}>
              <option>Empresa</option>
              <option>Equipo</option>
              <option>Ejecutivo</option>
              <option>Producto / Curso</option>
              <option>Canal</option>
            </select>
          </label>
          <Button className="goal-edit-button" onClick={() => openGoalEditor("Empresa")}><Pencil size={17} /> Editar meta</Button>
        </div>
      </section>

      {statusMessage ? <div className="validation-toast goals-status-toast">{statusMessage}</div> : null}

      <section className="goal-kpi-grid">
        <GoalKpi label="Meta mensual" value={money(metrics.goalAmount)} helper="Venta neta activa" icon={<Target size={20} />} />
        <GoalKpi label="Venta acumulada" value={money(metrics.accumulated)} helper={`${metrics.validSalesCount} ventas validadas`} icon={<CheckCircle2 size={20} />} />
        <GoalKpi label="Avance real" value={pct(metrics.progressPct)} helper={`Esperado ${pct(metrics.expectedProgressPct)}`} icon={<TrendingUp size={20} />} />
        <GoalKpi label="Meta restante" value={metrics.gap > 0 ? money(metrics.gap) : "Meta superada"} helper="Brecha contra objetivo" icon={<AlertTriangle size={20} />} />
        <GoalKpi label="Pronostico esperado" value={money(metrics.smartForecast)} helper={`Confianza ${metrics.confidence}`} icon={<Bot size={20} />} />
        <GoalKpi label="Venta requerida hoy" value={money(metrics.requiredDailySales)} helper={`${metrics.remainingDays} dias restantes`} icon={<CalendarDays size={20} />} />
        <GoalKpi label="Estado" value={metrics.complianceStatus} helper={`Ritmo ${metrics.commercialRhythm.toFixed(2)}x`} tone={metrics.tone} icon={<Target size={20} />} />
        <GoalKpi label="Brecha al dia" value={money(metrics.currentGap)} helper={metrics.currentGap >= 0 ? "Adelantados" : "Atrasados"} tone={metrics.currentGap >= 0 ? "success" : "warning"} icon={<TrendingUp size={20} />} />
      </section>

      <section className="goals-layout">
        <article className="card card-pad">
          <div className="goals-section-title">
            <div>
              <p className="eyebrow">Pronostico de cierre</p>
              <h3>Escenarios comerciales</h3>
            </div>
            <span className={`goal-status goal-status-${metrics.tone}`}>{metrics.complianceStatus}</span>
          </div>
          <div className="forecast-grid">
            <ForecastCard label="Conservador" value={metrics.conservativeForecast} />
            <ForecastCard label="Esperado" value={metrics.smartForecast} featured />
            <ForecastCard label="Optimista" value={metrics.optimisticForecast} />
          </div>
          <div className="forecast-detail">
            <span>Lineal: <strong>{money(metrics.linearForecast)}</strong></span>
            <span>Ponderado: <strong>{money(metrics.weightedForecast)}</strong></span>
            <span>Promedio 7 dias: <strong>{money(metrics.movingAverageForecast)}</strong></span>
          </div>
        </article>

        <article className="card card-pad assistant-card">
          <p className="eyebrow">Asistente de metas</p>
          <h3>Recomendaciones del sistema</h3>
          <div className="assistant-list">
            {metrics.recommendations.map((item) => (
              <div key={item}><Bot size={18} /><span>{item}</span></div>
            ))}
          </div>
        </article>
      </section>

      <section className="goals-action-bar card card-pad">
        <Button onClick={() => openGoalEditor("Empresa")}><Target size={17} /> Crear nueva meta</Button>
        <Button variant="secondary" onClick={recalculateDistribution}><RefreshCw size={17} /> Recalcular distribucion</Button>
        <Button variant="secondary" onClick={() => setImportOpen(true)}><FileSpreadsheet size={17} /> Importar historico</Button>
        <Button variant="secondary" onClick={exportSummary}><Download size={17} /> Exportar reporte</Button>
        <Button variant="secondary" onClick={() => setCriteriaOpen(true)}><Pencil size={17} /> Configurar criterios</Button>
        <Button variant="secondary" onClick={() => setCloseOpen(true)}><History size={17} /> Cerrar periodo</Button>
      </section>

      <section className="goals-layout">
        <article className="card card-pad">
          <div className="goals-section-title">
            <div>
              <p className="eyebrow">Distribucion semanal</p>
              <h3>Plan semanal de ventas</h3>
            </div>
          </div>
          <div className="goal-table-wrap">
            <table className="goal-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Rango</th>
                  <th>Peso</th>
                  <th>Meta</th>
                  <th>Venta real</th>
                  <th>Brecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {metrics.weeklyPlan.map((week) => (
                  <tr key={week.weekNumber}>
                    <td>Semana {week.weekNumber}</td>
                    <td>{formatShortDate(week.startDate)} - {formatShortDate(week.endDate)}</td>
                    <td>{pct(week.weight * 100)}</td>
                    <td>{money(week.target)}</td>
                    <td>{money(week.actual)}</td>
                    <td>{money(week.gap)}</td>
                    <td><span className={`mini-state ${statusTone(week.status)}`}>{week.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card-pad">
          <div className="goals-section-title">
            <div>
              <p className="eyebrow">Alertas inteligentes</p>
              <h3>Control automatico</h3>
            </div>
          </div>
          <div className="goal-alert-list">
            {metrics.alerts.map((alert) => (
              <div className={`goal-alert ${alert.severity}`} key={alert.title}>
                <AlertTriangle size={18} />
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.description}</span>
                  <small>{alert.recommendation}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card card-pad">
        <div className="goals-section-title">
          <div>
            <p className="eyebrow">Distribucion diaria</p>
            <h3>Plan diario de ventas</h3>
          </div>
          <span className="muted">Pesos iniciales por dia de semana</span>
        </div>
        <div className="goal-table-wrap">
          <table className="goal-table compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Dia</th>
                <th>Tipo</th>
                <th>Peso</th>
                <th>Meta diaria</th>
                <th>Venta real</th>
                <th>Brecha</th>
                <th>Acum. esperado</th>
                <th>Acum. real</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {metrics.dailyPlan.map((day) => (
                <tr key={day.date}>
                  <td>{formatShortDate(day.date)}</td>
                  <td>{day.dayName}</td>
                  <td>{day.dayType}</td>
                  <td>{day.weight.toFixed(2)}</td>
                  <td>{money(day.target)}</td>
                  <td>{money(day.actual)}</td>
                  <td>{money(day.gap)}</td>
                  <td>{money(day.expectedAccumulated)}</td>
                  <td>{money(day.actualAccumulated)}</td>
                  <td><span className={`mini-state ${statusTone(day.status)}`}>{day.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="goals-layout">
        <RankingPanel title="Ranking de equipos contra meta" rows={metrics.teamRanking} />
        <RankingPanel title="Ranking de ejecutivos contra meta" rows={metrics.executiveRanking} />
      </section>

      <GoalEditModal
        open={editOpen}
        scope={editScope}
        goalAmount={formGoal}
        teamGoals={teamGoals}
        executiveGoals={executiveGoals}
        goalStatus={goalStatus}
        changeReason={changeReason}
        metrics={metrics}
        saving={saving}
        teams={commercialState.teams}
        onGoalChange={setFormGoal}
        onTeamGoalsChange={setTeamGoals}
        onExecutiveGoalsChange={setExecutiveGoals}
        onScopeChange={setEditScope}
        onStatusChange={setGoalStatus}
        onReasonChange={setChangeReason}
        onClose={() => setEditOpen(false)}
        onSave={saveGoal}
      />
      <ImportHistoryModal
        open={importOpen}
        onImported={(message) => setStatusMessage(message)}
        onClose={() => setImportOpen(false)}
      />
      <CriteriaModal
        open={criteriaOpen}
        criteria={criteria}
        onSave={(next) => {
          setCriteria(next);
          saveGoalCriteria(next);
          setCriteriaOpen(false);
          setStatusMessage("Criterios actualizados. El pronostico y la distribucion se recalcularon.");
        }}
        onClose={() => setCriteriaOpen(false)}
      />
      <ClosePeriodModal open={closeOpen} metrics={metrics} onClose={() => setCloseOpen(false)} onConfirm={() => {
        setGoalStatus("Cerrada");
        setCloseOpen(false);
        setStatusMessage("Periodo marcado como cerrado en el modulo. Guarda cambios si deseas consolidarlo como meta cerrada.");
      }} />
    </div>
  );
}

function buildGoalMetrics(data: LinkedCommercialData | null, month: string, fallbackGoal: number, criteria: GoalCriteria = DEFAULT_CRITERIA) {
  const goalAmount = Math.max(findCompanyGoal(data, month)?.goalAmount ?? fallbackGoal ?? DEFAULT_GOAL, 1);
  const startDate = `${month}-01`;
  const endDate = getMonthEnd(month);
  const today = clampDate(toDateString(new Date()), startDate, endDate);
  const days = getDateRange(startDate, endDate);
  const elapsedDays = days.filter((day) => day <= today).length || 1;
  const remainingDays = Math.max(days.filter((day) => day > today).length, 1);
  const businessDaysElapsed = days.filter((day) => day <= today && isBusinessDay(day)).length || 1;
  const businessDaysRemaining = Math.max(days.filter((day) => day > today && isBusinessDay(day)).length, 1);
  const sales = getValidSalesForMonth(data?.sales ?? [], month);
  const validSalesCount = sales.length;
  const salesByDate = sumSalesByDate(sales, criteria);
  const accumulated = sales.reduce((sum, sale) => sum + saleAmountForGoal(sale, criteria), 0);
  const totalWeight = days.reduce((sum, day) => sum + getDayWeight(day, criteria), 0) || 1;

  let expectedAccumulated = 0;
  let actualAccumulated = 0;
  const dailyPlan: DailyPlan[] = days.map((day) => {
    const target = goalAmount * (getDayWeight(day, criteria) / totalWeight);
    const actual = salesByDate[day] ?? 0;
    expectedAccumulated += target;
    actualAccumulated += actual;
    const gap = actual - target;
    return {
      date: day,
      dayName: WEEKDAY_LABELS[getDayIndex(day)],
      dayType: inferDayType(day),
      weight: getDayWeight(day, criteria),
      target,
      actual,
      gap,
      expectedAccumulated,
      actualAccumulated,
      status: getStatusFromRatio(actual, target, criteria)
    };
  });

  const expectedToDate = dailyPlan.find((day) => day.date === today)?.expectedAccumulated ?? 0;
  const expectedProgressPct = (expectedToDate / goalAmount) * 100;
  const progressPct = (accumulated / goalAmount) * 100;
  const gap = Math.max(goalAmount - accumulated, 0);
  const currentGap = accumulated - expectedToDate;
  const commercialRhythm = expectedToDate ? accumulated / expectedToDate : 1;
  const dailyAverage = accumulated / elapsedDays;
  const businessDailyAverage = accumulated / businessDaysElapsed;
  const requiredDailySales = gap / remainingDays;
  const requiredBusinessDailySales = gap / businessDaysRemaining;
  const linearForecast = dailyAverage * days.length;
  const businessForecast = businessDailyAverage * days.filter(isBusinessDay).length;
  const weightedForecast = expectedToDate ? accumulated / (expectedToDate / goalAmount) : linearForecast;
  const last7 = dailyPlan.filter((day) => day.date <= today).slice(-7);
  const movingAverage = last7.reduce((sum, day) => sum + day.actual, 0) / Math.max(last7.length, 1);
  const movingAverageForecast = accumulated + movingAverage * remainingDays;
  const smartForecast = weightedForecast * 0.5 + movingAverageForecast * 0.3 + linearForecast * 0.2;
  const conservativeForecast = smartForecast * 0.9;
  const optimisticForecast = smartForecast * 1.1;
  const complianceStatus = getComplianceStatus(accumulated, goalAmount, progressPct, expectedProgressPct);
  const tone = getTone(complianceStatus);
  const confidence = getConfidence(data, sales);
  const weeklyPlan = buildWeeklyPlan(dailyPlan, criteria);
  const alerts = buildAlerts({ goalAmount, accumulated, gap, requiredDailySales, expectedToDate, smartForecast, weeklyPlan, dailyPlan, confidence });
  const recommendations = buildRecommendations({ goalAmount, gap, requiredDailySales, smartForecast, currentGap, weeklyPlan, confidence });
  const teamRanking = buildTeamRanking(data, sales, goalAmount, criteria);
  const executiveRanking = buildExecutiveRanking(data, sales, goalAmount, criteria);

  return {
    goalAmount,
    accumulated,
    validSalesCount,
    progressPct,
    expectedProgressPct,
    gap,
    currentGap,
    commercialRhythm,
    elapsedDays,
    remainingDays,
    businessDaysElapsed,
    businessDaysRemaining,
    dailyAverage,
    requiredDailySales,
    requiredBusinessDailySales,
    linearForecast,
    businessForecast,
    weightedForecast,
    movingAverageForecast,
    smartForecast,
    conservativeForecast,
    optimisticForecast,
    complianceStatus,
    tone,
    confidence,
    dailyPlan,
    weeklyPlan,
    alerts,
    recommendations,
    teamRanking,
    executiveRanking
  };
}

function GoalKpi({ label, value, helper, icon, tone = "accent" }: { label: string; value: string; helper: string; icon: ReactNode; tone?: string }) {
  return (
    <article className={`card goal-kpi goal-kpi-${tone}`}>
      <div className="goal-kpi-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function ForecastCard({ label, value, featured = false }: { label: string; value: number; featured?: boolean }) {
  return (
    <div className={featured ? "forecast-card is-featured" : "forecast-card"}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}

function RankingPanel({ title, rows }: { title: string; rows: { name: string; goal: number; actual: number; progress: number; gap: number; status: string }[] }) {
  return (
    <article className="card card-pad">
      <p className="eyebrow">Cumplimiento</p>
      <h3>{title}</h3>
      <div className="goal-ranking-list">
        {rows.map((row, index) => (
          <div className="goal-ranking-row" key={row.name}>
            <strong>#{index + 1}</strong>
            <div>
              <b>{row.name}</b>
              <span>{money(row.actual)} de {money(row.goal)}</span>
            </div>
            <span>{pct(row.progress)}</span>
            <i className={`mini-state ${statusTone(row.status)}`}>{row.status}</i>
          </div>
        ))}
      </div>
    </article>
  );
}

function GoalEditModal(props: {
  open: boolean;
  scope: GoalScopeDraft;
  goalAmount: number;
  teamGoals: TeamGoalDraft[];
  executiveGoals: ExecutiveGoalDraft[];
  goalStatus: GoalStatus;
  changeReason: string;
  metrics: GoalMetrics;
  saving: boolean;
  teams: CommercialState["teams"];
  onGoalChange: (value: number) => void;
  onTeamGoalsChange: (value: TeamGoalDraft[]) => void;
  onExecutiveGoalsChange: (value: ExecutiveGoalDraft[]) => void;
  onScopeChange: (value: GoalScopeDraft) => void;
  onStatusChange: (value: GoalStatus) => void;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const canSave = props.goalAmount > 0 && props.changeReason.trim().length >= 6 && !props.saving;
  const projectedProgress = props.goalAmount ? (props.metrics.accumulated / props.goalAmount) * 100 : 0;
  const projectedGap = Math.max(props.goalAmount - props.metrics.accumulated, 0);
  const variation = props.goalAmount - props.metrics.goalAmount;
  return (
    <Modal open={props.open} title="Editar metas comerciales" description="Define metas oficiales para empresa, equipos y ejecutivos. Los cambios alimentan Dashboard, Equipos, Ejecutivos y Ranking." onClose={props.onClose}>
      <div className="goal-edit-modal">
        <div className="goal-scope-tabs">
          {(["Empresa", "Equipo", "Ejecutivo"] as GoalScopeDraft[]).map((scope) => (
            <button key={scope} className={props.scope === scope ? "active" : ""} type="button" onClick={() => props.onScopeChange(scope)}>
              {scope}
            </button>
          ))}
        </div>

        <div className="goal-edit-summary">
          <div>
            <span>Meta actual</span>
            <strong>{money(props.metrics.goalAmount)}</strong>
          </div>
          <div>
            <span>Nueva meta</span>
            <strong>{money(props.goalAmount)}</strong>
          </div>
          <div className={variation >= 0 ? "is-watch" : "is-good"}>
            <span>Variacion</span>
            <strong>{variation >= 0 ? "+" : ""}{money(variation)}</strong>
          </div>
        </div>

        {props.scope === "Empresa" ? (
          <div className="goals-modal-grid">
            <label>
              Periodo
              <input value="Junio 2026" readOnly />
            </label>
            <label>
              Estado de meta
              <select value={props.goalStatus} onChange={(event) => props.onStatusChange(event.target.value as GoalStatus)}>
                <option>Borrador</option>
                <option>Activa</option>
                <option>Cerrada</option>
                <option>Recalculada</option>
                <option>Archivada</option>
              </select>
            </label>
            <label className="wide goal-amount-field">
              Meta mensual empresa
              <input type="number" min={1} value={props.goalAmount || ""} onChange={(event) => props.onGoalChange(Number(event.target.value || 0))} autoFocus />
            </label>
            <div className="goal-readonly-grid wide">
              <span>Acumulado actual <strong>{money(props.metrics.accumulated)}</strong></span>
              <span>Avance con nueva meta <strong>{pct(projectedProgress)}</strong></span>
              <span>Brecha proyectada <strong>{money(projectedGap)}</strong></span>
              <span>Venta diaria requerida <strong>{money(props.metrics.requiredDailySales)}</strong></span>
            </div>
            <label className="wide">
              Motivo del cambio
              <textarea value={props.changeReason} onChange={(event) => props.onReasonChange(event.target.value)} placeholder="Ej. Ajuste por incremento de campañas activas, nuevo objetivo de gerencia o redistribución mensual." />
              <small>{props.changeReason.trim().length < 6 ? "Es obligatorio registrar un motivo para auditoria." : "El motivo quedara registrado en auditoria."}</small>
            </label>
          </div>
        ) : null}

        {props.scope === "Equipo" ? (
          <EditableGoalList
            title="Metas por equipo"
            rows={props.teamGoals.map((team) => ({ id: team.id, name: team.name, helper: props.teams.find((item) => item.id === team.id)?.leaderId ? "Con lider asignado" : "Sin lider asignado", goalAmount: team.goalAmount }))}
            onChange={(id, goalAmount) => props.onTeamGoalsChange(props.teamGoals.map((item) => item.id === id ? { ...item, goalAmount } : item))}
          />
        ) : null}

        {props.scope === "Ejecutivo" ? (
          <EditableGoalList
            title="Metas por ejecutivo"
            rows={props.executiveGoals.map((executive) => ({ id: executive.id, name: executive.fullName, helper: props.teams.find((team) => team.id === executive.teamId)?.name ?? "Sin equipo", goalAmount: executive.goalAmount }))}
            onChange={(id, goalAmount) => props.onExecutiveGoalsChange(props.executiveGoals.map((item) => item.id === id ? { ...item, goalAmount } : item))}
          />
        ) : null}
      </div>
      <div className="editor-actions goal-editor-actions">
        <Button variant="secondary" onClick={props.onClose}>Cancelar</Button>
        <Button disabled={!canSave} onClick={props.onSave}><Save size={17} /> {props.saving ? "Guardando..." : "Guardar meta"}</Button>
      </div>
    </Modal>
  );
}

function EditableGoalList({ title, rows, onChange }: { title: string; rows: { id: string; name: string; helper: string; goalAmount: number }[]; onChange: (id: string, goalAmount: number) => void }) {
  return (
    <div className="goal-edit-list">
      <div className="goals-section-title">
        <div>
          <p className="eyebrow">Distribucion</p>
          <h3>{title}</h3>
        </div>
        <span className="muted">Edita y guarda para replicar</span>
      </div>
      {rows.map((row) => (
        <div className="goal-edit-row" key={row.id}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.helper}</span>
          </div>
          <input type="number" min={0} value={row.goalAmount || ""} onChange={(event) => onChange(row.id, Number(event.target.value || 0))} />
        </div>
      ))}
      {!rows.length ? <div className="empty-goal-state"><Target size={24} /><strong>No hay registros activos.</strong></div> : null}
    </div>
  );
}

function ImportHistoryModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (message: string) => void }) {
  const [text, setText] = useState("");
  const parsedRows = useMemo(() => parseHistoricalRows(text), [text]);
  return (
    <Modal open={open} title="Importar historico" description="Pega filas con formato fecha,monto para análisis de referencia. No crea ventas oficiales ni altera ranking." onClose={onClose}>
      <div className="goal-import-modal">
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={"2026-06-01,1500\n2026-06-02,2300"} />
        <div className="goal-readonly-grid">
          <span>Filas detectadas <strong>{parsedRows.length}</strong></span>
          <span>Monto referencial <strong>{money(parsedRows.reduce((sum, row) => sum + row.amount, 0))}</strong></span>
          <span>Estado <strong>{parsedRows.length ? "Listo" : "Pendiente"}</strong></span>
        </div>
        <div className="editor-actions">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!parsedRows.length} onClick={() => {
            window.localStorage.setItem("reba-goal-history-import", JSON.stringify(parsedRows));
            onImported(`Historico referencial importado: ${parsedRows.length} filas. No impacta ventas oficiales.`);
            onClose();
          }}><FileSpreadsheet size={17} /> Guardar historico</Button>
        </div>
      </div>
    </Modal>
  );
}

function CriteriaModal({ open, criteria, onClose, onSave }: { open: boolean; criteria: GoalCriteria; onClose: () => void; onSave: (criteria: GoalCriteria) => void }) {
  const [draft, setDraft] = useState(criteria);
  useEffect(() => setDraft(criteria), [criteria, open]);
  return (
    <Modal open={open} title="Configurar criterios" description="Ajusta pesos por día, modo de monto y umbrales del semáforo comercial." onClose={onClose}>
      <div className="criteria-modal">
        <label className="field">
          <span>Monto que impacta meta</span>
          <select value={draft.amountMode} onChange={(event) => setDraft({ ...draft, amountMode: event.target.value as GoalCriteria["amountMode"] })}>
            <option>Monto pagado validado</option>
            <option>Monto neto vendido</option>
          </select>
        </label>
        <div className="criteria-weight-grid">
          {WEEKDAY_LABELS.map((day, index) => (
            <label key={day}>
              {day}
              <input type="number" min={0} step={0.05} value={draft.dayWeights[index] ?? 1} onChange={(event) => {
                const next = [...draft.dayWeights];
                next[index] = Number(event.target.value || 0);
                setDraft({ ...draft, dayWeights: next });
              }} />
            </label>
          ))}
        </div>
        <div className="goals-modal-grid">
          <label>
            Umbral alerta leve (%)
            <input type="number" min={1} value={draft.warningThreshold} onChange={(event) => setDraft({ ...draft, warningThreshold: Number(event.target.value || 95) })} />
          </label>
          <label>
            Umbral riesgo (%)
            <input type="number" min={1} value={draft.riskThreshold} onChange={(event) => setDraft({ ...draft, riskThreshold: Number(event.target.value || 85) })} />
          </label>
        </div>
        <div className="editor-actions">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(draft)}><Save size={17} /> Guardar criterios</Button>
        </div>
      </div>
    </Modal>
  );
}

function ClosePeriodModal({ open, metrics, onClose, onConfirm }: { open: boolean; metrics: GoalMetrics; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} title="Cerrar periodo" description="Antes de cerrar, revisa el resumen que alimentara el historico comercial." onClose={onClose}>
      <div className="close-summary">
        <span>Meta mensual <strong>{money(metrics.goalAmount)}</strong></span>
        <span>Venta final actual <strong>{money(metrics.accumulated)}</strong></span>
        <span>Cumplimiento <strong>{pct(metrics.progressPct)}</strong></span>
        <span>Brecha final <strong>{money(metrics.gap)}</strong></span>
        <span>Pronostico esperado <strong>{money(metrics.smartForecast)}</strong></span>
        <span>Estado <strong>{metrics.complianceStatus}</strong></span>
      </div>
      <div className="editor-actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirm}><CheckCircle2 size={17} /> Confirmar cierre</Button>
      </div>
    </Modal>
  );
}

function buildLinkedDataFromCommercialState(state: CommercialState, month: string): LinkedCommercialData {
  const productTypes = Array.from(new Set(state.sales.map((sale) => String(sale.productType || "Curso")))).map((name) => ({
    id: name,
    code: productCode(name),
    name,
    pointWeight: name === "Diplomado" ? 4 : name === "Curso Modular" ? 2 : 1
  }));

  return {
    source: "local",
    status: "Datos comerciales sincronizados",
    executives: state.executives.map((executive) => ({
      id: executive.id,
      code: executive.code,
      fullName: executive.fullName,
      photoUrl: executive.photoUrl ?? "",
      shift: executive.shift,
      status: executive.status === "Baja" ? "Inactivo" : executive.status,
      teamId: executive.teamId ?? "",
      previousRank: executive.previousRank ?? 99,
      goalAmount: executive.goalAmount
    } as any)),
    teams: state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      leaderId: team.leaderId ?? "",
      monthlyGoal: Number(team.goalAmount ?? 0),
      active: team.active
    })),
    sales: state.sales.map((sale) => ({
      id: sale.id,
      saleDate: sale.saleDate,
      executiveId: sale.executiveId,
      teamId: sale.teamId ?? "",
      productTypeId: String(sale.productType || "Curso"),
      productId: sale.productId ?? "",
      quantity: sale.quantity,
      grossAmount: sale.grossAmount,
      discountAmount: sale.discountAmount,
      netAmount: sale.netAmount,
      paidAmount: sale.paidAmount,
      pendingAmount: sale.pendingAmount,
      modality: sale.modality,
      attentionChannel: sale.attentionChannel,
      paymentConcept: sale.paymentConcept,
      billingType: sale.billingType,
      paymentMethod: sale.paymentMethod,
      leadSource: sale.leadSource,
      validationStatus: sale.validationStatus,
      notes: sale.notes
    } as any)),
    productTypes: productTypes as any,
    monthlyGoals: [
      {
        id: `goal-company-${month}`,
        month: `${month}-01`,
        scope: "company",
        goalAmount: Number(state.companyGoal ?? DEFAULT_GOAL),
        goalPoints: 0
      },
      ...state.teams.map((team) => ({
        id: `goal-team-${team.id}-${month}`,
        month: `${month}-01`,
        scope: "team" as const,
        teamId: team.id,
        goalAmount: Number(team.goalAmount ?? 0),
        goalPoints: 0
      })),
      ...state.executives.map((executive) => ({
        id: `goal-executive-${executive.id}-${month}`,
        month: `${month}-01`,
        scope: "executive" as const,
        executiveId: executive.id,
        goalAmount: Number(executive.goalAmount ?? 0),
        goalPoints: 0
      }))
    ]
  };
}

function productCode(name: string) {
  if (name === "Curso Modular") return "CM";
  if (name === "Diplomado") return "D";
  if (name === "Taller") return "T";
  if (name === "Seminario") return "S";
  return "C";
}

async function persistTeamGoalDrafts(state: CommercialState, teamGoals: TeamGoalDraft[]) {
  await Promise.allSettled(teamGoals.map((draft) => {
    const team = state.teams.find((item) => item.id === draft.id);
    if (!team) return Promise.resolve();
    const memberIds = state.executives.filter((executive) => executive.teamId === team.id && executive.status === "Activo").map((executive) => executive.id);
    return fetch("/api/commercial/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...team, goalAmount: draft.goalAmount, memberIds })
    });
  }));
}

async function persistExecutiveGoalDrafts(state: CommercialState, executiveGoals: ExecutiveGoalDraft[]) {
  await Promise.allSettled(executiveGoals.map((draft) => {
    const executive = state.executives.find((item) => item.id === draft.id);
    if (!executive) return Promise.resolve();
    return fetch("/api/commercial/executives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...executive, goalAmount: draft.goalAmount })
    });
  }));
}

function loadGoalCriteria(): GoalCriteria {
  if (typeof window === "undefined") return DEFAULT_CRITERIA;
  try {
    const raw = window.localStorage.getItem(GOAL_CRITERIA_KEY);
    if (!raw) return DEFAULT_CRITERIA;
    const parsed = JSON.parse(raw) as Partial<GoalCriteria>;
    return {
      ...DEFAULT_CRITERIA,
      ...parsed,
      dayWeights: Array.isArray(parsed.dayWeights) && parsed.dayWeights.length === 7 ? parsed.dayWeights.map(Number) : DEFAULT_CRITERIA.dayWeights
    };
  } catch {
    return DEFAULT_CRITERIA;
  }
}

function saveGoalCriteria(criteria: GoalCriteria) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GOAL_CRITERIA_KEY, JSON.stringify(criteria));
}

function parseHistoricalRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date, amount] = line.split(/[,\t;]/).map((item) => item.trim());
      return { date, amount: Number(String(amount ?? "").replace("S/", "").replace(",", ".")) };
    })
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.amount) && row.amount > 0);
}

function findCompanyGoal(data: LinkedCommercialData | null | undefined, month: string) {
  return data?.monthlyGoals.find((goal) => goal.scope === "company" && goal.month.startsWith(month));
}

function getValidSalesForMonth(sales: Sale[], month: string) {
  return sales.filter((sale) => sale.validationStatus === "validada" && sale.saleDate.startsWith(month));
}

function sumSalesByDate(sales: Sale[], criteria: GoalCriteria = DEFAULT_CRITERIA) {
  return sales.reduce<Record<string, number>>((acc, sale) => {
    acc[sale.saleDate] = (acc[sale.saleDate] ?? 0) + saleAmountForGoal(sale, criteria);
    return acc;
  }, {});
}

function saleAmountForGoal(sale: Sale, criteria: GoalCriteria = DEFAULT_CRITERIA) {
  const paidAmount = Number((sale as Sale & { paidAmount?: number }).paidAmount ?? 0);
  if (criteria.amountMode === "Monto neto vendido") return Number(sale.netAmount ?? 0);
  return paidAmount > 0 ? paidAmount : Number(sale.netAmount ?? 0);
}

function buildWeeklyPlan(dailyPlan: DailyPlan[], criteria: GoalCriteria = DEFAULT_CRITERIA): WeeklyPlan[] {
  const weeks: DailyPlan[][] = [];
  dailyPlan.forEach((day, index) => {
    const weekIndex = Math.floor(index / 7);
    weeks[weekIndex] = weeks[weekIndex] ?? [];
    weeks[weekIndex].push(day);
  });
  const totalTarget = dailyPlan.reduce((sum, day) => sum + day.target, 0) || 1;
  return weeks.map((days, index) => {
    const target = days.reduce((sum, day) => sum + day.target, 0);
    const actual = days.reduce((sum, day) => sum + day.actual, 0);
    const gap = actual - target;
    return {
      weekNumber: index + 1,
      startDate: days[0].date,
      endDate: days[days.length - 1].date,
      weight: target / totalTarget,
      target,
      actual,
      gap,
      requiredToClose: Math.max(target - actual, 0),
      status: getStatusFromRatio(actual, target, criteria)
    };
  });
}

function buildAlerts(input: {
  goalAmount: number;
  accumulated: number;
  gap: number;
  requiredDailySales: number;
  expectedToDate: number;
  smartForecast: number;
  weeklyPlan: WeeklyPlan[];
  dailyPlan: DailyPlan[];
  confidence: string;
}) {
  const alerts: { title: string; description: string; recommendation: string; severity: string }[] = [];
  const worstWeek = input.weeklyPlan.find((week) => week.status === "Critico" || week.status === "En riesgo");
  const recentLowDays = input.dailyPlan.filter((day) => day.date <= toDateString(new Date())).slice(-3).filter((day) => day.actual < day.target).length;

  if (input.smartForecast < input.goalAmount) {
    alerts.push({
      title: "Proyeccion mensual por debajo de la meta",
      description: `El pronostico esperado cierra en ${money(input.smartForecast)}.`,
      recommendation: "Reforzar seguimiento de preinscritos, pagos pendientes y leads calientes.",
      severity: "high"
    });
  }
  if (worstWeek) {
    alerts.push({
      title: `Semana ${worstWeek.weekNumber} en riesgo`,
      description: `Brecha semanal de ${money(worstWeek.gap)}.`,
      recommendation: "Concentrar llamadas y cierres en los dias fuertes de la semana.",
      severity: "medium"
    });
  }
  if (input.requiredDailySales > input.goalAmount * 0.05) {
    alerts.push({
      title: "Venta diaria requerida elevada",
      description: `Se necesita vender ${money(input.requiredDailySales)} diarios para cumplir.`,
      recommendation: "Redistribuir leads y activar una campana de cierre diaria.",
      severity: "high"
    });
  }
  if (recentLowDays >= 2) {
    alerts.push({
      title: "Dias consecutivos bajo meta",
      description: "Los ultimos dias estan por debajo del plan diario.",
      recommendation: "Revisar fricciones de pago, respuesta en Kommo y productividad por ejecutivo.",
      severity: "medium"
    });
  }
  if (input.confidence === "Baja") {
    alerts.push({
      title: "Datos insuficientes para pronostico avanzado",
      description: "Se usa forecast inicial por reglas y promedio movil.",
      recommendation: "Importar meses historicos para mejorar pesos y confianza.",
      severity: "low"
    });
  }
  return alerts.length ? alerts : [{
    title: "Meta en seguimiento",
    description: "No hay alertas criticas para el periodo seleccionado.",
    recommendation: "Mantener seguimiento diario y validar ventas pendientes.",
    severity: "low"
  }];
}

function buildRecommendations(input: { goalAmount: number; gap: number; requiredDailySales: number; smartForecast: number; currentGap: number; weeklyPlan: WeeklyPlan[]; confidence: string }) {
  const recommendations = [
    input.currentGap < 0
      ? `Vas ${money(Math.abs(input.currentGap))} por debajo del ritmo esperado. Para recuperar la meta, necesitas vender ${money(input.requiredDailySales)} diarios.`
      : `Vas ${money(input.currentGap)} por encima del ritmo esperado. Protege el avance validando ventas y cierres del dia.`,
    `El pronostico esperado indica cierre en ${money(input.smartForecast)}. ${input.smartForecast >= input.goalAmount ? "La meta se mantiene alcanzable." : `Faltarian ${money(input.goalAmount - input.smartForecast)} contra la meta.`}`,
    "Los viernes tienen mayor peso inicial. Recomiendo concentrar campanas de cierre y seguimiento entre jueves y viernes.",
    input.confidence === "Baja"
      ? "Aun no hay suficiente historico para forecast avanzado. Importa Excel anteriores para aprender patrones por semana, dia y ejecutivo."
      : "La confianza permite usar el forecast para seguimiento gerencial."
  ];
  const week = input.weeklyPlan.find((item) => item.status === "En riesgo" || item.status === "Critico");
  if (week) recommendations.splice(1, 0, `La semana ${week.weekNumber} esta en riesgo con brecha de ${money(week.gap)}.`);
  return recommendations;
}

function buildTeamRanking(data: LinkedCommercialData | null, sales: Sale[], goalAmount: number, criteria: GoalCriteria = DEFAULT_CRITERIA) {
  if (!data) return [];
  return data.teams.map((team) => {
    const actual = sales.filter((sale) => sale.teamId === team.id).reduce((sum, sale) => sum + saleAmountForGoal(sale, criteria), 0);
    const goal = team.monthlyGoal || goalAmount / Math.max(data.teams.length, 1);
    const progress = goal ? (actual / goal) * 100 : 0;
    return { name: team.name, goal, actual, progress, gap: actual - goal, status: getStatusFromRatio(actual, goal, criteria) };
  }).sort((a, b) => b.progress - a.progress).slice(0, 6);
}

function buildExecutiveRanking(data: LinkedCommercialData | null, sales: Sale[], goalAmount: number, criteria: GoalCriteria = DEFAULT_CRITERIA) {
  if (!data) return [];
  return data.executives.map((executive) => {
    const actual = sales.filter((sale) => sale.executiveId === executive.id).reduce((sum, sale) => sum + saleAmountForGoal(sale, criteria), 0);
    const executiveGoal = (executive as { goalAmount?: number }).goalAmount ?? 0;
    const goal = executiveGoal || goalAmount / Math.max(data.executives.length, 1);
    const progress = goal ? (actual / goal) * 100 : 0;
    return { name: executive.fullName, goal, actual, progress, gap: actual - goal, status: getStatusFromRatio(actual, goal, criteria) };
  }).sort((a, b) => b.progress - a.progress).slice(0, 6);
}

function getComplianceStatus(accumulated: number, goalAmount: number, progressPct: number, expectedProgressPct: number) {
  if (accumulated >= goalAmount) return "Meta superada";
  if (progressPct >= expectedProgressPct) return "En ritmo";
  const ratio = expectedProgressPct ? progressPct / expectedProgressPct : 1;
  if (ratio >= 0.95) return "Leve retraso";
  if (ratio >= 0.85) return "En riesgo";
  return "Critico";
}

function getStatusFromRatio(actual: number, target: number, criteria: GoalCriteria = DEFAULT_CRITERIA) {
  if (target <= 0) return "Sin meta";
  const ratio = actual / target;
  if (ratio >= 1) return "En ritmo";
  if (ratio >= criteria.warningThreshold / 100) return "Leve retraso";
  if (ratio >= criteria.riskThreshold / 100) return "En riesgo";
  return "Critico";
}

function getTone(status: string) {
  if (status === "Meta superada") return "success";
  if (status === "En ritmo") return "accent";
  if (status === "Leve retraso") return "warning";
  if (status === "En riesgo") return "danger";
  return "critical";
}

function statusTone(status: string) {
  if (status === "En ritmo" || status === "Meta superada") return "is-good";
  if (status === "Leve retraso") return "is-watch";
  if (status === "En riesgo") return "is-risk";
  return "is-critical";
}

function getConfidence(data: LinkedCommercialData | null, sales: Sale[]) {
  const months = new Set((data?.sales ?? []).map((sale) => sale.saleDate.slice(0, 7))).size;
  const incomplete = sales.filter((sale) => !sale.saleDate || !sale.executiveId || (!sale.productId && !sale.productTypeId)).length;
  if (months < 1 || incomplete > sales.length * 0.15) return "Baja";
  if (months <= 3) return "Media";
  if (months <= 6) return "Alta";
  return "Muy alta";
}

function getMonthEnd(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return toDateString(new Date(year, monthIndex, 0));
}

function getDateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = parseDate(start);
  const last = parseDate(end);
  while (cursor <= last) {
    dates.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampDate(value: string, min: string, max: string) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getDayIndex(date: string) {
  return parseDate(date).getDay();
}

function getDayWeight(date: string, criteria: GoalCriteria = DEFAULT_CRITERIA) {
  return criteria.dayWeights[getDayIndex(date)] ?? DAY_WEIGHTS[getDayIndex(date)] ?? 1;
}

function isBusinessDay(date: string) {
  const day = getDayIndex(date);
  return day >= 1 && day <= 6;
}

function inferDayType(date: string) {
  const day = getDayIndex(date);
  const dayOfMonth = Number(date.slice(8, 10));
  if (dayOfMonth >= 26) return "Fin de mes";
  if (day === 5) return "Dia fuerte";
  if (day === 0) return "Dia bajo";
  return "Dia normal";
}

function money(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function pct(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

function formatShortDate(value: string) {
  const date = parseDate(value);
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

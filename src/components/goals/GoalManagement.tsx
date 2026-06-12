"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Target } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { broadcastCommercialDataChange } from "@/lib/commercial/events";
import { monthlyGoals, teams } from "@/lib/data/mock-data";
import { currency } from "@/lib/metrics/format";
import { getCurrentUserId, loadCommercialGoals, loadCommercialTeams, saveCommercialGoal } from "@/lib/supabase/commercial";
import type { MonthlyGoal, Team } from "@/types/sales";

export function GoalManagement() {
  const [goalList, setGoalList] = useState<MonthlyGoal[]>(monthlyGoals);
  const [teamList, setTeamList] = useState(teams);
  const [selected, setSelected] = useState<MonthlyGoal>(monthlyGoals[0]);
  const [open, setOpen] = useState(false);
  const [, setSyncStatus] = useState("");

  useEffect(() => {
    hydrateGoals();
  }, []);

  async function hydrateGoals() {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const [remoteGoals, remoteTeams] = await Promise.all([loadCommercialGoals(), loadCommercialTeams()]);
        const localGoals = readLocalGoals();
        setGoalList(remoteGoals.length ? remoteGoals : localGoals);
        setTeamList(remoteTeams);
        setSelected((remoteGoals.length ? remoteGoals : localGoals)[0] ?? createGoalDraft());
        setSyncStatus("");
        return;
      }
    } catch (error) {
      console.warn(error);
    }

    const storedGoals = window.localStorage.getItem("reba-goals");
    if (storedGoals) {
      const parsedGoals = JSON.parse(storedGoals) as MonthlyGoal[];
      setGoalList(parsedGoals);
      setSelected(parsedGoals[0] ?? monthlyGoals[0]);
    }
    setSyncStatus("");
  }

  async function persistGoal(goal: MonthlyGoal) {
    const exists = goalList.some((item) => item.id === goal.id);
    const nextGoals = exists ? goalList.map((item) => (item.id === goal.id ? goal : item)) : [...goalList, goal];
    setGoalList(nextGoals);
    setSelected(goal);
    window.localStorage.setItem("reba-goals", JSON.stringify(nextGoals));
    broadcastCommercialDataChange();

    try {
      await saveCommercialGoal(goal);
      setSyncStatus("");
    } catch (error) {
      console.warn(error);
    }
  }

  const rows = goalList.map((goal) => {
    const team = goal.teamId ? teamList.find((item) => item.id === goal.teamId)?.name : "Empresa";
    return [
      goal.month,
      goal.scope,
      team ?? "Empresa",
      currency(goal.goalAmount),
      goal.goalPoints,
      <Button className="icon-command" variant="ghost" aria-label="Editar meta" key={goal.id} onClick={() => { setSelected(goal); setOpen(true); }}>
        <Pencil size={16} />
      </Button>
    ];
  });

  return (
    <>
      <section className="card card-pad">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Editor de metas</p>
            <h2 style={{ margin: 0 }}>Metas por empresa, equipo y ejecutivo</h2>
          </div>
          <div className="action-cluster">
            <Button onClick={() => { setSelected(createGoalDraft()); setOpen(true); }}>
              <Plus size={17} />
              Nueva meta
            </Button>
          </div>
        </div>
        <DataTable columns={["Mes", "Alcance", "Asignacion", "Meta monto", "Meta puntos", "Editar"]} rows={rows} />
      </section>
      <GoalEditorModal goal={selected} open={open} teams={teamList} onClose={() => setOpen(false)} onSave={persistGoal} />
    </>
  );
}

function readLocalGoals() {
  const storedGoals = window.localStorage.getItem("reba-goals");
  return storedGoals ? (JSON.parse(storedGoals) as MonthlyGoal[]) : monthlyGoals;
}

function createGoalDraft(): MonthlyGoal {
  return {
    id: crypto.randomUUID(),
    month: "2026-06-01",
    scope: "company",
    goalAmount: 120000,
    goalPoints: 0
  };
}

function GoalEditorModal({
  goal,
  open,
  teams,
  onClose,
  onSave
}: {
  goal: MonthlyGoal;
  open: boolean;
  teams: Team[];
  onClose: () => void;
  onSave: (goal: MonthlyGoal) => void;
}) {
  const [draft, setDraft] = useState<MonthlyGoal>(goal);

  useEffect(() => {
    if (open) setDraft(goal);
  }, [goal, open]);

  return (
    <Modal open={open} title="Editar meta comercial" description="Ajusta metas sin tocar ventas historicas ni rankings validados." onClose={onClose}>
      <form className="editor-grid">
        <label>
          Mes
          <Input type="month" value={draft.month.slice(0, 7)} onChange={(event) => setDraft({ ...draft, month: `${event.target.value}-01` })} />
        </label>
        <label>
          Alcance
          <Select value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value as MonthlyGoal["scope"] })}>
            <option value="company">Empresa</option>
            <option value="team">Equipo</option>
            <option value="executive">Ejecutivo</option>
          </Select>
        </label>
        <label>
          Equipo
          <Select value={draft.teamId ?? "company"} onChange={(event) => setDraft({ ...draft, teamId: event.target.value === "company" ? undefined : event.target.value })}>
            <option value="company">Empresa completa</option>
            {teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
          </Select>
        </label>
        <label>
          Meta mensual S/
          <Input type="number" min={0} value={draft.goalAmount} onChange={(event) => setDraft({ ...draft, goalAmount: Number(event.target.value) })} />
        </label>
        <label>
          Meta puntos
          <Input type="number" min={0} value={draft.goalPoints} onChange={(event) => setDraft({ ...draft, goalPoints: Number(event.target.value) })} />
        </label>
        <label>
          Responsable de aprobacion
          <Select defaultValue="gerencia">
            <option value="gerencia">Gerencia</option>
            <option value="jefe_ventas">Jefe de ventas</option>
          </Select>
        </label>
      </form>
      <div className="editor-actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onSave(draft); onClose(); }}><Target size={17} /> Actualizar meta</Button>
      </div>
    </Modal>
  );
}

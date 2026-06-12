"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { broadcastCommercialDataChange } from "@/lib/commercial/events";
import { executives as baseExecutives, productTypes, sales, teams as baseTeams } from "@/lib/data/mock-data";
import {
  getCurrentUserId,
  loadCommercialExecutives,
  loadCommercialTeams,
  saveCommercialTeam
} from "@/lib/supabase/commercial";
import type { TeamRankingItem } from "@/types/ranking";
import type { Executive, Team } from "@/types/sales";
import { TeamCard } from "@/components/teams/TeamCard";

const emptyTeam = (leaderId: string): Team => ({
  id: crypto.randomUUID(),
  name: "Nuevo equipo",
  color: "#00A7EB",
  leaderId,
  monthlyGoal: 30000,
  active: true
});

export function TeamManagement() {
  const [teamList, setTeamList] = useState<Team[]>(baseTeams);
  const [executiveList, setExecutiveList] = useState<Executive[]>(baseExecutives);
  const [selected, setSelected] = useState<Team>(baseTeams[0]);
  const [open, setOpen] = useState(false);
  const [, setSyncStatus] = useState("");

  useEffect(() => {
    hydrateTeams();
  }, []);

  async function hydrateTeams() {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const [remoteTeams, remoteExecutives] = await Promise.all([loadCommercialTeams(), loadCommercialExecutives()]);
        const localTeams = readLocalTeams();
        const localExecutives = readLocalExecutives();
        const nextTeams = remoteTeams.length ? remoteTeams : localTeams;
        const nextExecutives = remoteExecutives.length ? remoteExecutives : localExecutives;
        setTeamList(nextTeams);
        setExecutiveList(nextExecutives);
        setSelected(nextTeams[0] ?? emptyTeam(nextExecutives[0]?.id ?? ""));
        setSyncStatus("");
        return;
      }
    } catch (error) {
      console.warn(error);
    }

    const storedTeams = window.localStorage.getItem("reba-teams");
    const storedExecutives = window.localStorage.getItem("reba-executives");

    if (storedTeams) setTeamList(JSON.parse(storedTeams) as Team[]);
    if (storedExecutives) setExecutiveList(JSON.parse(storedExecutives) as Executive[]);
    setSyncStatus("");
  }

  const rankedTeams = useMemo(() => buildTeamRanking(teamList, executiveList), [teamList, executiveList]);

  async function saveTeam(team: Team) {
    const exists = teamList.some((item) => item.id === team.id);
    const nextTeamList = exists
      ? teamList.map((item) => (item.id === team.id ? team : item))
      : [...teamList, team];

    setTeamList(nextTeamList);
    window.localStorage.setItem("reba-teams", JSON.stringify(nextTeamList));
    broadcastCommercialDataChange();

    try {
      await saveCommercialTeam(team);
      setSyncStatus("");
    } catch (error) {
      console.warn(error);
    }
  }

  return (
    <>
      <section className="toolbar">
        <div>
          <p className="eyebrow">Ventas por equipo</p>
          <h2 style={{ margin: 0 }}>Equipos comerciales editables</h2>
        </div>
        <div className="action-cluster">
          <Button onClick={() => { setSelected(emptyTeam(executiveList[0]?.id ?? "")); setOpen(true); }}>
            <Plus size={17} />
            Crear equipo
          </Button>
        </div>
      </section>
      <section className="section-grid grid-3">
        {rankedTeams.map((team) => (
          <TeamCard
            team={team}
            key={team.teamId}
            onEdit={() => {
              const sourceTeam = teamList.find((item) => item.id === team.teamId);
              if (sourceTeam) {
                setSelected(sourceTeam);
                setOpen(true);
              }
            }}
          />
        ))}
      </section>
      <TeamEditorModal
        executives={executiveList}
        open={open}
        team={selected}
        onClose={() => setOpen(false)}
        onSave={saveTeam}
      />
    </>
  );
}

function readLocalTeams() {
  const stored = window.localStorage.getItem("reba-teams");
  return stored ? (JSON.parse(stored) as Team[]) : baseTeams;
}

function readLocalExecutives() {
  const stored = window.localStorage.getItem("reba-executives");
  return stored ? (JSON.parse(stored) as Executive[]) : baseExecutives;
}

function TeamEditorModal({
  executives,
  open,
  team,
  onClose,
  onSave
}: {
  executives: Executive[];
  open: boolean;
  team: Team;
  onClose: () => void;
  onSave: (team: Team) => void;
}) {
  const [draft, setDraft] = useState<Team>(team);

  useEffect(() => {
    if (open) setDraft(team);
  }, [team, open]);

  return (
    <Modal
      open={open}
      title={team.id.startsWith("team-") && !baseTeams.some((item) => item.id === team.id) ? "Crear equipo" : "Editar equipo"}
      description="Cambia el nombre y color del equipo. Tambien puedes ajustar lider, meta mensual y estado."
      onClose={onClose}
    >
      <form className="team-form">
        <label>
          Nombre del equipo
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label>
          Lider del equipo
          <Select value={draft.leaderId} onChange={(event) => setDraft({ ...draft, leaderId: event.target.value })}>
            {executives.map((executive) => (
              <option value={executive.id} key={executive.id}>{executive.fullName}</option>
            ))}
          </Select>
        </label>
        <label>
          Color del equipo
          <Input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </label>
        <div className="team-color-preview span-2" style={{ "--team-color": draft.color } as React.CSSProperties}>
          <span />
          <strong>{draft.name || "Nombre del equipo"}</strong>
          <small>Vista previa del color en tarjetas y ranking</small>
        </div>
        <label>
          Meta mensual
          <Input type="number" min={0} value={draft.monthlyGoal} onChange={(event) => setDraft({ ...draft, monthlyGoal: Number(event.target.value) })} />
        </label>
        <label>
          Estado
          <Select value={draft.active ? "Activo" : "Inactivo"} onChange={(event) => setDraft({ ...draft, active: event.target.value === "Activo" })}>
            <option>Activo</option>
            <option>Inactivo</option>
          </Select>
        </label>
      </form>
      <div className="editor-actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onSave(draft); onClose(); }}>
          <Save size={17} />
          Guardar equipo
        </Button>
      </div>
    </Modal>
  );
}

function buildTeamRanking(teamList: Team[], executiveList: Executive[]): TeamRankingItem[] {
  const officialSales = sales.filter((sale) => sale.validationStatus === "validada");
  const companyTotal = officialSales.reduce((sum, sale) => sum + sale.netAmount, 0);

  return teamList.map((team) => {
    const members = executiveList.filter((executive) => executive.teamId === team.id);
    const teamSales = officialSales.filter((sale) => sale.teamId === team.id);
    const totalQuantity = teamSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalAmount = teamSales.reduce((sum, sale) => sum + sale.netAmount, 0);
    const totalPoints = teamSales.reduce((sum, sale) => {
      const type = productTypes.find((item) => item.id === sale.productTypeId);
      return sum + sale.quantity * (type?.pointWeight ?? 0);
    }, 0);
    const leader = executiveList.find((executive) => executive.id === team.leaderId);
    const topExecutive = members
      .map((executive) => {
        const executiveSales = teamSales.filter((sale) => sale.executiveId === executive.id);
        return {
          name: executive.fullName,
          amount: executiveSales.reduce((sum, sale) => sum + sale.netAmount, 0)
        };
      })
      .sort((left, right) => right.amount - left.amount)[0];

    return {
      teamId: team.id,
      name: team.name,
      color: team.color,
      leaderName: leader?.fullName ?? "Sin lider",
      members: members.length,
      totalQuantity,
      totalAmount,
      totalPoints,
      goalAmount: team.monthlyGoal,
      progressPct: team.monthlyGoal ? (totalAmount / team.monthlyGoal) * 100 : 0,
      contributionPct: companyTotal ? (totalAmount / companyTotal) * 100 : 0,
      topExecutiveName: topExecutive?.amount ? topExecutive.name : "Sin ventas"
    };
  }).sort((left, right) => right.totalPoints - left.totalPoints);
}

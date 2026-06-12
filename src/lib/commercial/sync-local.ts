"use client";

import { broadcastCommercialDataChange } from "@/lib/commercial/events";
import {
  saveCommercialExecutive,
  saveCommercialGoal,
  saveCommercialSale,
  saveCommercialTeam
} from "@/lib/supabase/commercial";
import type { Executive, MonthlyGoal, Sale, Team } from "@/types/sales";

export async function syncLocalCommercialDataToSupabase() {
  const rawTeams = readLocal<Team[]>("reba-teams");
  const rawExecutives = readLocal<Executive[]>("reba-executives");
  const rawGoals = readLocal<MonthlyGoal[]>("reba-goals");
  const rawSales = readLocal<Sale[]>("reba-sales");
  const teamIdMap = new Map<string, string>();
  const executiveIdMap = new Map<string, string>();
  const errors: string[] = [];

  const teams = rawTeams.map((team) => {
    const id = isUuid(team.id) ? team.id : crypto.randomUUID();
    teamIdMap.set(team.id, id);
    return { ...team, id };
  });

  const executives = rawExecutives.map((executive) => {
    const id = isUuid(executive.id) ? executive.id : crypto.randomUUID();
    executiveIdMap.set(executive.id, id);
    return {
      ...executive,
      id,
      teamId: teamIdMap.get(executive.teamId) ?? executive.teamId
    };
  });

  const goals = rawGoals.map((goal) => ({
    ...goal,
    id: isUuid(goal.id) ? goal.id : crypto.randomUUID(),
    teamId: goal.teamId ? teamIdMap.get(goal.teamId) ?? goal.teamId : undefined,
    executiveId: goal.executiveId ? executiveIdMap.get(goal.executiveId) ?? goal.executiveId : undefined
  }));

  const sales = rawSales.map((sale) => ({
    ...sale,
    id: isUuid(sale.id) ? sale.id : crypto.randomUUID(),
    executiveId: executiveIdMap.get(sale.executiveId) ?? sale.executiveId,
    teamId: teamIdMap.get(sale.teamId) ?? sale.teamId
  }));

  const summary = {
    teams: 0,
    executives: 0,
    goals: 0,
    sales: 0,
    errors
  };

  for (const team of teams) {
    try {
      await saveCommercialTeam(team);
      summary.teams += 1;
    } catch (error) {
      errors.push(`Equipo ${team.name}: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  }

  for (const executive of executives) {
    try {
      await saveCommercialExecutive(executive);
      summary.executives += 1;
    } catch (error) {
      errors.push(`Ejecutivo ${executive.fullName}: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  }

  for (const goal of goals) {
    try {
      await saveCommercialGoal(goal);
      summary.goals += 1;
    } catch (error) {
      errors.push(`Meta ${goal.month}: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  }

  for (const sale of sales) {
    try {
      if (isUuid(sale.executiveId) && isUuid(sale.teamId) && isUuid(sale.productTypeId)) {
        await saveCommercialSale(sale);
        summary.sales += 1;
      } else {
        errors.push(`Venta ${sale.id}: falta producto/ejecutivo/equipo con UUID valido`);
      }
    } catch (error) {
      errors.push(`Venta ${sale.id}: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  }

  window.localStorage.setItem("reba-teams", JSON.stringify(teams));
  window.localStorage.setItem("reba-executives", JSON.stringify(executives.map((executive) => ({
    ...executive,
    photoUrl: executive.photoUrl.startsWith("data:image/") ? "" : executive.photoUrl
  }))));
  window.localStorage.setItem("reba-goals", JSON.stringify(goals));
  broadcastCommercialDataChange();
  return summary;
}

function readLocal<T>(key: string): T extends Array<unknown> ? T : never {
  const value = window.localStorage.getItem(key);
  if (!value) return [] as T extends Array<unknown> ? T : never;

  try {
    return JSON.parse(value) as T extends Array<unknown> ? T : never;
  } catch {
    return [] as T extends Array<unknown> ? T : never;
  }
}

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

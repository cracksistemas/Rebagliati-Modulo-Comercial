"use client";

import { executives, monthlyGoals, productTypes, sales, teams } from "@/lib/data/mock-data";
import {
  getCurrentUserId,
  loadCommercialExecutives,
  loadCommercialGoals,
  loadCommercialProductTypes,
  loadCommercialSales,
  loadCommercialTeams
} from "@/lib/supabase/commercial";
import type { ExecutiveRankingItem, ProductMixItem, TeamRankingItem } from "@/types/ranking";
import type { Executive, MonthlyGoal, ProductType, Sale, Team } from "@/types/sales";

export interface LinkedCommercialData {
  source: "supabase" | "local";
  status: string;
  executives: Executive[];
  teams: Team[];
  sales: Sale[];
  productTypes: ProductType[];
  monthlyGoals: MonthlyGoal[];
}

export async function loadLinkedCommercialData(): Promise<LinkedCommercialData> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const [remoteExecutives, remoteTeams, remoteSales, remoteTypes, remoteGoals] = await Promise.all([
        loadCommercialExecutives(),
        loadCommercialTeams(),
        loadCommercialSales(),
        loadCommercialProductTypes(),
        loadCommercialGoals()
      ]);

      return {
        source: "supabase",
        status: "Conectado a Supabase",
        executives: remoteExecutives.length ? remoteExecutives : getLocalExecutives(),
        teams: remoteTeams.length ? remoteTeams : getLocalTeams(),
        sales: remoteSales.length ? remoteSales : getLocalSales(),
        productTypes: remoteTypes.length ? remoteTypes : productTypes,
        monthlyGoals: remoteGoals.length ? remoteGoals : getLocalGoals()
      };
    }
  } catch (error) {
    return {
      source: "local",
      status: `Modo local: ${error instanceof Error ? error.message : "Supabase no disponible"}`,
      executives: getLocalExecutives(),
      teams: getLocalTeams(),
      sales: getLocalSales(),
      productTypes,
      monthlyGoals: getLocalGoals()
    };
  }

  return {
    source: "local",
    status: "Modo local - inicia sesion para datos en Supabase",
    executives: getLocalExecutives(),
    teams: getLocalTeams(),
    sales: getLocalSales(),
    productTypes,
    monthlyGoals: getLocalGoals()
  };
}

export function getCompanyGoalProgress(data: LinkedCommercialData) {
  const companyGoal = data.monthlyGoals.find((goal) => goal.scope === "company");
  const goalAmount = companyGoal?.goalAmount ?? 120000;
  const accumulated = data.sales
    .filter((sale) => sale.validationStatus === "validada")
    .reduce((sum, sale) => sum + sale.netAmount, 0);

  return {
    goalAmount,
    accumulated,
    progressPct: goalAmount ? (accumulated / goalAmount) * 100 : 0,
    gap: Math.max(goalAmount - accumulated, 0)
  };
}

export function getExecutiveRankingFromData(data: LinkedCommercialData): ExecutiveRankingItem[] {
  const officialSales = data.sales.filter((sale) => sale.validationStatus === "validada");
  const totalAmount = officialSales.reduce((sum, sale) => sum + sale.netAmount, 0);

  return data.executives
    .map((executive) => {
      const team = data.teams.find((item) => item.id === executive.teamId);
      const executiveSales = officialSales.filter((sale) => sale.executiveId === executive.id);
      const totalQuantity = executiveSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalAmountByExecutive = executiveSales.reduce((sum, sale) => sum + sale.netAmount, 0);
      const totalPoints = executiveSales.reduce((sum, sale) => {
        const type = data.productTypes.find((item) => item.id === sale.productTypeId);
        return sum + sale.quantity * (type?.pointWeight ?? 0);
      }, 0);

      return {
        executiveId: executive.id,
        fullName: executive.fullName,
        photoUrl: executive.photoUrl,
        teamId: executive.teamId,
        teamName: team?.name ?? "Sin equipo",
        teamColor: team?.color ?? "#8E8E93",
        totalQuantity,
        totalAmount: totalAmountByExecutive,
        totalPoints,
        rank: 0,
        previousRank: executive.previousRank,
        movement: 0,
        contributionPct: totalAmount ? (totalAmountByExecutive / totalAmount) * 100 : 0
      };
    })
    .sort((left, right) => right.totalPoints - left.totalPoints || right.totalAmount - left.totalAmount)
    .map((item, index) => {
      const rank = index + 1;
      return { ...item, rank, movement: item.previousRank - rank };
    });
}

export function getTeamRankingFromData(data: LinkedCommercialData): TeamRankingItem[] {
  const officialSales = data.sales.filter((sale) => sale.validationStatus === "validada");
  const companyTotal = officialSales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const executiveRanking = getExecutiveRankingFromData(data);

  return data.teams
    .map((team) => {
      const members = data.executives.filter((executive) => executive.teamId === team.id);
      const teamSales = officialSales.filter((sale) => sale.teamId === team.id);
      const totalQuantity = teamSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalAmount = teamSales.reduce((sum, sale) => sum + sale.netAmount, 0);
      const totalPoints = teamSales.reduce((sum, sale) => {
        const type = data.productTypes.find((item) => item.id === sale.productTypeId);
        return sum + sale.quantity * (type?.pointWeight ?? 0);
      }, 0);
      const leader = data.executives.find((executive) => executive.id === team.leaderId);
      const topExecutive = executiveRanking.find((item) => item.teamId === team.id);

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
        topExecutiveName: topExecutive?.fullName ?? "Sin ventas"
      };
    })
    .sort((left, right) => right.totalPoints - left.totalPoints);
}

export function getProductMixFromData(data: LinkedCommercialData): ProductMixItem[] {
  const officialSales = data.sales.filter((sale) => sale.validationStatus === "validada");
  const total = officialSales.reduce((sum, sale) => sum + sale.netAmount, 0);

  return data.productTypes.map((type) => {
    const items = officialSales.filter((sale) => sale.productTypeId === type.id);
    const totalAmount = items.reduce((sum, sale) => sum + sale.netAmount, 0);
    const totalQuantity = items.reduce((sum, sale) => sum + sale.quantity, 0);
    return {
      code: type.code,
      name: type.name,
      totalAmount,
      totalQuantity,
      percentage: total ? (totalAmount / total) * 100 : 0
    };
  });
}

export function getPendingValidationCountFromData(data: LinkedCommercialData) {
  return data.sales.filter((sale) => ["pendiente_validacion", "registrada", "observada"].includes(sale.validationStatus)).length;
}

export function getTotalPointsFromData(data: LinkedCommercialData) {
  return data.sales
    .filter((sale) => sale.validationStatus === "validada")
    .reduce((sum, sale) => {
      const type = data.productTypes.find((item) => item.id === sale.productTypeId);
      return sum + sale.quantity * (type?.pointWeight ?? 0);
    }, 0);
}

export function getDailyAccumulatedFromData(data: LinkedCommercialData) {
  const byDate = data.sales
    .filter((sale) => sale.validationStatus === "validada")
    .reduce<Record<string, number>>((acc, sale) => {
      acc[sale.saleDate] = (acc[sale.saleDate] ?? 0) + sale.netAmount;
      return acc;
    }, {});

  let running = 0;
  return Object.entries(byDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => {
      running += amount;
      return { date, amount: running };
    });
}

function getLocalExecutives() {
  const stored = window.localStorage.getItem("reba-executives");
  return stored ? (JSON.parse(stored) as Executive[]) : executives;
}

function getLocalTeams() {
  const stored = window.localStorage.getItem("reba-teams");
  return stored ? (JSON.parse(stored) as Team[]) : teams;
}

function getLocalGoals() {
  const stored = window.localStorage.getItem("reba-goals");
  return stored ? (JSON.parse(stored) as MonthlyGoal[]) : monthlyGoals;
}

function getLocalSales() {
  const stored = window.localStorage.getItem("reba-sales");
  return stored ? (JSON.parse(stored) as Sale[]) : sales;
}

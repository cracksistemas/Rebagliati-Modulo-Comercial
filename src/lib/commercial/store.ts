"use client";

import { supabase } from "@/lib/supabase/client";
import { broadcastCommercialDataChange } from "./events";
import { seedState } from "./seed";
import type { CommercialState, Executive, Sale, Team } from "./types";

const STORAGE_KEY = "reba-commercial-state";
const SETTINGS_LOCK_MIGRATION_KEY = "reba-settings-superadmin-only-v2";

function canUseStorage() {
  return typeof window !== "undefined";
}

function asNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function normalizeState(value: Partial<CommercialState> | null | undefined): CommercialState {
  const source = value ?? {};
  const teams = asArray<Team>(source.teams, seedState.teams).map((team, index) => {
    const seedTeam = seedState.teams[index] ?? seedState.teams[0];
    return {
      id: asString(team.id, seedTeam.id),
      name: asString(team.name, seedTeam.name),
      color: asString(team.color, seedTeam.color),
      leaderId: asString(team.leaderId, seedTeam.leaderId ?? undefined),
      goalAmount: asNumber(team.goalAmount, seedTeam.goalAmount),
      active: typeof team.active === "boolean" ? team.active : seedTeam.active
    };
  });

  const executives: Executive[] = asArray<Executive>(source.executives, seedState.executives).map((executive, index) => {
    const seedExecutive = seedState.executives[index] ?? seedState.executives[0];
    const shift: Executive["shift"] =
      executive.shift === "Tarde" || executive.shift === "Noche" ? executive.shift : "Manana";
    const status: Executive["status"] =
      executive.status === "Inactivo" || executive.status === "Baja" ? executive.status : "Activo";
    return {
      id: asString(executive.id, seedExecutive.id),
      fullName: asString(executive.fullName, seedExecutive.fullName),
      code: asString(executive.code, seedExecutive.code),
      teamId: asString(executive.teamId, seedExecutive.teamId),
      shift,
      status,
      photoUrl: typeof executive.photoUrl === "string" ? executive.photoUrl : undefined,
      goalAmount: asNumber(executive.goalAmount, seedExecutive.goalAmount),
      currentSales: asNumber(executive.currentSales, seedExecutive.currentSales),
      points: asNumber(executive.points, seedExecutive.points),
      previousRank: asNumber(executive.previousRank, seedExecutive.previousRank)
    };
  });

  const sales: Sale[] = asArray<Sale>(source.sales, seedState.sales).map((sale, index) => {
    const seedSale = seedState.sales[index] ?? seedState.sales[0];
    const productType: Sale["productType"] =
      sale.productType === "Curso Modular" || sale.productType === "Diplomado" ? sale.productType : "Curso";
    const validationStatus: Sale["validationStatus"] =
      sale.validationStatus === "registrada" ||
      sale.validationStatus === "validada" ||
      sale.validationStatus === "observada" ||
      sale.validationStatus === "anulada"
        ? sale.validationStatus
        : "pendiente_validacion";
    return {
      id: asString(sale.id, seedSale.id),
      saleDate: asString(sale.saleDate, seedSale.saleDate),
      executiveId: asString(sale.executiveId, seedSale.executiveId),
      teamId: asString(sale.teamId, seedSale.teamId),
      productType,
      productName: asString(sale.productName, seedSale.productName),
      quantity: asNumber(sale.quantity, seedSale.quantity),
      grossAmount: asNumber(sale.grossAmount, seedSale.grossAmount),
      discountAmount: asNumber(sale.discountAmount, seedSale.discountAmount),
      netAmount: asNumber(sale.netAmount, seedSale.netAmount),
      leadSource: asString(sale.leadSource, seedSale.leadSource),
      paymentMethod: asString(sale.paymentMethod, seedSale.paymentMethod),
      validationStatus,
      notes: typeof sale.notes === "string" ? sale.notes : undefined
    };
  });

  return {
    ...seedState,
    ...source,
    month: asString(source.month, seedState.month),
    companyGoal: asNumber(source.companyGoal, seedState.companyGoal),
    avgResponseTime: asString(source.avgResponseTime, seedState.avgResponseTime),
    executives,
    teams,
    sales,
    users: asArray(source.users, seedState.users),
    programs: asArray(source.programs, seedState.programs),
    discounts: asArray(source.discounts, seedState.discounts),
    rolePermissions: asArray(source.rolePermissions, seedState.rolePermissions),
    audit: asArray(source.audit, seedState.audit),
    clientProfiles: asArray(source.clientProfiles, seedState.clientProfiles)
  };
}

export function getCommercialState(): CommercialState {
  if (!canUseStorage()) return seedState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
      return seedState;
    }
    let normalized = normalizeState(JSON.parse(raw));
    if (!window.localStorage.getItem(SETTINGS_LOCK_MIGRATION_KEY)) {
      normalized = {
        ...normalized,
        rolePermissions: normalized.rolePermissions.map((config) =>
          config.role === "Superadministrador"
            ? config
            : { ...config, permissions: config.permissions.filter((permission) => !permission.startsWith("settings.")) }
        )
      };
      window.localStorage.setItem(SETTINGS_LOCK_MIGRATION_KEY, "done");
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return seedState;
  }
}

export function setCommercialState(next: CommercialState) {
  if (!canUseStorage()) return;
  const compact = {
    ...next,
    executives: next.executives.map((item) => ({
      ...item,
      photoUrl: item.photoUrl?.startsWith("blob:") ? undefined : item.photoUrl
    }))
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(compact)));
    broadcastCommercialDataChange();
  } catch {
    broadcastCommercialDataChange();
  }
}

export function upsertExecutive(executive: Executive) {
  const state = getCommercialState();
  const exists = state.executives.some((item) => item.id === executive.id);
  setCommercialState({
    ...state,
    executives: exists
      ? state.executives.map((item) => (item.id === executive.id ? executive : item))
      : [executive, ...state.executives],
    audit: [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toLocaleString("es-PE"),
        actor: "Administrador Comercial",
        action: exists ? "Edito ejecutivo" : "Creo ejecutivo",
        module: "Ejecutivos",
        target: executive.fullName,
        result: "Exitoso",
        criticality: "Media"
      },
      ...state.audit
    ]
  });
}

export function deactivateExecutive(id: string) {
  const state = getCommercialState();
  const executive = state.executives.find((item) => item.id === id);
  if (!executive) return;
  upsertExecutive({ ...executive, status: "Baja" });
}

export function upsertTeam(team: Team) {
  const state = getCommercialState();
  const exists = state.teams.some((item) => item.id === team.id);
  setCommercialState({
    ...state,
    teams: exists ? state.teams.map((item) => (item.id === team.id ? team : item)) : [team, ...state.teams],
    audit: [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toLocaleString("es-PE"),
        actor: "Administrador Comercial",
        action: exists ? "Edito equipo" : "Creo equipo",
        module: "Equipos",
        target: team.name,
        result: "Exitoso",
        criticality: "Media"
      },
      ...state.audit
    ]
  });
}

export function upsertSale(sale: Sale) {
  const state = getCommercialState();
  const exists = state.sales.some((item) => item.id === sale.id);
  setCommercialState({
    ...state,
    sales: exists ? state.sales.map((item) => (item.id === sale.id ? sale : item)) : [sale, ...state.sales],
    audit: [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toLocaleString("es-PE"),
        actor: "Administrador Comercial",
        action: exists ? "Edito venta" : "Registro venta",
        module: "Ventas",
        target: sale.productName,
        result: "Exitoso",
        criticality: sale.validationStatus === "validada" ? "Alta" : "Media"
      },
      ...state.audit
    ]
  });
}

export async function persistExecutivePhoto(file: File, executiveId: string) {
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${executiveId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("executive-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("executive-photos").getPublicUrl(path);
  return data.publicUrl;
}

export function getValidatedSales(state = getCommercialState()) {
  return state.sales.filter((sale) => sale.validationStatus === "validada");
}

export function money(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0
  }).format(value);
}

"use client";

import { supabase } from "@/lib/supabase/client";
import { broadcastCommercialDataChange } from "./events";
import { seedState } from "./seed";
import type { CommercialState, Executive, Sale, Team } from "./types";

const STORAGE_KEY = "reba-commercial-state";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getCommercialState(): CommercialState {
  if (!canUseStorage()) return seedState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return seedState;
  }
  try {
    return { ...seedState, ...JSON.parse(raw) };
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  broadcastCommercialDataChange();
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

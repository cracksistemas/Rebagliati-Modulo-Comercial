import type { UserRole } from "@/types/sales";

export const roleLabels: Record<UserRole, string> = {
  gerencia: "Gerencia",
  jefe_ventas: "Jefe de ventas",
  lider_ventas: "Lider de ventas",
  ejecutivo: "Ejecutivo",
  marketing_soporte: "Marketing / Soporte",
  admin_sistema: "Administrador del sistema"
};

export const roleHierarchy: UserRole[] = [
  "admin_sistema",
  "gerencia",
  "jefe_ventas",
  "lider_ventas",
  "ejecutivo",
  "marketing_soporte"
];

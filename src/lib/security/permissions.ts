import type { UserRole } from "@/types/sales";

export type Permission =
  | "dashboard:read"
  | "sales:create"
  | "sales:validate"
  | "sales:annul"
  | "teams:manage"
  | "goals:manage"
  | "reports:export"
  | "audit:read"
  | "settings:manage";

const permissions: Record<UserRole, Permission[]> = {
  admin_sistema: ["dashboard:read", "settings:manage", "audit:read", "reports:export", "teams:manage", "goals:manage"],
  gerencia: ["dashboard:read", "sales:validate", "sales:annul", "teams:manage", "goals:manage", "reports:export", "audit:read"],
  jefe_ventas: ["dashboard:read", "sales:validate", "sales:annul", "teams:manage", "goals:manage", "reports:export"],
  lider_ventas: ["dashboard:read", "sales:validate", "sales:annul", "sales:create"],
  ejecutivo: ["dashboard:read", "sales:create"],
  marketing_soporte: ["dashboard:read", "reports:export"]
};

export function can(role: UserRole, permission: Permission) {
  return permissions[role].includes(permission);
}

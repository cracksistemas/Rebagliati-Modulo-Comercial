import type { AuthorizedDiscount, ModulePermission, RolePermissionConfig, SalesProgram } from "@/lib/commercial/types";

export const permissionCatalog: ModulePermission[] = [
  { id: "dashboard.resumen", module: "Dashboard", submodule: "Resumen mensual" },
  { id: "sales.new", module: "Ventas", submodule: "Registrar venta" },
  { id: "sales.validation", module: "Ventas", submodule: "Validacion de ventas" },
  { id: "ranking.executives", module: "Ranking", submodule: "Ranking de ejecutivos" },
  { id: "teams.view", module: "Equipos", submodule: "Ventas por equipo" },
  { id: "executives.manage", module: "Ejecutivos", submodule: "Directorio comercial" },
  { id: "goals.manage", module: "Metas", submodule: "Metas mensuales" },
  { id: "customer-map.view", module: "Mapa de Clientes", submodule: "Perfiles y argumentos" },
  { id: "reports.export", module: "Reportes", submodule: "Exportables" },
  { id: "settings.users", module: "Configuracion", submodule: "Usuarios" },
  { id: "settings.roles", module: "Configuracion", submodule: "Roles y permisos" },
  { id: "settings.discounts", module: "Configuracion", submodule: "Descuentos autorizados" }
];

export const defaultDiscounts: AuthorizedDiscount[] = [
  { id: "discount-none", label: "Sin descuento", amount: 0, active: true },
  { id: "discount-50", label: "S/ 50 autorizado", amount: 50, active: true },
  { id: "discount-100", label: "S/ 100 autorizado", amount: 100, active: true },
  { id: "discount-150", label: "S/ 150 autorizado", amount: 150, active: true },
  { id: "discount-special", label: "Descuento especial con autorizacion", amount: 0, active: true, requiresApproval: true }
];

export const defaultPrograms: SalesProgram[] = [
  { id: "program-salud-ocupacional", name: "Diplomado en Salud Ocupacional", productType: "Diplomado", active: true, createdAt: "2026-06-01" },
  { id: "program-emergencias", name: "Emergencias y Desastres", productType: "Curso Modular", active: true, createdAt: "2026-06-01" },
  { id: "program-inyectoterapia", name: "Inyectoterapia", productType: "Curso", active: true, createdAt: "2026-06-01" },
  { id: "program-uci", name: "UCI y Cuidados Criticos", productType: "Diplomado", active: true, createdAt: "2026-06-01" }
];

export const defaultRolePermissions: RolePermissionConfig[] = [
  { role: "Superadministrador", permissions: permissionCatalog.map((item) => item.id) },
  { role: "Administrador", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "ranking.executives", "teams.view", "executives.manage", "goals.manage", "customer-map.view", "reports.export"] },
  { role: "Jefe de ventas", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "ranking.executives", "teams.view", "executives.manage", "goals.manage", "customer-map.view", "reports.export"] },
  { role: "Lider de ventas", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "ranking.executives", "teams.view", "customer-map.view", "reports.export"] },
  { role: "Ejecutivo", permissions: ["dashboard.resumen", "sales.new", "ranking.executives", "teams.view", "customer-map.view"] },
  { role: "Marketing", permissions: ["dashboard.resumen", "ranking.executives", "teams.view", "customer-map.view", "reports.export"] },
  { role: "Solo lectura", permissions: ["dashboard.resumen", "ranking.executives", "teams.view", "customer-map.view", "reports.export"] }
];

export function normalizeRoleLabel(role = "") {
  const normalized = role.toLowerCase();
  if (normalized.includes("admin_sistema") || normalized.includes("super")) return "Superadministrador";
  if (normalized.includes("gerencia")) return "Gerencia";
  if (normalized.includes("jefe")) return "Jefe de ventas";
  if (normalized.includes("lider")) return "Lider de ventas";
  if (normalized.includes("marketing") || normalized.includes("soporte")) return "Marketing";
  if (normalized.includes("lectura")) return "Solo lectura";
  return "Ejecutivo";
}

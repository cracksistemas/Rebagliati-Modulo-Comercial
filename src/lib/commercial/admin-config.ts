import type { AuthorizedDiscount, CommercialOption, IncidentCriteria, ModulePermission, RolePermissionConfig, SalesProgram } from "@/lib/commercial/types";

export const permissionCatalog: ModulePermission[] = [
  { id: "dashboard.resumen", module: "Dashboard", submodule: "Resumen mensual" },
  { id: "sales.new", module: "Ventas", submodule: "Registrar venta" },
  { id: "sales.validation", module: "Ventas", submodule: "Validacion de ventas" },
  { id: "ranking.executives", module: "Ranking", submodule: "Ranking de ejecutivos" },
  { id: "teams.view", module: "Equipos", submodule: "Ventas por equipo" },
  { id: "executives.manage", module: "Ejecutivos", submodule: "Directorio comercial" },
  { id: "incidents.view", module: "Incidencias", submodule: "Dashboard y seguimiento" },
  { id: "incidents.create", module: "Incidencias", submodule: "Registrar incidencia" },
  { id: "incidents.manage", module: "Incidencias", submodule: "Cerrar y aplicar medidas" },
  { id: "incidents.export", module: "Incidencias", submodule: "Reportes exportables" },
  { id: "incidents.criteria", module: "Incidencias", submodule: "Configuracion de criterios" },
  { id: "goals.manage", module: "Metas", submodule: "Metas mensuales" },
  { id: "customer-map.view", module: "Mapa de Clientes", submodule: "Perfiles y argumentos" },
  { id: "reports.export", module: "Reportes", submodule: "Exportables" },
  { id: "settings.users", module: "Configuracion", submodule: "Usuarios" },
  { id: "settings.roles", module: "Configuracion", submodule: "Roles y permisos" },
  { id: "settings.discounts", module: "Configuracion", submodule: "Descuentos autorizados" },
  { id: "notifications.view", module: "Notificaciones", submodule: "Campana y comunicados" },
  { id: "notifications.manage", module: "Notificaciones", submodule: "Enviar comunicados" }
];

export const defaultDiscounts: AuthorizedDiscount[] = [
  { id: "discount-none", label: "Sin descuento", amount: 0, discountType: "amount", active: true },
  { id: "discount-50", label: "S/ 50 autorizado", amount: 50, discountType: "amount", active: true },
  { id: "discount-100", label: "S/ 100 autorizado", amount: 100, discountType: "amount", active: true },
  { id: "discount-10pct", label: "10% autorizado", amount: 10, discountType: "percent", active: true },
  { id: "discount-special", label: "Descuento especial con autorizacion", amount: 0, discountType: "amount", active: true, requiresApproval: true }
];

export const defaultPrograms: SalesProgram[] = [
  { id: "program-salud-ocupacional", name: "Diplomado en Salud Ocupacional", productType: "Diplomado", active: true, createdAt: "2026-06-01" },
  { id: "program-emergencias", name: "Emergencias y Desastres", productType: "Curso Modular", active: true, createdAt: "2026-06-01" },
  { id: "program-inyectoterapia", name: "Inyectoterapia", productType: "Curso", active: true, createdAt: "2026-06-01" },
  { id: "program-uci", name: "UCI y Cuidados Criticos", productType: "Diplomado", active: true, createdAt: "2026-06-01" }
];

export const defaultLeadSources: CommercialOption[] = [
  { id: "lead-meta", label: "Meta Ads", active: true, createdAt: "2026-06-01" },
  { id: "lead-whatsapp", label: "WhatsApp", active: true, createdAt: "2026-06-01" },
  { id: "lead-base", label: "Base", active: true, createdAt: "2026-06-01" },
  { id: "lead-referido", label: "Referido", active: true, createdAt: "2026-06-01" },
  { id: "lead-organico", label: "Organico", active: true, createdAt: "2026-06-01" },
  { id: "lead-kommo", label: "Kommo", active: true, createdAt: "2026-06-01" }
];

export const defaultPaymentMethods: CommercialOption[] = [
  { id: "pay-transferencia", label: "Transferencia", active: true, createdAt: "2026-06-01" },
  { id: "pay-yape", label: "Yape", active: true, createdAt: "2026-06-01" },
  { id: "pay-tarjeta", label: "Tarjeta", active: true, createdAt: "2026-06-01" },
  { id: "pay-efectivo", label: "Efectivo", active: true, createdAt: "2026-06-01" },
  { id: "pay-plin", label: "Plin", active: true, createdAt: "2026-06-01" }
];

export const defaultIncidentCriteria: IncidentCriteria = {
  categories: [
    "Atencion al cliente",
    "Tiempo de respuesta",
    "Llamadas no realizadas",
    "Mensajes sin responder",
    "Informacion errada",
    "Promocion errada",
    "Precio errado",
    "Derivacion de pago",
    "Pago no derivado",
    "Datos incompletos",
    "Uso incorrecto de Kommo",
    "Error en embudo",
    "No envio de terminos y condiciones",
    "No envio de link de grupo",
    "No seguimiento de proceso",
    "Mala comunicacion interna",
    "Conducta laboral",
    "Uso indebido de equipos",
    "Relevo incorrecto",
    "Incumplimiento de indicaciones",
    "Otro"
  ],
  severities: [
    { label: "Leve", points: -1 },
    { label: "Moderada", points: -3 },
    { label: "Grave", points: -5 },
    { label: "Critica", points: -10 }
  ],
  statuses: ["Pendiente", "En revision", "Conversado con ejecutivo", "Medida aplicada", "Corregido", "Cerrado", "Reabierto"],
  measures: [
    "Solo observacion",
    "Conversacion correctiva",
    "Capacitacion obligatoria",
    "Descuento de puntos",
    "Advertencia formal",
    "Escalamiento a jefatura",
    "Suspension de permiso",
    "Otro"
  ]
};

export const defaultRolePermissions: RolePermissionConfig[] = [
  { role: "Superadministrador", permissions: permissionCatalog.map((item) => item.id) },
  { role: "Administrador", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "ranking.executives", "teams.view", "executives.manage", "incidents.view", "incidents.create", "incidents.manage", "incidents.export", "incidents.criteria", "goals.manage", "customer-map.view", "reports.export", "notifications.view", "notifications.manage"] },
  { role: "Jefe de ventas", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "ranking.executives", "teams.view", "executives.manage", "incidents.view", "incidents.create", "incidents.manage", "incidents.export", "goals.manage", "customer-map.view", "reports.export", "notifications.view", "notifications.manage"] },
  { role: "Lider de ventas", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "ranking.executives", "teams.view", "incidents.view", "incidents.create", "customer-map.view", "reports.export", "notifications.view"] },
  { role: "Ejecutivo", permissions: ["dashboard.resumen", "sales.new", "ranking.executives", "teams.view", "incidents.view", "customer-map.view", "notifications.view"] },
  { role: "Marketing", permissions: ["dashboard.resumen", "ranking.executives", "teams.view", "customer-map.view", "reports.export", "notifications.view"] },
  { role: "Solo lectura", permissions: ["dashboard.resumen", "ranking.executives", "teams.view", "incidents.view", "customer-map.view", "reports.export", "notifications.view"] }
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

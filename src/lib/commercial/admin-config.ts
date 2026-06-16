import type { AuthorizedDiscount, CommercialOption, IncidentCriteria, ModulePermission, RolePermissionConfig, SalesProgram } from "@/lib/commercial/types";

export const permissionCatalog: ModulePermission[] = [
  { id: "dashboard.resumen", module: "Dashboard", submodule: "Resumen mensual" },
  { id: "sales.new", module: "Ventas", submodule: "Registrar venta" },
  { id: "sales.validation", module: "Ventas", submodule: "Validacion de ventas" },
  { id: "products.view", module: "Productos y Eventos", submodule: "Catalogo comercial" },
  { id: "products.create", module: "Productos y Eventos", submodule: "Crear producto o evento" },
  { id: "products.edit", module: "Productos y Eventos", submodule: "Editar catalogo" },
  { id: "products.archive", module: "Productos y Eventos", submodule: "Archivar o cerrar ediciones" },
  { id: "products.activate", module: "Productos y Eventos", submodule: "Activar para ventas" },
  { id: "products.manage_prices", module: "Productos y Eventos", submodule: "Tarifas y promociones" },
  { id: "products.manage_links", module: "Productos y Eventos", submodule: "Formularios y links" },
  { id: "products.generate_templates", module: "Productos y Eventos", submodule: "Plantillas informativas" },
  { id: "products.import_from_template", module: "Productos y Eventos", submodule: "Importar desde plantilla" },
  { id: "products.view_audit", module: "Productos y Eventos", submodule: "Historial de cambios" },
  { id: "ranking.executives", module: "Ranking", submodule: "Ranking de ejecutivos" },
  { id: "teams.view", module: "Equipos", submodule: "Ventas por equipo" },
  { id: "executives.manage", module: "Ejecutivos", submodule: "Directorio comercial" },
  { id: "incidents.view", module: "Incidencias", submodule: "Dashboard y seguimiento" },
  { id: "incidents.create", module: "Incidencias", submodule: "Registrar incidencia" },
  { id: "incidents.manage", module: "Incidencias", submodule: "Cerrar y aplicar medidas" },
  { id: "incidents.export", module: "Incidencias", submodule: "Reportes exportables" },
  { id: "incidents.criteria", module: "Incidencias", submodule: "Configuracion de criterios" },
  { id: "goals.manage", module: "Metas", submodule: "Metas mensuales" },
  { id: "training.view", module: "Academia Comercial", submodule: "Inicio y rutas" },
  { id: "training.manage", module: "Academia Comercial", submodule: "Crear rutas y contenidos" },
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
  {
    id: "program-salud-ocupacional",
    name: "Diplomado en Salud Ocupacional",
    baseProductName: "Diplomado en Salud Ocupacional",
    editionName: "Edicion junio 2026",
    code: "D.SALUDOCUPACIONAL-0626",
    productType: "Diplomado",
    area: "Salud ocupacional",
    status: "Activo para ventas",
    modality: "Semipresencial",
    startDate: "2026-06-22",
    endDate: "2026-10-22",
    durationValue: 4,
    durationUnit: "Meses",
    classDays: "Sabados",
    scheduleSummary: "Teoria 05:00 PM a 09:00 PM",
    academicHours: 384,
    certificationType: "Universitaria",
    certifyingInstitution: "UNASAM // Rebagliati Diplomados",
    targetAudience: "Profesionales de salud",
    allowedProfiles: ["Medicos", "Licenciados", "Tecnicos"],
    shortDescription: "Programa orientado a actualizar competencias en salud ocupacional y seguridad en el trabajo.",
    commercialDescription: "Fortalece tu CV con una formacion aplicable, certificacion respaldada y enfoque practico para el entorno laboral.",
    priceFrom: 80,
    enrollmentAmount: 80,
    monthlyAmount: 150,
    monthlyCount: 4,
    certificateAmount: 160,
    promoName: "Inversion promocional junio",
    promoValidUntil: "2026-06-30",
    formUrl: "https://forms.gle/salud-ocupacional",
    active: true,
    createdAt: "2026-06-01"
  },
  {
    id: "program-emergencias",
    name: "Emergencias y Desastres",
    baseProductName: "Emergencias y Desastres",
    editionName: "Curso modular junio 2026",
    code: "CM.EMERGENCIAS-0626",
    productType: "Curso Modular",
    area: "Emergencias",
    status: "Activo para ventas",
    modality: "Virtual",
    startDate: "2026-06-18",
    durationValue: 6,
    durationUnit: "Sesiones",
    classDays: "Martes y jueves",
    scheduleSummary: "07:00 PM a 09:30 PM",
    academicHours: 120,
    certificationType: "Institucional",
    certifyingInstitution: "Rebagliati Diplomados",
    targetAudience: "Profesionales de salud",
    allowedProfiles: ["Licenciados", "Tecnicos", "Estudiantes"],
    priceFrom: 95,
    singlePaymentAmount: 95,
    formUrl: "https://forms.gle/emergencias",
    active: true,
    createdAt: "2026-06-01"
  },
  {
    id: "program-inyectoterapia",
    name: "Inyectoterapia",
    baseProductName: "Inyectoterapia",
    editionName: "Curso asincronico",
    code: "C.INYECTOTERAPIA-0626",
    productType: "Curso",
    area: "Procedimientos",
    status: "Activo para ventas",
    modality: "Asincronico",
    durationValue: 20,
    durationUnit: "Horas",
    academicHours: 40,
    certificationType: "Institucional",
    certifyingInstitution: "Rebagliati Diplomados",
    targetAudience: "Tecnicos, estudiantes y publico general",
    allowedProfiles: ["Tecnicos", "Estudiantes", "Publico general"],
    priceFrom: 80,
    singlePaymentAmount: 80,
    active: true,
    createdAt: "2026-06-01"
  },
  {
    id: "program-uci",
    name: "UCI y Cuidados Criticos",
    baseProductName: "UCI y Cuidados Criticos",
    editionName: "Diplomado virtual junio 2026",
    code: "D.UCI-0626",
    productType: "Diplomado",
    area: "Cuidados criticos",
    status: "Activo para ventas",
    modality: "Virtual",
    startDate: "2026-06-25",
    durationValue: 5,
    durationUnit: "Meses",
    scheduleSummary: "Domingos 08:00 AM a 01:00 PM",
    academicHours: 420,
    certificationType: "Universitaria",
    certifyingInstitution: "UNASAM // Rebagliati Diplomados",
    targetAudience: "Profesionales de enfermeria y salud",
    allowedProfiles: ["Licenciados", "Medicos"],
    priceFrom: 100,
    enrollmentAmount: 100,
    monthlyAmount: 180,
    monthlyCount: 5,
    certificateAmount: 180,
    active: true,
    createdAt: "2026-06-01"
  }
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
  { role: "Administrador", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "products.view", "products.create", "products.edit", "products.archive", "products.activate", "products.manage_prices", "products.manage_links", "products.generate_templates", "products.import_from_template", "products.view_audit", "ranking.executives", "teams.view", "executives.manage", "incidents.view", "incidents.create", "incidents.manage", "incidents.export", "incidents.criteria", "goals.manage", "training.view", "training.manage", "customer-map.view", "reports.export", "notifications.view", "notifications.manage"] },
  { role: "Jefe de ventas", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "products.view", "products.edit", "products.generate_templates", "ranking.executives", "teams.view", "executives.manage", "incidents.view", "incidents.create", "incidents.manage", "incidents.export", "goals.manage", "training.view", "training.manage", "customer-map.view", "reports.export", "notifications.view", "notifications.manage"] },
  { role: "Lider de ventas", permissions: ["dashboard.resumen", "sales.new", "sales.validation", "products.view", "ranking.executives", "teams.view", "incidents.view", "incidents.create", "training.view", "customer-map.view", "reports.export", "notifications.view"] },
  { role: "Ejecutivo", permissions: ["dashboard.resumen", "sales.new", "products.view", "ranking.executives", "teams.view", "incidents.view", "training.view", "customer-map.view", "notifications.view"] },
  { role: "Marketing", permissions: ["dashboard.resumen", "products.view", "products.create", "products.edit", "products.manage_links", "products.generate_templates", "products.import_from_template", "products.view_audit", "ranking.executives", "teams.view", "training.view", "customer-map.view", "reports.export", "notifications.view"] },
  { role: "Solo lectura", permissions: ["dashboard.resumen", "products.view", "ranking.executives", "teams.view", "incidents.view", "training.view", "customer-map.view", "reports.export", "notifications.view"] }
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

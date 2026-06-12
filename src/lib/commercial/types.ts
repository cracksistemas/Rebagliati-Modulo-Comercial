export type ProductType = "Curso" | "Curso Modular" | "Diplomado";
export type SaleStatus = "registrada" | "pendiente_validacion" | "validada" | "observada" | "anulada";

export type Executive = {
  id: string;
  fullName: string;
  code: string;
  teamId?: string;
  shift: "Manana" | "Tarde" | "Noche";
  status: "Activo" | "Inactivo" | "Baja";
  photoUrl?: string;
  goalAmount: number;
  currentSales: number;
  points: number;
  previousRank?: number;
};

export type Team = {
  id: string;
  name: string;
  color: string;
  leaderId?: string;
  goalAmount: number;
  active: boolean;
};

export type Sale = {
  id: string;
  saleDate: string;
  executiveId: string;
  teamId?: string;
  productType: ProductType;
  productName: string;
  quantity: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  leadSource: string;
  paymentMethod: string;
  validationStatus: SaleStatus;
  notes?: string;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  area: string;
  status: "Activo" | "Inactivo" | "Pendiente" | "Bloqueado" | "Archivado";
  lastAccess: string;
  createdAt: string;
  avatarUrl?: string;
  executiveId?: string;
  code?: string;
  shift?: "Manana" | "Tarde" | "Noche";
  teamId?: string;
};

export type SalesProgram = {
  id: string;
  name: string;
  productType: ProductType;
  active: boolean;
  createdAt: string;
};

export type AuthorizedDiscount = {
  id: string;
  label: string;
  amount: number;
  discountType: "amount" | "percent";
  active: boolean;
  requiresApproval?: boolean;
};

export type CommercialOption = {
  id: string;
  label: string;
  active: boolean;
  createdAt: string;
};

export type ModulePermission = {
  id: string;
  module: string;
  submodule: string;
};

export type RolePermissionConfig = {
  role: string;
  permissions: string[];
};

export type AuditEvent = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  module: string;
  target: string;
  result: "Exitoso" | "Observado" | "Fallido";
  criticality: "Baja" | "Media" | "Alta" | "Critica";
  before?: string;
  after?: string;
};

export type ClientProfile = {
  id: string;
  name: string;
  description: string;
  pain: string;
  motivator: string;
  frequency: string;
  loyalty: "Baja" | "Media" | "Alta";
  urgency: "Baja" | "Media" | "Alta" | "Critica";
  priceSensitivity: "Baja" | "Media" | "Alta";
  modality: string;
  status: "Activo" | "En revision" | "Archivado" | "Borrador";
  pains: string[];
  motivators: string[];
  objections: string[];
  arguments: string[];
  programs: string[];
  messages: string[];
};

export type IncidentSeverity = "Leve" | "Moderada" | "Grave" | "Critica";
export type IncidentStatus =
  | "Pendiente"
  | "En revision"
  | "Conversado con ejecutivo"
  | "Medida aplicada"
  | "Corregido"
  | "Cerrado"
  | "Reabierto";

export type Incident = {
  id: string;
  incidentCode: string;
  incidentDate: string;
  executiveId: string;
  executiveName: string;
  salesLeaderId?: string;
  salesLeaderName: string;
  description: string;
  severity: IncidentSeverity;
  category: string;
  status: IncidentStatus;
  solutionOrMeasure?: string;
  disciplinaryActionType?: string;
  pointsDeducted: number;
  clientName?: string;
  leadId?: string;
  kommoLeadId?: string;
  courseOrProgram?: string;
  channel?: string;
  evidenceUrl?: string;
  executiveResponse?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  closedBy?: string;
  closedAt?: string;
  isRecurrent: boolean;
  recurrentGroupId?: string;
};

export type IncidentCriteria = {
  categories: string[];
  severities: { label: IncidentSeverity; points: number }[];
  statuses: IncidentStatus[];
  measures: string[];
};

export type CommercialNotification = {
  id: string;
  title: string;
  message: string;
  audience: "Todos" | "Ejecutivos" | "Jefatura" | "Gerencia";
  type: "Comunicado" | "Recordatorio" | "Autorizacion descuento" | "Incidencia";
  active: boolean;
  createdAt: string;
  createdBy: string;
  readBy: string[];
  requestStatus?: "Pendiente" | "Autorizado" | "Rechazado";
  authorizedBy?: string;
  authorizedAt?: string;
  relatedSaleId?: string;
};

export type UserReminder = {
  id: string;
  title: string;
  note: string;
  dueAt?: string;
  createdAt: string;
  createdBy: string;
  completed: boolean;
};

export type CommercialState = {
  month: string;
  companyGoal: number;
  avgResponseTime: string;
  executives: Executive[];
  teams: Team[];
  sales: Sale[];
  users: UserProfile[];
  programs: SalesProgram[];
  leadSources: CommercialOption[];
  paymentMethods: CommercialOption[];
  discounts: AuthorizedDiscount[];
  rolePermissions: RolePermissionConfig[];
  incidents: Incident[];
  incidentCriteria: IncidentCriteria;
  notifications: CommercialNotification[];
  reminders: UserReminder[];
  audit: AuditEvent[];
  clientProfiles: ClientProfile[];
};

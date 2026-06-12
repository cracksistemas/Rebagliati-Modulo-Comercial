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
  active: boolean;
  requiresApproval?: boolean;
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

export type CommercialState = {
  month: string;
  companyGoal: number;
  avgResponseTime: string;
  executives: Executive[];
  teams: Team[];
  sales: Sale[];
  users: UserProfile[];
  programs: SalesProgram[];
  discounts: AuthorizedDiscount[];
  rolePermissions: RolePermissionConfig[];
  audit: AuditEvent[];
  clientProfiles: ClientProfile[];
};

export type ProductType = "Curso" | "Curso Modular" | "Diplomado" | "Taller" | "Seminario" | "Certifícate" | "Asincrónico" | "Otro" | string;
export type SaleStatus = "registrada" | "pendiente_validacion" | "validada" | "observada" | "rechazada" | "anulada" | "pago_parcial" | "saldo_pendiente" | "completada";

export type SaleParticipant = {
  fullName: string;
  documentType: "DNI" | "Carnet de extranjería" | "Pasaporte" | "RUC" | "Otro" | string;
  documentNumber: string;
  phone: string;
  email: string;
  country?: string;
  department: string;
  province: string;
  district: string;
  workplace?: string;
  academicDegree?: string;
  profession?: string;
  licenseNumber?: string;
  address?: string;
  notes?: string;
};

export type SalePayment = {
  paymentDate: string;
  paymentTime?: string;
  concept: string;
  method: string;
  entity?: string;
  destinationHolder?: string;
  operationNumber?: string;
  expectedAmount: number;
  paidAmount: number;
  status: "Pendiente de validación" | "Validado" | "Observado" | "Rechazado" | "Duplicado" | "No coincide monto" | "No coincide titular" | "No legible" | string;
};

export type SalePaymentPlan = {
  planType: string;
  billingType: string;
  enrollmentAmount?: number;
  monthlyAmount?: number;
  monthlyCount?: number;
  certificateAmount?: number;
  totalProgramAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  nextDueDate?: string;
  nextDueAmount?: number;
};

export type SaleAttachmentDraft = {
  id: string;
  attachmentType: string;
  fileName: string;
  description?: string;
  dataUrl?: string;
};

export type SaleValidationChecklist = {
  receiptLegible: boolean;
  amountMatches: boolean;
  operationNotDuplicated: boolean;
  participantComplete: boolean;
  programMatches: boolean;
  modalityCorrect: boolean;
  paymentConceptClear: boolean;
  discountAuthorized: boolean;
};

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
  sourceKey?: string;
  saleDate: string;
  executiveId: string;
  teamId?: string;
  productId?: string;
  productEditionId?: string;
  priceTierId?: string;
  productType: ProductType;
  productName: string;
  programCode?: string;
  modality?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  schedule?: string;
  certification?: string;
  certifyingInstitution?: string;
  commercialStatus?: string;
  attentionChannel?: string;
  quantity: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount?: number;
  pendingAmount?: number;
  billingType?: string;
  paymentPlanType?: string;
  paymentConcept?: string;
  paymentEntity?: string;
  destinationHolder?: string;
  operationNumber?: string;
  operationDate?: string;
  operationTime?: string;
  paymentStatus?: string;
  officialAmount?: number;
  soldAmount?: number;
  priceDifference?: number;
  priceOverrideReason?: string;
  leadSource: string;
  paymentMethod: string;
  validationStatus: SaleStatus;
  notes?: string;
  participant?: Partial<SaleParticipant>;
  payment?: Partial<SalePayment>;
  paymentPlan?: Partial<SalePaymentPlan>;
  attachments?: SaleAttachmentDraft[];
  validationChecklist?: Partial<SaleValidationChecklist>;
  followups?: string[];
  modalityDetails?: Record<string, string | number | boolean | undefined>;
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
  code?: string;
  baseProductName?: string;
  editionName?: string;
  area?: string;
  status?: "Borrador" | "En revision" | "Activo para ventas" | "Pausado" | "Cerrado" | "Archivado" | "Cancelado" | string;
  modality?: string;
  startDate?: string;
  endDate?: string;
  durationValue?: number;
  durationUnit?: string;
  classDays?: string;
  scheduleSummary?: string;
  academicHours?: number;
  credits?: number;
  certificationType?: string;
  certifyingInstitution?: string;
  alliedInstitutions?: string;
  targetAudience?: string;
  allowedProfiles?: string[];
  shortDescription?: string;
  commercialDescription?: string;
  academicOwner?: string;
  commercialOwner?: string;
  accessConfig?: {
    admissionMode?: string;
    releaseRule?: string;
    accessDurationDays?: number;
    requiresValidatedPayment?: boolean;
    credentialDelivery?: string;
    welcomeChannel?: string;
  };
  academicConfig?: {
    moduleCount?: number;
    sessionCount?: number;
    materialsDeliveryMode?: string;
    evaluationRequired?: boolean;
    minimumPassingGrade?: number;
    certificateRule?: string;
    progressTracking?: string;
  };
  priceFrom?: number;
  enrollmentAmount?: number;
  monthlyAmount?: number;
  monthlyCount?: number;
  singlePaymentAmount?: number;
  certificateAmount?: number;
  promoName?: string;
  promoValidUntil?: string;
  formUrl?: string;
  whatsappGroupUrl?: string;
  zoomUrl?: string;
  campusUrl?: string;
  brochureUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  templateText?: string;
  templateVariants?: Record<string, string>;
  sessions?: {
    sessionNumber: number;
    sessionName: string;
    sessionType: string;
    sessionDate?: string;
    dayName?: string;
    startTime?: string;
    endTime?: string;
    sessionModality?: string;
    description?: string;
  }[];
  priceTiers?: {
    id: string;
    profileName: string;
    currency: string;
    pricingType: string;
    enrollmentPromoAmount?: number;
    enrollmentRegularAmount?: number;
    monthlyPromoAmount?: number;
    monthlyRegularAmount?: number;
    monthlyCount?: number;
    singlePaymentPromoAmount?: number;
    singlePaymentRegularAmount?: number;
    diplomaCertificateAmount?: number;
    physicalCertificateAmount?: number;
    certificateAmount?: number;
    promoValidUntil?: string;
    status: string;
  }[];
  changeLog?: {
    id: string;
    action: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    reason?: string;
    changedBy: string;
    createdAt: string;
  }[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
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

export type CommercialBoardPriority = "Alta" | "Media" | "Baja";
export type CommercialBoardStatus =
  | "Sin iniciar"
  | "En gestion"
  | "En riesgo"
  | "Avance bajo"
  | "En ritmo"
  | "Objetivo cumplido"
  | "Cerrado"
  | "Pausado";

export type CommercialBoardComment = {
  id: string;
  comment: string;
  user: string;
  createdAt: string;
  type: "Observacion" | "Cambio de prioridad" | "Reasignacion" | "Bloqueo" | "Seguimiento" | "Alerta";
};

export type CommercialBoardAssignment = {
  id: string;
  boardDate: string;
  executiveId: string;
  teamId?: string;
  productEditionId?: string;
  productName: string;
  productCode?: string;
  productType: ProductType;
  modality?: string;
  eventStartDate?: string;
  leadSource: string;
  campaign?: string;
  priority: CommercialBoardPriority;
  priorityScore: number;
  assignedLeadsCount: number;
  leadsAssignedToday: number;
  dailyCallGoal: number;
  callsMade: number;
  callsAnswered: number;
  messagesSent: number;
  messagesReceived: number;
  contactsMade: number;
  salesCount: number;
  salesAmount: number;
  status: CommercialBoardStatus;
  lastUpdatedAt: string;
  comments?: CommercialBoardComment[];
  kommoUrl?: string;
};

export type CommercialBoardLead = {
  id: string;
  leadName: string;
  phone?: string;
  source: string;
  campaign?: string;
  productInterest: string;
  createdAt: string;
  kommoStatus?: string;
  score: number;
  suggestedPriority: CommercialBoardPriority;
  assignedTo?: string;
  kommoLeadId?: string;
  kommoUrl?: string;
};

export type CommercialBoardTimeBlock = {
  id: string;
  blockTime: string;
  blockLabel: string;
  blockWeight: number;
  assignedLeadsCount: number;
  callGoal: number;
  callsMade: number;
  messagesSent: number;
  messagesReceived: number;
  contactsMade: number;
  salesCount: number;
};

export type CommercialBoardSheetSlot = {
  id: string;
  code: string;
  range: string;
  primary: string;
  secondary: string;
  count: number;
  status?: string;
};

export type CommercialBoardApiBucket = {
  api: string;
  label: string;
  total: number;
};

export type CommercialBoardCutBlock = {
  label: string;
  weekdayGoal: number;
  weekendGoal: number;
  weight: number;
};

export type CommercialBoardSheetConfig = {
  porAsignarTotal?: number;
  userSlots: CommercialBoardSheetSlot[];
  whatsappSlots: CommercialBoardSheetSlot[];
  extraSlots: CommercialBoardSheetSlot[];
  socialMatrix: Record<string, Record<string, number>>;
  apiBuckets: CommercialBoardApiBucket[];
  cutBlocks: CommercialBoardCutBlock[];
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
  boardAssignments: CommercialBoardAssignment[];
  boardLeads: CommercialBoardLead[];
  boardTimeBlocks: CommercialBoardTimeBlock[];
  boardSheetConfig: CommercialBoardSheetConfig;
};

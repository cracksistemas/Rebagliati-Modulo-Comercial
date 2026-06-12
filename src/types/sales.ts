export type UserRole =
  | "gerencia"
  | "jefe_ventas"
  | "lider_ventas"
  | "ejecutivo"
  | "marketing_soporte"
  | "admin_sistema";

export type ProductTypeCode = "C" | "CM" | "D";

export type SaleStatus =
  | "registrada"
  | "pendiente_validacion"
  | "validada"
  | "observada"
  | "anulada";

export type LeadSource = "Meta Ads" | "WhatsApp" | "Base" | "Referido" | "Organico" | "Otro";

export interface Executive {
  id: string;
  code: string;
  fullName: string;
  photoUrl: string;
  shift: "Manana" | "Tarde" | "Noche";
  status: "Activo" | "Inactivo";
  teamId: string;
  previousRank: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  leaderId: string;
  monthlyGoal: number;
  active: boolean;
}

export interface ProductType {
  id: string;
  code: ProductTypeCode;
  name: "Curso" | "Curso Modular" | "Diplomado";
  pointWeight: number;
}

export interface Product {
  id: string;
  productTypeId: string;
  name: string;
  modality: string;
  price: number;
  active: boolean;
}

export interface Sale {
  id: string;
  saleDate: string;
  executiveId: string;
  teamId: string;
  productTypeId: string;
  productId: string;
  quantity: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentMethod: string;
  leadSource: LeadSource;
  validationStatus: SaleStatus;
  notes?: string;
  evidencePath?: string;
}

export interface MonthlyGoal {
  id: string;
  month: string;
  scope: "company" | "team" | "executive";
  teamId?: string;
  executiveId?: string;
  goalAmount: number;
  goalPoints: number;
}

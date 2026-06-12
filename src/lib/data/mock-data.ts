import type { Executive, MonthlyGoal, Product, ProductType, Sale, Team } from "@/types/sales";

export const productTypes: ProductType[] = [
  { id: "pt-curso", code: "C", name: "Curso", pointWeight: 1 },
  { id: "pt-modular", code: "CM", name: "Curso Modular", pointWeight: 2 },
  { id: "pt-diplomado", code: "D", name: "Diplomado", pointWeight: 4 }
];

export const teams: Team[] = [
  { id: "team-azul", name: "Equipo Azul", color: "#00A7EB", leaderId: "exec-patt", monthlyGoal: 42000, active: true },
  { id: "team-norte", name: "Equipo Norte", color: "#01017B", leaderId: "exec-mariana", monthlyGoal: 38000, active: true },
  { id: "team-vip", name: "Equipo VIP", color: "#34C759", leaderId: "exec-eliana", monthlyGoal: 40000, active: true }
];

export const executives: Executive[] = [
  {
    id: "exec-eliana",
    code: "E-001",
    fullName: "Eliana Benavides",
    photoUrl: "/avatars/eliana.svg",
    shift: "Manana",
    status: "Activo",
    teamId: "team-vip",
    previousRank: 3
  },
  {
    id: "exec-mariana",
    code: "E-002",
    fullName: "Mariana Haro",
    photoUrl: "/avatars/mariana.svg",
    shift: "Tarde",
    status: "Activo",
    teamId: "team-norte",
    previousRank: 1
  },
  {
    id: "exec-diego",
    code: "E-003",
    fullName: "Diego Ipanaque",
    photoUrl: "/avatars/diego.svg",
    shift: "Manana",
    status: "Activo",
    teamId: "team-azul",
    previousRank: 4
  },
  {
    id: "exec-patt",
    code: "E-004",
    fullName: "Patt Rivera",
    photoUrl: "/avatars/patt.svg",
    shift: "Noche",
    status: "Activo",
    teamId: "team-azul",
    previousRank: 2
  },
  {
    id: "exec-luis",
    code: "E-005",
    fullName: "Luis Cabrera",
    photoUrl: "/avatars/luis.svg",
    shift: "Tarde",
    status: "Activo",
    teamId: "team-norte",
    previousRank: 6
  },
  {
    id: "exec-valeria",
    code: "E-006",
    fullName: "Valeria Gomez",
    photoUrl: "/avatars/valeria.svg",
    shift: "Manana",
    status: "Activo",
    teamId: "team-vip",
    previousRank: 5
  }
];

export const products: Product[] = [
  { id: "prod-admin", productTypeId: "pt-curso", name: "Curso de Administracion Comercial", modality: "Virtual", price: 790, active: true },
  { id: "prod-excel", productTypeId: "pt-curso", name: "Excel para Gestion Empresarial", modality: "En vivo", price: 690, active: true },
  { id: "prod-mod-gestion", productTypeId: "pt-modular", name: "Curso Modular en Gestion Publica", modality: "Virtual", price: 1290, active: true },
  { id: "prod-mod-rrhh", productTypeId: "pt-modular", name: "Curso Modular en Recursos Humanos", modality: "En vivo", price: 1490, active: true },
  { id: "prod-dip-contrataciones", productTypeId: "pt-diplomado", name: "Diplomado en Contrataciones del Estado", modality: "Virtual", price: 2490, active: true },
  { id: "prod-dip-mineria", productTypeId: "pt-diplomado", name: "Diplomado en Gestion Minera", modality: "Hibrido", price: 2790, active: true }
];

export const monthlyGoals: MonthlyGoal[] = [
  { id: "goal-company", month: "2026-06-01", scope: "company", goalAmount: 120000, goalPoints: 420 },
  { id: "goal-azul", month: "2026-06-01", scope: "team", teamId: "team-azul", goalAmount: 42000, goalPoints: 145 },
  { id: "goal-norte", month: "2026-06-01", scope: "team", teamId: "team-norte", goalAmount: 38000, goalPoints: 130 },
  { id: "goal-vip", month: "2026-06-01", scope: "team", teamId: "team-vip", goalAmount: 40000, goalPoints: 145 }
];

export const sales: Sale[] = [
  { id: "sale-001", saleDate: "2026-06-01", executiveId: "exec-eliana", teamId: "team-vip", productTypeId: "pt-diplomado", productId: "prod-dip-contrataciones", quantity: 8, grossAmount: 19920, discountAmount: 950, netAmount: 18970, paymentMethod: "Tarjeta", leadSource: "Meta Ads", validationStatus: "validada" },
  { id: "sale-002", saleDate: "2026-06-02", executiveId: "exec-eliana", teamId: "team-vip", productTypeId: "pt-modular", productId: "prod-mod-gestion", quantity: 12, grossAmount: 15480, discountAmount: 1200, netAmount: 14280, paymentMethod: "Transferencia", leadSource: "WhatsApp", validationStatus: "validada" },
  { id: "sale-003", saleDate: "2026-06-03", executiveId: "exec-mariana", teamId: "team-norte", productTypeId: "pt-diplomado", productId: "prod-dip-mineria", quantity: 7, grossAmount: 19530, discountAmount: 1100, netAmount: 18430, paymentMethod: "Transferencia", leadSource: "Base", validationStatus: "validada" },
  { id: "sale-004", saleDate: "2026-06-04", executiveId: "exec-mariana", teamId: "team-norte", productTypeId: "pt-curso", productId: "prod-excel", quantity: 15, grossAmount: 10350, discountAmount: 820, netAmount: 9530, paymentMethod: "Yape", leadSource: "Referido", validationStatus: "validada" },
  { id: "sale-005", saleDate: "2026-06-04", executiveId: "exec-diego", teamId: "team-azul", productTypeId: "pt-diplomado", productId: "prod-dip-contrataciones", quantity: 6, grossAmount: 14940, discountAmount: 720, netAmount: 14220, paymentMethod: "Tarjeta", leadSource: "Meta Ads", validationStatus: "validada" },
  { id: "sale-006", saleDate: "2026-06-05", executiveId: "exec-patt", teamId: "team-azul", productTypeId: "pt-modular", productId: "prod-mod-rrhh", quantity: 9, grossAmount: 13410, discountAmount: 960, netAmount: 12450, paymentMethod: "Transferencia", leadSource: "WhatsApp", validationStatus: "validada" },
  { id: "sale-007", saleDate: "2026-06-06", executiveId: "exec-luis", teamId: "team-norte", productTypeId: "pt-curso", productId: "prod-admin", quantity: 19, grossAmount: 15010, discountAmount: 1460, netAmount: 13550, paymentMethod: "Tarjeta", leadSource: "Organico", validationStatus: "validada" },
  { id: "sale-008", saleDate: "2026-06-07", executiveId: "exec-valeria", teamId: "team-vip", productTypeId: "pt-curso", productId: "prod-excel", quantity: 17, grossAmount: 11730, discountAmount: 830, netAmount: 10900, paymentMethod: "Yape", leadSource: "Base", validationStatus: "validada" },
  { id: "sale-009", saleDate: "2026-06-08", executiveId: "exec-diego", teamId: "team-azul", productTypeId: "pt-modular", productId: "prod-mod-gestion", quantity: 8, grossAmount: 10320, discountAmount: 620, netAmount: 9700, paymentMethod: "Transferencia", leadSource: "Referido", validationStatus: "pendiente_validacion", notes: "Pendiente evidencia completa" },
  { id: "sale-010", saleDate: "2026-06-08", executiveId: "exec-patt", teamId: "team-azul", productTypeId: "pt-diplomado", productId: "prod-dip-mineria", quantity: 4, grossAmount: 11160, discountAmount: 580, netAmount: 10580, paymentMethod: "Tarjeta", leadSource: "Meta Ads", validationStatus: "observada", notes: "Corregir descuento aplicado" }
];

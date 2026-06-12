import type { SaleStatus } from "@/types/sales";

const labels: Record<SaleStatus, string> = {
  registrada: "Registrada",
  pendiente_validacion: "Pendiente",
  validada: "Validada",
  observada: "Observada",
  anulada: "Anulada"
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}

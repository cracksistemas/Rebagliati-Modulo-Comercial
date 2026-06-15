"use client";

import { Ban, Check, Pencil, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, setCommercialState } from "@/lib/commercial/store";
import type { ProductType, Sale, SaleStatus } from "@/lib/commercial/types";

const productTypes: ProductType[] = ["Curso", "Curso Modular", "Diplomado", "Taller", "Seminario", "Certifícate", "Asincrónico", "Otro"];
const statusOptions: SaleStatus[] = ["registrada", "pendiente_validacion", "validada", "observada", "rechazada", "anulada", "pago_parcial", "saldo_pendiente", "completada"];
const annulReasonOptions = [
  "Duplicada",
  "Error en monto",
  "Cliente cancelo",
  "Venta no sustentada",
  "Producto incorrecto",
  "Ejecutivo incorrecto",
  "Otro"
];

type ConfirmAction = {
  sale: Sale;
  validationStatus: SaleStatus;
};

type ValidationErrors = Partial<Record<"saleDate" | "executiveId" | "teamId" | "productName" | "grossAmount", string>>;

function statusLabel(status: SaleStatus) {
  const labels: Record<SaleStatus, string> = {
    registrada: "Registrada",
    pendiente_validacion: "Pendiente",
    validada: "Validada",
    observada: "Observada",
    rechazada: "Rechazada",
    anulada: "Anulada",
    pago_parcial: "Pago parcial",
    saldo_pendiente: "Saldo pendiente",
    completada: "Completada"
  };
  return labels[status] ?? status;
}

function cloneSale(sale: Sale) {
  return { ...sale };
}

function isSameSale(left: Sale | null, right: Sale | null) {
  if (!left || !right) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSaleDraft(sale: Sale | null): ValidationErrors {
  if (!sale) return {};
  const errors: ValidationErrors = {};
  if (!sale.saleDate) errors.saleDate = "La fecha es obligatoria.";
  if (!sale.executiveId) errors.executiveId = "Selecciona un ejecutivo.";
  if (!sale.teamId) errors.teamId = "Selecciona un equipo.";
  if (!sale.productName.trim()) errors.productName = "Ingresa el programa o evento.";
  if (Number(sale.grossAmount) <= 0) errors.grossAmount = "El monto bruto debe ser mayor a cero.";
  return errors;
}

async function persistSale(sale: Sale, action: "update" | "annul" = "update", annulmentReason?: string) {
  const response = await fetch("/api/commercial/sales", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...sale, action, annulmentReason })
  });
  const payload = (await response.json()) as { ok?: boolean; data?: Sale; error?: string };
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo actualizar la venta.");
  }
  return payload.data;
}

export function SalesValidationView() {
  const [state, setState] = useState(getCommercialState);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [originalEditingSale, setOriginalEditingSale] = useState<Sale | null>(null);
  const [annulSale, setAnnulSale] = useState<Sale | null>(null);
  const [annulReasonPreset, setAnnulReasonPreset] = useState(annulReasonOptions[0]);
  const [annulReasonDetail, setAnnulReasonDetail] = useState("");
  const [annulConfirmed, setAnnulConfirmed] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState("");
  const [visibleCount, setVisibleCount] = useState(40);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  useEffect(() => {
    if (!recentlyUpdatedId) return;
    const timeout = window.setTimeout(() => setRecentlyUpdatedId(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [recentlyUpdatedId]);

  const executivesById = useMemo(() => new Map(state.executives.map((item) => [item.id, item])), [state.executives]);
  const teamsById = useMemo(() => new Map(state.teams.map((item) => [item.id, item])), [state.teams]);

  const sales = useMemo(
    () =>
      [...state.sales].sort((a, b) => {
        const statusPriority = getStatusPriority(a.validationStatus) - getStatusPriority(b.validationStatus);
        return statusPriority || b.saleDate.localeCompare(a.saleDate);
      }),
    [state.sales]
  );
  const visibleSales = sales.slice(0, visibleCount);
  const draftErrors = useMemo(() => validateSaleDraft(editingSale), [editingSale]);
  const hasDraftErrors = Object.keys(draftErrors).length > 0;
  const hasUnsavedChanges = !isSameSale(editingSale, originalEditingSale);

  function localUpdate(updatedSale: Sale) {
    const current = getCommercialState();
    const next = {
      ...current,
      sales: current.sales.map((sale) => (sale.id === updatedSale.id ? updatedSale : sale))
    };
    setCommercialState(next);
    setState(next);
    setRecentlyUpdatedId(updatedSale.id);
  }

  function openEditSale(sale: Sale) {
    const draft = cloneSale(sale);
    setOriginalEditingSale(draft);
    setEditingSale(draft);
    setStatus("");
  }

  function requestCloseEdit() {
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeEdit();
  }

  function closeEdit() {
    setEditingSale(null);
    setOriginalEditingSale(null);
    setDiscardConfirmOpen(false);
  }

  function requestStatusChange(sale: Sale, validationStatus: SaleStatus) {
    setConfirmAction({ sale, validationStatus });
  }

  async function confirmStatusChange() {
    if (!confirmAction) return;
    await changeStatus(confirmAction.sale, confirmAction.validationStatus);
    setConfirmAction(null);
  }

  async function changeStatus(sale: Sale, validationStatus: SaleStatus) {
    setSaving(true);
    setStatus("");
    try {
      const netAmount = Math.max(Number(sale.grossAmount) - Number(sale.discountAmount), 0);
      const updated = await persistSale({ ...sale, validationStatus, netAmount });
      localUpdate(updated);
      setStatus(validationStatus === "validada" ? "Venta aprobada y actualizada en ranking." : "Venta marcada como observada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la venta.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEditedSale() {
    if (!editingSale) return;
    if (hasDraftErrors) {
      setStatus("Revisa los campos marcados antes de guardar.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const netAmount = Math.max(Number(editingSale.grossAmount) - Number(editingSale.discountAmount), 0);
      const updated = await persistSale({ ...editingSale, netAmount });
      localUpdate(updated);
      closeEdit();
      setStatus(updated.validationStatus === "validada" ? "Venta corregida y aprobada." : "Venta corregida correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la venta.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmAnnulSale() {
    if (!annulSale) return;
    const reason = buildAnnulReason(annulReasonPreset, annulReasonDetail);
    if (!reason.trim()) {
      setStatus("Toda anulacion requiere motivo.");
      return;
    }
    if (!annulConfirmed) {
      setStatus("Confirma que deseas anular la venta sin borrado fisico.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const updated = await persistSale({ ...annulSale, validationStatus: "anulada" }, "annul", reason);
      localUpdate(updated);
      closeAnnul();
      setStatus("Venta anulada sin borrado fisico.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo anular la venta.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  function closeAnnul() {
    setAnnulSale(null);
    setAnnulReasonPreset(annulReasonOptions[0]);
    setAnnulReasonDetail("");
    setAnnulConfirmed(false);
  }

  function updateDraft<K extends keyof Sale>(key: K, value: Sale[K]) {
    if (!editingSale) return;
    const next = { ...editingSale, [key]: value };

    if (key === "executiveId") {
      const executive = state.executives.find((item) => item.id === value);
      next.teamId = executive?.teamId ?? "";
    }

    if (key === "teamId") {
      const executive = state.executives.find((item) => item.id === next.executiveId);
      if (executive?.teamId && executive.teamId !== value) {
        next.executiveId = "";
      }
    }

    next.netAmount = Math.max(Number(next.grossAmount ?? 0) - Number(next.discountAmount ?? 0), 0);
    setEditingSale(next);
  }

  return (
    <section className="card sales-validation-card">
      <div className="sales-validation-header">
        <div>
          <p className="eyebrow">Control</p>
          <h2>Validacion de ventas</h2>
          <p className="muted">Corrige ventas observadas, aprueba registros correctos o anula con motivo sin borrar trazabilidad.</p>
        </div>
        {status ? <span className="validation-toast">{status}</span> : null}
      </div>

      <div className="sales-validation-table-wrap">
        <table className="table sales-validation-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ejecutivo</th>
              <th>Equipo</th>
              <th>Producto</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleSales.map((sale) => {
              const executive = executivesById.get(sale.executiveId);
              const team = teamsById.get(sale.teamId ?? "");
              return (
                <tr key={sale.id} className={recentlyUpdatedId === sale.id ? "sale-row-updated" : ""}>
                  <td data-label="Fecha">{sale.saleDate}</td>
                  <td data-label="Ejecutivo">{executive?.fullName ?? "Sin ejecutivo"}</td>
                  <td data-label="Equipo">{team?.name ?? "Sin equipo"}</td>
                  <td data-label="Producto">{sale.productType} - {sale.productName}</td>
                  <td data-label="Monto">{money(sale.netAmount)}</td>
                  <td data-label="Estado"><span className={`status-badge status-${sale.validationStatus}`}>{statusLabel(sale.validationStatus)}</span></td>
                  <td data-label="Acciones">
                    <SaleRowActions
                      sale={sale}
                      saving={saving}
                      onApprove={() => requestStatusChange(sale, "validada")}
                      onObserve={() => requestStatusChange(sale, "observada")}
                      onEdit={() => openEditSale(sale)}
                      onAnnul={() => setAnnulSale(sale)}
                    />
                  </td>
                </tr>
              );
            })}
            {!sales.length ? (
              <tr>
                <td colSpan={7} className="muted">No hay ventas registradas para validar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {visibleCount < sales.length ? (
        <div className="sales-load-more">
          <button className="ghost-button" onClick={() => setVisibleCount((current) => current + 40)}>Cargar mas ventas</button>
        </div>
      ) : null}

      <EditSaleModal
        sale={editingSale}
        originalSale={originalEditingSale}
        saving={saving}
        executives={state.executives}
        teams={state.teams}
        errors={draftErrors}
        onChange={updateDraft}
        onClose={requestCloseEdit}
        onSave={saveEditedSale}
      />

      <AnnulSaleModal
        sale={annulSale}
        saving={saving}
        reasonPreset={annulReasonPreset}
        reasonDetail={annulReasonDetail}
        confirmed={annulConfirmed}
        onPresetChange={setAnnulReasonPreset}
        onDetailChange={setAnnulReasonDetail}
        onConfirmedChange={setAnnulConfirmed}
        onClose={closeAnnul}
        onConfirm={confirmAnnulSale}
      />

      <ConfirmStatusModal
        action={confirmAction}
        saving={saving}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmStatusChange}
      />

      {discardConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal sales-modal-small">
            <p className="eyebrow">Cambios sin guardar</p>
            <h2>Descartar correccion</h2>
            <p className="muted">Hay cambios en la venta que aun no se guardaron.</p>
            <div className="sales-modal-actions">
              <button className="ghost-button" onClick={() => setDiscardConfirmOpen(false)}>Seguir editando</button>
              <button className="danger-button" onClick={closeEdit}>Descartar cambios</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SaleRowActions({
  sale,
  saving,
  onApprove,
  onObserve,
  onEdit,
  onAnnul
}: {
  sale: Sale;
  saving: boolean;
  onApprove: () => void;
  onObserve: () => void;
  onEdit: () => void;
  onAnnul: () => void;
}) {
  const isAnnulled = sale.validationStatus === "anulada";
  return (
    <div className="sales-row-actions">
      <button className="icon-button" disabled={saving || isAnnulled} onClick={onApprove} title="Aprobar venta" aria-label="Aprobar venta"><Check size={15} /></button>
      <button className="icon-button" disabled={saving || isAnnulled} onClick={onObserve} title="Observar venta" aria-label="Observar venta"><X size={15} /></button>
      <button className="icon-button" disabled={saving || isAnnulled} onClick={onEdit} title="Editar venta" aria-label="Editar venta"><Pencil size={15} /></button>
      <button className="icon-button" disabled={saving || isAnnulled} onClick={onAnnul} title="Anular venta" aria-label="Anular venta"><Ban size={15} /></button>
    </div>
  );
}

function EditSaleModal({
  sale,
  saving,
  executives,
  teams,
  errors,
  onChange,
  onClose,
  onSave
}: {
  sale: Sale | null;
  originalSale: Sale | null;
  saving: boolean;
  executives: ReturnType<typeof getCommercialState>["executives"];
  teams: ReturnType<typeof getCommercialState>["teams"];
  errors: ValidationErrors;
  onChange: <K extends keyof Sale>(key: K, value: Sale[K]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!sale) return null;
  const saveDisabled = saving || Object.keys(errors).length > 0;

  return (
    <div className="modal-backdrop">
      <div className="modal sales-edit-modal">
        <div className="sales-modal-header">
          <div>
            <p className="eyebrow">Correccion de venta</p>
            <h2>Editar venta</h2>
            <p className="muted">Puedes corregir la venta y dejarla registrada, pendiente, observada o validada.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>

        <div className="sales-edit-grid">
          <Field label="Fecha" error={errors.saleDate}>
            <input className={errors.saleDate ? "invalid-field" : ""} type="date" value={sale.saleDate} onChange={(event) => onChange("saleDate", event.target.value)} />
          </Field>
          <Field label="Ejecutivo" error={errors.executiveId}>
            <select className={errors.executiveId ? "invalid-field" : ""} value={sale.executiveId} onChange={(event) => onChange("executiveId", event.target.value)}>
              <option value="">Seleccionar ejecutivo</option>
              {executives.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
            </select>
          </Field>
          <Field label="Equipo" error={errors.teamId}>
            <select className={errors.teamId ? "invalid-field" : ""} value={sale.teamId ?? ""} onChange={(event) => onChange("teamId", event.target.value)}>
              <option value="">Sin equipo</option>
              {teams.filter((team) => team.active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo de producto">
            <select value={sale.productType} onChange={(event) => onChange("productType", event.target.value as ProductType)}>
              {productTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Programa / evento" error={errors.productName}>
            <input className={errors.productName ? "invalid-field" : ""} value={sale.productName} onChange={(event) => onChange("productName", event.target.value)} />
          </Field>
          <Field label="Cantidad">
            <input type="number" min={0} value={sale.quantity || ""} onChange={(event) => onChange("quantity", Number(event.target.value || 0))} />
          </Field>
          <Field label="Monto bruto" error={errors.grossAmount}>
            <input className={errors.grossAmount ? "invalid-field" : ""} type="number" min={0} value={sale.grossAmount || ""} onChange={(event) => onChange("grossAmount", Number(event.target.value || 0))} />
          </Field>
          <Field label="Descuento">
            <input type="number" min={0} value={sale.discountAmount || ""} onChange={(event) => onChange("discountAmount", Number(event.target.value || 0))} />
          </Field>
          <div className="field sales-net-preview">
            <label>Monto neto</label>
            <strong>{money(sale.netAmount)}</strong>
          </div>
          <Field label="Medio de pago">
            <input value={sale.paymentMethod} onChange={(event) => onChange("paymentMethod", event.target.value)} />
          </Field>
          <Field label="Origen del lead">
            <input value={sale.leadSource} onChange={(event) => onChange("leadSource", event.target.value)} />
          </Field>
          <Field label="Estado final">
            <select value={sale.validationStatus} onChange={(event) => onChange("validationStatus", event.target.value as SaleStatus)}>
              {statusOptions.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
            </select>
          </Field>
          <div className="field sales-span-all">
            <label>Observacion interna</label>
            <textarea value={sale.notes ?? ""} onChange={(event) => onChange("notes", event.target.value)} />
          </div>
        </div>

        <div className="sales-modal-actions">
          <button className="ghost-button" disabled={saving} onClick={onClose}>Cancelar</button>
          <button className="primary-button" disabled={saveDisabled} onClick={onSave}><Check size={16} /> {saving ? "Guardando..." : "Guardar correccion"}</button>
        </div>
      </div>
    </div>
  );
}

function AnnulSaleModal({
  sale,
  saving,
  reasonPreset,
  reasonDetail,
  confirmed,
  onPresetChange,
  onDetailChange,
  onConfirmedChange,
  onClose,
  onConfirm
}: {
  sale: Sale | null;
  saving: boolean;
  reasonPreset: string;
  reasonDetail: string;
  confirmed: boolean;
  onPresetChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  onConfirmedChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!sale) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal sales-modal-small">
        <p className="eyebrow">Anulacion trazable</p>
        <h2>Anular venta</h2>
        <p className="muted">La venta no se borrara fisicamente. Quedara como anulada y registrada en auditoria.</p>
        <div className="sales-edit-grid single">
          <Field label="Motivo rapido">
            <select value={reasonPreset} onChange={(event) => onPresetChange(event.target.value)}>
              {annulReasonOptions.map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </Field>
          <Field label="Detalle del motivo">
            <textarea autoFocus value={reasonDetail} onChange={(event) => onDetailChange(event.target.value)} placeholder="Ej. duplicada, monto incorrecto, venta no sustentada" />
          </Field>
          <label className="sales-confirm-check">
            <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} />
            Confirmo que deseo anular esta venta sin borrarla fisicamente.
          </label>
        </div>
        <div className="sales-modal-actions">
          <button className="ghost-button" disabled={saving} onClick={onClose}>Cancelar</button>
          <button className="danger-button" disabled={saving || !confirmed} onClick={onConfirm}><Ban size={16} /> {saving ? "Anulando..." : "Anular venta"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmStatusModal({
  action,
  saving,
  onCancel,
  onConfirm
}: {
  action: ConfirmAction | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;
  const isApproval = action.validationStatus === "validada";
  return (
    <div className="modal-backdrop">
      <div className="modal sales-modal-small">
        <p className="eyebrow">{isApproval ? "Aprobacion" : "Observacion"}</p>
        <h2>{isApproval ? "Aprobar venta" : "Observar venta"}</h2>
        <p className="muted">
          {isApproval
            ? "Esta venta impactara el ranking oficial y el avance de metas."
            : "La venta quedara fuera del ranking oficial hasta que sea corregida."}
        </p>
        <div className="sales-confirm-summary">
          <span>Programa <strong>{action.sale.productName}</strong></span>
          <span>Monto <strong>{money(action.sale.netAmount)}</strong></span>
        </div>
        <div className="sales-modal-actions">
          <button className="ghost-button" disabled={saving} onClick={onCancel}>Cancelar</button>
          <button className={isApproval ? "primary-button" : "danger-button"} disabled={saving} onClick={onConfirm}>
            {isApproval ? <Check size={16} /> : <X size={16} />}
            {saving ? "Guardando..." : isApproval ? "Confirmar aprobacion" : "Confirmar observacion"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </div>
  );
}

function getStatusPriority(status: SaleStatus) {
  if (status === "pendiente_validacion" || status === "registrada") return 0;
  if (status === "observada") return 1;
  if (status === "validada") return 2;
  return 3;
}

function buildAnnulReason(reasonPreset: string, reasonDetail: string) {
  const detail = reasonDetail.trim();
  if (!detail || reasonPreset === detail) return reasonPreset;
  return `${reasonPreset}: ${detail}`;
}

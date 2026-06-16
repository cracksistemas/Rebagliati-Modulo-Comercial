"use client";

import { Ban, Check, Pencil, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, setCommercialState } from "@/lib/commercial/store";
import type { AuthorizedDiscount, CommercialOption, ProductType, Sale, SalesProgram, SaleStatus } from "@/lib/commercial/types";

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

type EditOptionKind = "program" | "discount" | "payment" | "lead";
type ValidationErrors = Partial<Record<"saleDate" | "executiveId" | "teamId" | "productName" | "grossAmount", string>>;
type SalesValidationFilters = {
  dateFrom: string;
  dateTo: string;
  executiveId: string;
  teamId: string;
  event: string;
  validationStatus: string;
  minAmount: string;
  maxAmount: string;
};

const emptyFilters: SalesValidationFilters = {
  dateFrom: "",
  dateTo: "",
  executiveId: "",
  teamId: "",
  event: "",
  validationStatus: "",
  minAmount: "",
  maxAmount: ""
};

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

function persistCommercialOption(payload: { kind: "program" | "lead" | "payment"; name: string; productType?: ProductType }) {
  fetch("/api/commercial/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => undefined);
}

function persistDiscounts(discounts: AuthorizedDiscount[]) {
  fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discounts })
  }).catch(() => undefined);
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
  const [filters, setFilters] = useState<SalesValidationFilters>(emptyFilters);

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  useEffect(() => {
    let alive = true;
    async function loadOptions() {
      try {
        const response = await fetch("/api/commercial/options", { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: {
            programs?: SalesProgram[];
            discounts?: AuthorizedDiscount[];
            leadSources?: CommercialOption[];
            paymentMethods?: CommercialOption[];
          };
        };
        if (!alive || !response.ok || !payload.ok || !payload.data) return;
        setState((current) => {
          const next = {
            ...current,
            programs: payload.data?.programs ?? current.programs,
            discounts: payload.data?.discounts ?? current.discounts,
            leadSources: payload.data?.leadSources ?? current.leadSources,
            paymentMethods: payload.data?.paymentMethods ?? current.paymentMethods
          };
          setCommercialState(next);
          return next;
        });
      } catch {
        undefined;
      }
    }
    loadOptions();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!recentlyUpdatedId) return;
    const timeout = window.setTimeout(() => setRecentlyUpdatedId(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [recentlyUpdatedId]);

  const executivesById = useMemo(() => new Map(state.executives.map((item) => [item.id, item])), [state.executives]);
  const teamsById = useMemo(() => new Map(state.teams.map((item) => [item.id, item])), [state.teams]);

  const sales = useMemo(
    () =>
      [...state.sales].filter((sale) => !isRetiredJuneRankingImport(sale)).sort((a, b) => {
        const statusPriority = getStatusPriority(a.validationStatus) - getStatusPriority(b.validationStatus);
        return statusPriority || b.saleDate.localeCompare(a.saleDate);
      }),
    [state.sales]
  );
  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        const amount = Number(sale.netAmount ?? 0);
        if (filters.dateFrom && sale.saleDate < filters.dateFrom) return false;
        if (filters.dateTo && sale.saleDate > filters.dateTo) return false;
        if (filters.executiveId && sale.executiveId !== filters.executiveId) return false;
        if (filters.teamId && (sale.teamId ?? "") !== filters.teamId) return false;
        if (filters.validationStatus && sale.validationStatus !== filters.validationStatus) return false;
        if (filters.minAmount && amount < Number(filters.minAmount)) return false;
        if (filters.maxAmount && amount > Number(filters.maxAmount)) return false;
        if (filters.event.trim()) {
          const query = normalizeSearch(filters.event);
          const searchable = normalizeSearch(`${sale.productType} ${sale.productName} ${sale.notes ?? ""}`);
          if (!searchable.includes(query)) return false;
        }
        return true;
      }),
    [filters, sales]
  );
  const visibleSales = filteredSales.slice(0, visibleCount);
  const draftErrors = useMemo(() => validateSaleDraft(editingSale), [editingSale]);
  const hasDraftErrors = Object.keys(draftErrors).length > 0;
  const hasUnsavedChanges = !isSameSale(editingSale, originalEditingSale);

  function updateFilter<K extends keyof SalesValidationFilters>(key: K, value: SalesValidationFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleCount(40);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setVisibleCount(40);
  }

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

  function applyCatalogProgramToDraft(programName: string) {
    if (!editingSale) return;
    const program = state.programs.find((item) => sameText(item.name, programName));
    if (!program) {
      updateDraft("productName", programName);
      return;
    }
    const price = calculateProgramPrice(program);
    const updated: Sale = {
      ...editingSale,
      productId: program.id,
      productEditionId: program.id,
      productType: program.productType,
      productName: program.name,
      programCode: program.code,
      modality: program.modality ?? editingSale.modality,
      startDate: program.startDate,
      endDate: program.endDate,
      duration: program.durationValue ? `${program.durationValue} ${program.durationUnit ?? ""}`.trim() : editingSale.duration,
      schedule: program.scheduleSummary,
      certification: program.certificationType,
      certifyingInstitution: program.certifyingInstitution,
      officialAmount: price || editingSale.officialAmount,
      grossAmount: price || editingSale.grossAmount,
      paymentPlan: {
        ...editingSale.paymentPlan,
        enrollmentAmount: program.enrollmentAmount,
        monthlyAmount: program.monthlyAmount,
        monthlyCount: program.monthlyCount,
        certificateAmount: program.certificateAmount,
        totalProgramAmount: calculateProgramTotal(program) || price
      }
    };
    updated.netAmount = Math.max(Number(updated.grossAmount ?? 0) - Number(updated.discountAmount ?? 0), 0);
    setEditingSale(updated);
  }

  function upsertEditOption(kind: EditOptionKind, name: string, meta?: { amount?: number; discountType?: "amount" | "percent" }) {
    const cleanName = name.trim();
    if (!cleanName || !editingSale) return;

    if (kind === "program") {
      const exists = state.programs.some((item) => sameText(item.name, cleanName));
      const nextProgram: SalesProgram = {
        id: `program-${crypto.randomUUID()}`,
        name: cleanName,
        productType: editingSale.productType,
        active: true,
        createdAt: new Date().toISOString()
      };
      const next = { ...state, programs: exists ? state.programs : [nextProgram, ...state.programs] };
      setState(next);
      setCommercialState(next);
      updateDraft("productName", cleanName);
      persistCommercialOption({ kind: "program", name: cleanName, productType: editingSale.productType });
      return;
    }

    if (kind === "discount") {
      const amount = Math.max(Number(meta?.amount ?? 0), 0);
      const nextDiscount: AuthorizedDiscount = {
        id: `discount-${crypto.randomUUID()}`,
        label: cleanName,
        amount,
        discountType: meta?.discountType ?? "amount",
        active: true
      };
      const exists = state.discounts.some((item) => sameText(item.label, cleanName));
      const discounts = exists ? state.discounts.map((item) => (sameText(item.label, cleanName) ? { ...item, amount, discountType: nextDiscount.discountType } : item)) : [nextDiscount, ...state.discounts];
      const next = { ...state, discounts };
      setState(next);
      setCommercialState(next);
      updateDraft("discountAmount", nextDiscount.discountType === "percent" ? Math.round((editingSale.grossAmount * amount) / 100) : amount);
      persistDiscounts(discounts);
      return;
    }

    const field = kind === "lead" ? "leadSources" : "paymentMethods";
    const exists = state[field].some((item) => sameText(item.label, cleanName));
    const nextOption: CommercialOption = {
      id: `${kind}-${crypto.randomUUID()}`,
      label: cleanName,
      active: true,
      createdAt: new Date().toISOString()
    };
    const next = { ...state, [field]: exists ? state[field] : [nextOption, ...state[field]] };
    setState(next);
    setCommercialState(next);
    updateDraft(kind === "lead" ? "leadSource" : "paymentMethod", cleanName);
    persistCommercialOption({ kind: kind === "lead" ? "lead" : "payment", name: cleanName });
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

      <div className="sales-filter-panel">
        <div className="sales-filter-title">
          <p className="eyebrow">Filtros</p>
          <strong>{filteredSales.length} venta(s)</strong>
        </div>
        <label>
          Fecha desde
          <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          Fecha hasta
          <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </label>
        <label>
          Ejecutivo
          <select value={filters.executiveId} onChange={(event) => updateFilter("executiveId", event.target.value)}>
            <option value="">Todos</option>
            {state.executives.map((executive) => <option key={executive.id} value={executive.id}>{executive.fullName}</option>)}
          </select>
        </label>
        <label>
          Equipo
          <select value={filters.teamId} onChange={(event) => updateFilter("teamId", event.target.value)}>
            <option value="">Todos</option>
            {state.teams.filter((team) => team.active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label>
          Evento
          <input value={filters.event} onChange={(event) => updateFilter("event", event.target.value)} placeholder="Programa o producto" />
        </label>
        <label>
          Estado
          <select value={filters.validationStatus} onChange={(event) => updateFilter("validationStatus", event.target.value)}>
            <option value="">Todos</option>
            {statusOptions.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
        </label>
        <label>
          Monto min.
          <input type="number" min={0} value={filters.minAmount} onChange={(event) => updateFilter("minAmount", event.target.value)} />
        </label>
        <label>
          Monto max.
          <input type="number" min={0} value={filters.maxAmount} onChange={(event) => updateFilter("maxAmount", event.target.value)} />
        </label>
        <button className="ghost-button" type="button" onClick={clearFilters}>Limpiar filtros</button>
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
            {!visibleSales.length ? (
              <tr>
                <td colSpan={7} className="muted">{sales.length ? "No hay ventas con los filtros seleccionados." : "No hay ventas registradas para validar."}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {visibleCount < filteredSales.length ? (
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
        programs={state.programs}
        discounts={state.discounts}
        paymentMethods={state.paymentMethods}
        leadSources={state.leadSources}
        errors={draftErrors}
        onChange={updateDraft}
        onProgramSelect={applyCatalogProgramToDraft}
        onOptionUpdate={upsertEditOption}
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
  programs,
  discounts,
  paymentMethods,
  leadSources,
  errors,
  onChange,
  onProgramSelect,
  onOptionUpdate,
  onClose,
  onSave
}: {
  sale: Sale | null;
  originalSale: Sale | null;
  saving: boolean;
  executives: ReturnType<typeof getCommercialState>["executives"];
  teams: ReturnType<typeof getCommercialState>["teams"];
  programs: ReturnType<typeof getCommercialState>["programs"];
  discounts: ReturnType<typeof getCommercialState>["discounts"];
  paymentMethods: ReturnType<typeof getCommercialState>["paymentMethods"];
  leadSources: ReturnType<typeof getCommercialState>["leadSources"];
  errors: ValidationErrors;
  onChange: <K extends keyof Sale>(key: K, value: Sale[K]) => void;
  onProgramSelect: (programName: string) => void;
  onOptionUpdate: (kind: EditOptionKind, name: string, meta?: { amount?: number; discountType?: "amount" | "percent" }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [optionModal, setOptionModal] = useState<null | EditOptionKind>(null);
  const [optionDraft, setOptionDraft] = useState("");
  const [discountAmountDraft, setDiscountAmountDraft] = useState("");
  const [discountTypeDraft, setDiscountTypeDraft] = useState<"amount" | "percent">("amount");
  if (!sale) return null;
  const saveDisabled = saving || Object.keys(errors).length > 0;
  const activePrograms = programs.filter((item) => isProgramActiveForSales(item) && item.productType === sale.productType);
  const programOptions = uniqueStrings([sale.productName, ...activePrograms.map((item) => item.name)]);
  const paymentOptions = uniqueStrings([sale.paymentMethod, ...paymentMethods.filter((item) => item.active).map((item) => item.label)]);
  const leadOptions = uniqueStrings([sale.leadSource, ...leadSources.filter((item) => item.active).map((item) => item.label)]);
  const selectedDiscount = discounts.find((item) => {
    const computed = item.discountType === "percent" ? Math.round((sale.grossAmount * item.amount) / 100) : item.amount;
    return computed === sale.discountAmount;
  });

  function openOption(kind: EditOptionKind, currentValue = "") {
    if (!sale) return;
    setOptionModal(kind);
    setOptionDraft(currentValue);
    if (kind === "discount") {
      setDiscountAmountDraft(String(sale.discountAmount || ""));
      setDiscountTypeDraft("amount");
    }
  }

  function saveOption() {
    if (!optionModal) return;
    onOptionUpdate(
      optionModal,
      optionDraft,
      optionModal === "discount"
        ? { amount: Number(discountAmountDraft || 0), discountType: discountTypeDraft }
        : undefined
    );
    setOptionModal(null);
    setOptionDraft("");
    setDiscountAmountDraft("");
    setDiscountTypeDraft("amount");
  }

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
            <div className="field-inline option-inline">
              <select className={errors.productName ? "invalid-field" : ""} value={sale.productName} onChange={(event) => onProgramSelect(event.target.value)}>
                <option value="">Seleccionar programa</option>
                {programOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => openOption("program", sale.productName)} title="Agregar o editar programa"><Plus size={15} /></button>
            </div>
          </Field>
          <Field label="Cantidad">
            <input type="number" min={0} value={sale.quantity || ""} onChange={(event) => onChange("quantity", Number(event.target.value || 0))} />
          </Field>
          <Field label="Monto bruto" error={errors.grossAmount}>
            <input className={errors.grossAmount ? "invalid-field" : ""} type="number" min={0} value={sale.grossAmount || ""} onChange={(event) => onChange("grossAmount", Number(event.target.value || 0))} />
          </Field>
          <Field label="Descuento">
            <div className="field-inline option-inline">
              <select
                value={selectedDiscount?.id ?? "custom"}
                onChange={(event) => {
                  const discount = discounts.find((item) => item.id === event.target.value);
                  if (!discount) return;
                  const amount = discount.discountType === "percent" ? Math.round((sale.grossAmount * discount.amount) / 100) : discount.amount;
                  onChange("discountAmount", amount);
                }}
              >
                <option value="custom">Personalizado: {money(sale.discountAmount || 0)}</option>
                {discounts.filter((item) => item.active).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.discountType === "percent" ? `${item.amount}%` : money(item.amount)}
                  </option>
                ))}
              </select>
              <button className="icon-button" type="button" onClick={() => openOption("discount", selectedDiscount?.label ?? "Descuento personalizado")} title="Agregar o editar descuento"><Pencil size={15} /></button>
            </div>
          </Field>
          <div className="field sales-net-preview">
            <label>Monto neto</label>
            <strong>{money(sale.netAmount)}</strong>
          </div>
          <Field label="Medio de pago">
            <div className="field-inline option-inline">
              <select value={sale.paymentMethod} onChange={(event) => onChange("paymentMethod", event.target.value)}>
                {paymentOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => openOption("payment", sale.paymentMethod)} title="Agregar o editar medio de pago"><Plus size={15} /></button>
            </div>
          </Field>
          <Field label="Origen del lead">
            <div className="field-inline option-inline">
              <select value={sale.leadSource} onChange={(event) => onChange("leadSource", event.target.value)}>
                {leadOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => openOption("lead", sale.leadSource)} title="Agregar o editar origen del lead"><Plus size={15} /></button>
            </div>
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

        {optionModal ? (
          <div className="sales-nested-modal">
            <div className="sales-nested-panel">
              <p className="eyebrow">Opciones de venta</p>
              <h3>{optionModalTitle(optionModal)}</h3>
              <Field label="Nombre">
                <input autoFocus value={optionDraft} onChange={(event) => setOptionDraft(event.target.value)} />
              </Field>
              {optionModal === "discount" ? (
                <div className="sales-edit-grid single compact">
                  <Field label="Tipo de descuento">
                    <select value={discountTypeDraft} onChange={(event) => setDiscountTypeDraft(event.target.value as "amount" | "percent")}>
                      <option value="amount">Monto en soles</option>
                      <option value="percent">Porcentaje</option>
                    </select>
                  </Field>
                  <Field label={discountTypeDraft === "percent" ? "Porcentaje" : "Monto"}>
                    <input type="number" min={0} value={discountAmountDraft} onChange={(event) => setDiscountAmountDraft(event.target.value)} />
                  </Field>
                </div>
              ) : null}
              <div className="sales-modal-actions">
                <button className="ghost-button" type="button" onClick={() => setOptionModal(null)}>Cancelar</button>
                <button className="primary-button" type="button" onClick={saveOption}>Guardar y aplicar</button>
              </div>
            </div>
          </div>
        ) : null}
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

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function uniqueStrings(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function optionModalTitle(kind: EditOptionKind) {
  if (kind === "program") return "Agregar o editar programa / evento";
  if (kind === "discount") return "Agregar o editar descuento";
  if (kind === "payment") return "Agregar o editar medio de pago";
  return "Agregar o editar origen del lead";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isRetiredJuneRankingImport(sale: Sale & { sourceKey?: string }) {
  const marker = `${sale.sourceKey ?? ""} ${sale.productName ?? ""} ${sale.notes ?? ""}`.toLowerCase();
  return marker.includes("ranking-junio-2026-mtd") || marker.includes("carga historica acumulada junio 2026 desde ranking");
}

function isProgramActiveForSales(program: SalesProgram) {
  return program.active || program.status === "Activo para ventas";
}

function calculateProgramPrice(program: SalesProgram) {
  const amounts = [program.singlePaymentAmount, program.enrollmentAmount, program.monthlyAmount, program.certificateAmount, program.priceFrom]
    .map((amount) => Number(amount ?? 0))
    .filter((amount) => amount > 0);
  return amounts.length ? Math.min(...amounts) : 0;
}

function calculateProgramTotal(program: SalesProgram) {
  const enrollment = Number(program.enrollmentAmount ?? 0);
  const monthly = Number(program.monthlyAmount ?? 0);
  const count = Number(program.monthlyCount ?? 0);
  const certificate = Number(program.certificateAmount ?? 0);
  const single = Number(program.singlePaymentAmount ?? 0);
  return single || enrollment + monthly * count + certificate;
}

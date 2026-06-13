"use client";

import { Ban, Check, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, setCommercialState } from "@/lib/commercial/store";
import type { ProductType, Sale, SaleStatus } from "@/lib/commercial/types";

const productTypes: ProductType[] = ["Curso", "Curso Modular", "Diplomado"];
const statusOptions: SaleStatus[] = ["pendiente_validacion", "validada", "observada", "anulada"];

function statusLabel(status: SaleStatus) {
  const labels: Record<SaleStatus, string> = {
    registrada: "Registrada",
    pendiente_validacion: "Pendiente",
    validada: "Validada",
    observada: "Observada",
    anulada: "Anulada"
  };
  return labels[status] ?? status;
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
  const [annulSale, setAnnulSale] = useState<Sale | null>(null);
  const [annulReason, setAnnulReason] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  const sales = useMemo(
    () =>
      [...state.sales].sort((a, b) => {
        const statusPriority = a.validationStatus === "pendiente_validacion" ? -1 : b.validationStatus === "pendiente_validacion" ? 1 : 0;
        return statusPriority || b.saleDate.localeCompare(a.saleDate);
      }),
    [state.sales]
  );

  function localUpdate(updatedSale: Sale) {
    const current = getCommercialState();
    const next = {
      ...current,
      sales: current.sales.map((sale) => (sale.id === updatedSale.id ? updatedSale : sale))
    };
    setCommercialState(next);
    setState(next);
  }

  async function changeStatus(sale: Sale, validationStatus: SaleStatus) {
    setSaving(true);
    setStatus("");
    try {
      const netAmount = Math.max(sale.grossAmount - sale.discountAmount, 0);
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
    if (!editingSale.executiveId || !editingSale.teamId || !editingSale.productName.trim()) {
      setStatus("Completa ejecutivo, equipo y programa antes de guardar.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const netAmount = Math.max(editingSale.grossAmount - editingSale.discountAmount, 0);
      const updated = await persistSale({ ...editingSale, netAmount });
      localUpdate(updated);
      setEditingSale(null);
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
    if (!annulReason.trim()) {
      setStatus("Toda anulacion requiere motivo.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const updated = await persistSale({ ...annulSale, validationStatus: "anulada" }, "annul", annulReason);
      localUpdate(updated);
      setAnnulSale(null);
      setAnnulReason("");
      setStatus("Venta anulada sin borrado fisico.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo anular la venta.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  function updateDraft<K extends keyof Sale>(key: K, value: Sale[K]) {
    if (!editingSale) return;
    const next = { ...editingSale, [key]: value };
    if (key === "executiveId") {
      const executive = state.executives.find((item) => item.id === value);
      next.teamId = executive?.teamId ?? next.teamId;
    }
    next.netAmount = Math.max(Number(next.grossAmount ?? 0) - Number(next.discountAmount ?? 0), 0);
    setEditingSale(next);
  }

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Control</p>
          <h2>Validacion de ventas</h2>
          <p className="muted">Corrige ventas observadas, aprueba registros correctos o anula con motivo sin borrar trazabilidad.</p>
        </div>
        {status ? <span className="badge" style={{ maxWidth: 420 }}>{status}</span> : null}
      </div>

      <table className="table">
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
          {sales.map((sale) => {
            const executive = state.executives.find((item) => item.id === sale.executiveId);
            const team = state.teams.find((item) => item.id === sale.teamId);
            return (
              <tr key={sale.id}>
                <td>{sale.saleDate}</td>
                <td>{executive?.fullName ?? "Sin ejecutivo"}</td>
                <td>{team?.name ?? "Sin equipo"}</td>
                <td>{sale.productType} · {sale.productName}</td>
                <td>{money(sale.netAmount)}</td>
                <td><span className="badge">{statusLabel(sale.validationStatus)}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minWidth: 270 }}>
                    <button className="ghost-button" disabled={saving || sale.validationStatus === "anulada"} onClick={() => changeStatus(sale, "validada")} title="Aprobar venta"><Check size={15} /> Aprobar</button>
                    <button className="ghost-button" disabled={saving || sale.validationStatus === "anulada"} onClick={() => changeStatus(sale, "observada")} title="Observar venta"><X size={15} /> Observar</button>
                    <button className="primary-button" disabled={saving || sale.validationStatus === "anulada"} onClick={() => setEditingSale(sale)} title="Editar venta"><Pencil size={15} /> Editar</button>
                    <button className="danger-button" disabled={saving || sale.validationStatus === "anulada"} onClick={() => setAnnulSale(sale)} title="Anular venta"><Ban size={15} /> Anular</button>
                  </div>
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

      {editingSale ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(860px, 94vw)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p className="eyebrow">Correccion de venta</p>
                <h2>Editar venta</h2>
                <p className="muted">Puedes corregir la venta y dejarla observada, pendiente o validada.</p>
              </div>
              <button className="ghost-button" onClick={() => setEditingSale(null)}>Cerrar</button>
            </div>

            <div className="form-grid" style={{ marginTop: 18 }}>
              <div className="field"><label>Fecha</label><input type="date" value={editingSale.saleDate} onChange={(event) => updateDraft("saleDate", event.target.value)} /></div>
              <div className="field">
                <label>Ejecutivo</label>
                <select value={editingSale.executiveId} onChange={(event) => updateDraft("executiveId", event.target.value)}>
                  {state.executives.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Equipo</label>
                <select value={editingSale.teamId ?? ""} onChange={(event) => updateDraft("teamId", event.target.value)}>
                  <option value="">Sin equipo</option>
                  {state.teams.filter((team) => team.active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tipo de producto</label>
                <select value={editingSale.productType} onChange={(event) => updateDraft("productType", event.target.value as ProductType)}>
                  {productTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="field"><label>Programa / evento</label><input value={editingSale.productName} onChange={(event) => updateDraft("productName", event.target.value)} /></div>
              <div className="field"><label>Cantidad</label><input type="number" min={0} value={editingSale.quantity || ""} onChange={(event) => updateDraft("quantity", Number(event.target.value || 0))} /></div>
              <div className="field"><label>Monto bruto</label><input type="number" min={0} value={editingSale.grossAmount || ""} onChange={(event) => updateDraft("grossAmount", Number(event.target.value || 0))} /></div>
              <div className="field"><label>Descuento</label><input type="number" min={0} value={editingSale.discountAmount || ""} onChange={(event) => updateDraft("discountAmount", Number(event.target.value || 0))} /></div>
              <div className="field"><label>Monto neto</label><input value={money(editingSale.netAmount)} readOnly /></div>
              <div className="field"><label>Medio de pago</label><input value={editingSale.paymentMethod} onChange={(event) => updateDraft("paymentMethod", event.target.value)} /></div>
              <div className="field"><label>Origen del lead</label><input value={editingSale.leadSource} onChange={(event) => updateDraft("leadSource", event.target.value)} /></div>
              <div className="field">
                <label>Estado final</label>
                <select value={editingSale.validationStatus} onChange={(event) => updateDraft("validationStatus", event.target.value as SaleStatus)}>
                  {statusOptions.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Observacion interna</label>
                <textarea value={editingSale.notes ?? ""} onChange={(event) => updateDraft("notes", event.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" disabled={saving} onClick={() => setEditingSale(null)}>Cancelar</button>
              <button className="primary-button" disabled={saving} onClick={saveEditedSale}><Check size={16} /> Guardar correccion</button>
            </div>
          </div>
        </div>
      ) : null}

      {annulSale ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(560px, 94vw)" }}>
            <p className="eyebrow">Anulacion trazable</p>
            <h2>Anular venta</h2>
            <p className="muted">La venta no se borrara fisicamente. Quedara como anulada y registrada en auditoria.</p>
            <div className="field" style={{ marginTop: 16 }}>
              <label>Motivo de anulacion</label>
              <textarea autoFocus value={annulReason} onChange={(event) => setAnnulReason(event.target.value)} placeholder="Ej. duplicada, monto incorrecto, venta no sustentada" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" disabled={saving} onClick={() => { setAnnulSale(null); setAnnulReason(""); }}>Cancelar</button>
              <button className="danger-button" disabled={saving} onClick={confirmAnnulSale}><Ban size={16} /> Anular venta</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { getCommercialState, money, upsertSale } from "@/lib/commercial/store";
import type { ProductType, Sale } from "@/lib/commercial/types";

export function SalesNewView() {
  const state = getCommercialState();
  const first = state.executives[0];
  const [sale, setSale] = useState<Sale>({
    id: crypto.randomUUID(),
    saleDate: new Date().toISOString().slice(0, 10),
    executiveId: first?.id ?? "",
    teamId: first?.teamId,
    productType: "Curso",
    productName: "",
    quantity: 1,
    grossAmount: 0,
    discountAmount: 0,
    netAmount: 0,
    leadSource: "WhatsApp",
    paymentMethod: "Transferencia",
    validationStatus: "pendiente_validacion"
  });

  function update<K extends keyof Sale>(key: K, value: Sale[K]) {
    const next = { ...sale, [key]: value };
    if (key === "executiveId") {
      const executive = state.executives.find((item) => item.id === value);
      next.teamId = executive?.teamId;
    }
    next.netAmount = Math.max(next.grossAmount - next.discountAmount, 0);
    setSale(next);
  }

  return (
    <section className="card">
      <p className="eyebrow">Registro rapido</p>
      <h2>Registrar venta</h2>
      <div className="form-grid">
        <div className="field"><label>Fecha de venta</label><input type="date" value={sale.saleDate} onChange={(event) => update("saleDate", event.target.value)} /></div>
        <div className="field"><label>Ejecutivo</label><select value={sale.executiveId} onChange={(event) => update("executiveId", event.target.value)}>{state.executives.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></div>
        <div className="field"><label>Equipo</label><input value={state.teams.find((item) => item.id === sale.teamId)?.name ?? "Sin equipo"} readOnly /></div>
        <div className="field"><label>Tipo de producto</label><select value={sale.productType} onChange={(event) => update("productType", event.target.value as ProductType)}><option>Curso</option><option>Curso Modular</option><option>Diplomado</option></select></div>
        <div className="field"><label>Programa / evento</label><input value={sale.productName} onChange={(event) => update("productName", event.target.value)} /></div>
        <div className="field"><label>Cantidad</label><input type="number" value={sale.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></div>
        <div className="field"><label>Monto bruto</label><input type="number" value={sale.grossAmount} onChange={(event) => update("grossAmount", Number(event.target.value))} /></div>
        <div className="field"><label>Descuento aplicado</label><input type="number" value={sale.discountAmount} onChange={(event) => update("discountAmount", Number(event.target.value))} /></div>
        <div className="field"><label>Monto neto</label><input value={money(sale.netAmount)} readOnly /></div>
        <div className="field"><label>Medio de pago</label><select value={sale.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}><option>Transferencia</option><option>Yape</option><option>Tarjeta</option><option>Efectivo</option></select></div>
        <div className="field"><label>Origen del lead</label><select value={sale.leadSource} onChange={(event) => update("leadSource", event.target.value)}><option>Meta Ads</option><option>WhatsApp</option><option>Base</option><option>Referido</option><option>Organico</option><option>Otro</option></select></div>
        <div className="field"><label>Observacion</label><textarea value={sale.notes ?? ""} onChange={(event) => update("notes", event.target.value)} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="primary-button" onClick={() => upsertSale({ ...sale, id: crypto.randomUUID() })}><Save size={17} /> Guardar venta</button>
      </div>
    </section>
  );
}

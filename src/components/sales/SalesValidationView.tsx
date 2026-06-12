"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, upsertSale } from "@/lib/commercial/store";

export function SalesValidationView() {
  const [state, setState] = useState(getCommercialState);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  return (
    <section className="card">
      <p className="eyebrow">Control</p>
      <h2>Validacion de ventas</h2>
      <table className="table">
        <thead>
          <tr><th>Fecha</th><th>Ejecutivo</th><th>Producto</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {state.sales.map((sale) => (
            <tr key={sale.id}>
              <td>{sale.saleDate}</td>
              <td>{state.executives.find((item) => item.id === sale.executiveId)?.fullName}</td>
              <td>{sale.productType} · {sale.productName}</td>
              <td>{money(sale.netAmount)}</td>
              <td><span className="badge">{sale.validationStatus}</span></td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="icon-button" onClick={() => upsertSale({ ...sale, validationStatus: "validada" })} title="Validar"><Check size={16} /></button>
                  <button className="icon-button" onClick={() => upsertSale({ ...sale, validationStatus: "observada" })} title="Observar"><X size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

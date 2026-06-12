"use client";

import { useEffect, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, money, setCommercialState } from "@/lib/commercial/store";

export default function GoalsPage() {
  const [state, setState] = useState(getCommercialState);
  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  return (
    <section className="card">
      <p className="eyebrow">Metas</p>
      <h2>Configuracion de metas comerciales</h2>
      <div className="form-grid">
        <div className="field">
          <label>Meta mensual empresa</label>
          <input type="number" value={state.companyGoal} onChange={(event) => { const next = { ...state, companyGoal: Number(event.target.value) }; setState(next); setCommercialState(next); }} />
        </div>
        <div className="field"><label>Meta actual</label><input value={money(state.companyGoal)} readOnly /></div>
      </div>
    </section>
  );
}

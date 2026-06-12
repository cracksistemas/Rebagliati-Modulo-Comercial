"use client";

import { Bell, Plus, Save, UserRoundCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCommercialState, money, pushNotification, setCommercialState, upsertSale } from "@/lib/commercial/store";
import type { CommercialOption, ProductType, Sale, SalesProgram } from "@/lib/commercial/types";

type SessionProfile = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
};

export function SalesNewView() {
  const [state, setState] = useState(getCommercialState);
  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(null);
  const [allowOtherExecutive, setAllowOtherExecutive] = useState(false);
  const [programDraft, setProgramDraft] = useState("");
  const [optionModal, setOptionModal] = useState<null | "program" | "lead" | "payment">(null);
  const [optionDraft, setOptionDraft] = useState("");
  const [selectedDiscountId, setSelectedDiscountId] = useState(state.discounts.find((item) => item.active)?.id ?? "");
  const [grossInput, setGrossInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [specialDiscountInput, setSpecialDiscountInput] = useState("");
  const [specialReason, setSpecialReason] = useState("");
  const [status, setStatus] = useState("");
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
  const activePrograms = useMemo(
    () => state.programs.filter((program) => program.active && program.productType === sale.productType),
    [sale.productType, state.programs]
  );
  const activeDiscounts = useMemo(() => state.discounts.filter((discount) => discount.active), [state.discounts]);
  const selectedDiscount = activeDiscounts.find((discount) => discount.id === selectedDiscountId);

  useEffect(() => {
    let alive = true;
    async function loadSessionProfile() {
      try {
        const response = await fetch("/api/session/me", { cache: "no-store" });
        const payload = (await response.json()) as { ok?: boolean; data?: SessionProfile };
        if (!alive || !response.ok || !payload.ok || !payload.data) return;
        setSessionProfile(payload.data);
        const currentExecutive = state.executives.find(
          (executive) => executive.fullName.trim().toLowerCase() === String(payload.data?.fullName ?? "").trim().toLowerCase()
        );
        if (currentExecutive) {
          setSale((current) => ({ ...current, executiveId: currentExecutive.id, teamId: currentExecutive.teamId }));
        }
      } catch {
        setSessionProfile(null);
      }
    }
    loadSessionProfile();
    return () => {
      alive = false;
    };
  }, [state.executives]);

  useEffect(() => {
    let alive = true;
    async function loadCommercialOptions() {
      try {
        const response = await fetch("/api/commercial/options", { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: {
            programs?: SalesProgram[];
            discounts?: typeof state.discounts;
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
        // Conserva opciones locales si Supabase todavia no tiene tablas de configuracion.
      }
    }
    loadCommercialOptions();
    return () => {
      alive = false;
    };
  }, []);

  function update<K extends keyof Sale>(key: K, value: Sale[K]) {
    const next = { ...sale, [key]: value };
    if (key === "executiveId") {
      const executive = state.executives.find((item) => item.id === value);
      next.teamId = executive?.teamId;
    }
    if (key === "teamId") {
      next.teamId = String(value);
    }
    if (key === "productType") {
      next.productName = "";
    }
    next.netAmount = Math.max(next.grossAmount - next.discountAmount, 0);
    setSale(next);
  }

  function calculateDiscountAmount(discount = selectedDiscount, grossAmount = sale.grossAmount) {
    if (!discount) return 0;
    if (discount.requiresApproval) return Math.max(Number(specialDiscountInput || 0), 0);
    return discount.discountType === "percent" ? Math.round((grossAmount * discount.amount) / 100) : discount.amount;
  }

  function updateGross(value: string) {
    setGrossInput(value);
    const grossAmount = value === "" ? 0 : Math.max(Number(value), 0);
    const discountAmount = calculateDiscountAmount(selectedDiscount, grossAmount);
    setSale((current) => ({ ...current, grossAmount, discountAmount, netAmount: Math.max(grossAmount - discountAmount, 0) }));
  }

  function updateQuantity(value: string) {
    setQuantityInput(value);
    update("quantity", value === "" ? 0 : Math.max(Number(value), 0));
  }

  function addOption(kind: "program" | "lead" | "payment") {
    const name = (optionDraft || (kind === "program" ? programDraft || sale.productName : "")).trim();
    if (!name) {
      setStatus("Escribe un nombre antes de guardar.");
      return;
    }

    if (kind === "program") {
      const exists = state.programs.some((program) => program.name.trim().toLowerCase() === name.toLowerCase());
      if (exists) {
        update("productName", name);
        setProgramDraft("");
        setOptionModal(null);
        setOptionDraft("");
        setStatus("Programa encontrado en historial.");
        return;
      }
      const nextProgram: SalesProgram = {
        id: `program-${crypto.randomUUID()}`,
        name,
        productType: sale.productType,
        active: true,
        createdAt: new Date().toISOString()
      };
      const next = {
        ...state,
        programs: [nextProgram, ...state.programs],
        audit: [
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toLocaleString("es-PE"),
            actor: sessionProfile?.fullName ?? "Usuario comercial",
            action: "Agrego programa",
            module: "Ventas",
            target: name,
            result: "Exitoso" as const,
            criticality: "Baja" as const
          },
          ...state.audit
        ]
      };
      setState(next);
      setCommercialState(next);
      update("productName", name);
      setProgramDraft("");
      setOptionModal(null);
      setOptionDraft("");
      setStatus("Programa agregado al historial.");

      fetch("/api/commercial/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "program", name, productType: sale.productType })
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (!payload?.ok || !payload.data) return;
          setState((current) => {
            const synced = {
              ...current,
              programs: payload.data.programs ?? current.programs,
              discounts: payload.data.discounts ?? current.discounts,
              leadSources: payload.data.leadSources ?? current.leadSources,
              paymentMethods: payload.data.paymentMethods ?? current.paymentMethods
            };
            setCommercialState(synced);
            return synced;
          });
        })
        .catch(() => undefined);
      return;
    }

    const field = kind === "lead" ? "leadSources" : "paymentMethods";
    const exists = state[field].some((option) => option.label.trim().toLowerCase() === name.toLowerCase());
    const nextOption: CommercialOption = { id: `${kind}-${crypto.randomUUID()}`, label: name, active: true, createdAt: new Date().toISOString() };
    const next = {
      ...state,
      [field]: exists ? state[field] : [nextOption, ...state[field]],
      audit: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("es-PE"),
          actor: sessionProfile?.fullName ?? "Usuario comercial",
          action: kind === "lead" ? "Agrego origen de lead" : "Agrego medio de pago",
          module: "Ventas",
          target: name,
          result: "Exitoso" as const,
          criticality: "Baja" as const
        },
        ...state.audit
      ]
    };
    setState(next);
    setCommercialState(next);
    update(kind === "lead" ? "leadSource" : "paymentMethod", name);
    setOptionModal(null);
    setOptionDraft("");
    setStatus(kind === "lead" ? "Origen agregado." : "Medio de pago agregado.");

    fetch("/api/commercial/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.ok || !payload.data) return;
        setState((current) => {
          const synced = {
            ...current,
            programs: payload.data.programs ?? current.programs,
            discounts: payload.data.discounts ?? current.discounts,
            leadSources: payload.data.leadSources ?? current.leadSources,
            paymentMethods: payload.data.paymentMethods ?? current.paymentMethods
          };
          setCommercialState(synced);
          return synced;
        });
      })
      .catch(() => undefined);
  }

  function applyDiscount(discountId: string) {
    setSelectedDiscountId(discountId);
    const discount = state.discounts.find((item) => item.id === discountId);
    if (!discount) return;
    if (discount.requiresApproval) {
      update("discountAmount", Number(specialDiscountInput || 0));
      setStatus("Descuento especial pendiente de autorizacion del encargado o jefe.");
      return;
    }
    update("discountAmount", calculateDiscountAmount(discount));
  }

  function requestSpecialDiscount() {
    const amount = Math.max(Number(specialDiscountInput || 0), 0);
    update("discountAmount", amount);
    const notificationId = `notification-${crypto.randomUUID()}`;
    const next = {
      ...state,
      notifications: [
        {
          id: notificationId,
          title: "Autorizacion de descuento",
          message: `${sessionProfile?.fullName ?? "Usuario comercial"} solicita ${money(amount)} para ${sale.productName || "venta sin programa"}. Motivo: ${specialReason || "Sin motivo registrado"}.`,
          audience: "Jefatura" as const,
          type: "Autorizacion descuento" as const,
          active: true,
          createdAt: new Date().toLocaleString("es-PE"),
          createdBy: sessionProfile?.fullName ?? "Usuario comercial",
          readBy: [],
          requestStatus: "Pendiente" as const
        },
        ...state.notifications
      ],
      audit: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("es-PE"),
          actor: sessionProfile?.fullName ?? "Usuario comercial",
          action: "Solicito descuento especial",
          module: "Ventas",
          target: `${money(amount)} - ${sale.productName || "Sin programa"}`,
          result: "Observado" as const,
          criticality: "Alta" as const,
          after: specialReason
        },
        ...state.audit
      ]
    };
    setState(next);
    setCommercialState(next);
    pushNotification(next.notifications[0]);
    setStatus("Solicitud enviada al encargado o jefe para autorizacion.");
  }

  function saveSale() {
    if (!sale.executiveId || !sale.teamId || !sale.productName.trim()) {
      setStatus("Completa ejecutivo, equipo y programa antes de registrar.");
      return;
    }
    upsertSale({ ...sale, id: crypto.randomUUID(), validationStatus: "pendiente_validacion" });
    setStatus("Venta registrada pendiente de validacion.");
    setSale((current) => ({
      ...current,
      id: crypto.randomUUID(),
      quantity: 1,
      grossAmount: 0,
      discountAmount: 0,
      netAmount: 0,
      notes: ""
    }));
    setSelectedDiscountId(state.discounts.find((item) => item.active)?.id ?? "");
    setGrossInput("");
    setQuantityInput("1");
    setSpecialDiscountInput("");
    setSpecialReason("");
  }

  return (
    <section className="card">
      <p className="eyebrow">Registro rapido</p>
      <h2>Registrar venta</h2>
      {status ? <p className="badge" style={{ marginTop: 10 }}>{status}</p> : null}
      <div className="form-grid">
        <div className="field"><label>Fecha de venta</label><input type="date" value={sale.saleDate} onChange={(event) => update("saleDate", event.target.value)} /></div>
        <div className="field">
          <label>Ejecutivo</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={sale.executiveId} disabled={!allowOtherExecutive} onChange={(event) => update("executiveId", event.target.value)}>
              {state.executives.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
            </select>
            <button className="ghost-button" type="button" onClick={() => setAllowOtherExecutive((value) => !value)} title="Registrar para otro ejecutivo">
              <UserRoundCog size={16} />
            </button>
          </div>
        </div>
        <div className="field">
          <label>Equipo</label>
          <select value={sale.teamId ?? ""} onChange={(event) => update("teamId", event.target.value)}>
            <option value="">Sin equipo</option>
            {state.teams.filter((team) => team.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Tipo de producto</label><select value={sale.productType} onChange={(event) => update("productType", event.target.value as ProductType)}><option>Curso</option><option>Curso Modular</option><option>Diplomado</option></select></div>
        <div className="field">
          <label>Programa / evento</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input list="sales-program-history" value={sale.productName} onChange={(event) => { update("productName", event.target.value); setProgramDraft(event.target.value); }} placeholder="Buscar o escribir programa" />
            <button className="ghost-button" type="button" onClick={() => { setOptionModal("program"); setOptionDraft(sale.productName); }} title="Agregar programa al historial"><Plus size={16} /></button>
          </div>
          <datalist id="sales-program-history">
            {activePrograms.map((program) => <option key={program.id} value={program.name} />)}
          </datalist>
        </div>
        <div className="field"><label>Cantidad</label><input type="number" value={quantityInput} onChange={(event) => updateQuantity(event.target.value)} /></div>
        <div className="field"><label>Monto bruto</label><input type="number" inputMode="decimal" value={grossInput} placeholder="0" onChange={(event) => updateGross(event.target.value)} /></div>
        <div className="field">
          <label>Descuento aplicado</label>
          <select value={selectedDiscountId} onChange={(event) => applyDiscount(event.target.value)}>
            {activeDiscounts.map((discount) => <option key={discount.id} value={discount.id}>{discount.label}</option>)}
          </select>
        </div>
        {selectedDiscount?.requiresApproval ? (
          <>
            <div className="field"><label>Monto especial</label><input type="number" min={0} value={specialDiscountInput} placeholder="0" onChange={(event) => setSpecialDiscountInput(event.target.value)} /></div>
            <div className="field"><label>Motivo para autorizacion</label><input value={specialReason} onChange={(event) => setSpecialReason(event.target.value)} placeholder="Ej. cierre por convenio o campaña" /></div>
            <div className="field"><label>Solicitud</label><button className="ghost-button" type="button" onClick={requestSpecialDiscount}><Bell size={16} /> Notificar autorizacion</button></div>
          </>
        ) : null}
        <div className="field"><label>Monto neto</label><input value={money(sale.netAmount)} readOnly /></div>
        <div className="field">
          <label>Medio de pago</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={sale.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
              {state.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id}>{item.label}</option>)}
            </select>
            <button className="ghost-button" type="button" onClick={() => { setOptionModal("payment"); setOptionDraft(""); }} title="Agregar medio de pago"><Plus size={16} /></button>
          </div>
        </div>
        <div className="field">
          <label>Origen del lead</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={sale.leadSource} onChange={(event) => update("leadSource", event.target.value)}>
              {state.leadSources.filter((item) => item.active).map((item) => <option key={item.id}>{item.label}</option>)}
            </select>
            <button className="ghost-button" type="button" onClick={() => { setOptionModal("lead"); setOptionDraft(""); }} title="Agregar origen del lead"><Plus size={16} /></button>
          </div>
        </div>
        <div className="field"><label>Observacion</label><textarea value={sale.notes ?? ""} onChange={(event) => update("notes", event.target.value)} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="primary-button" onClick={saveSale}><Save size={17} /> Guardar venta</button>
      </div>
      {optionModal ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(520px, 94vw)" }}>
            <p className="eyebrow">Nuevo registro</p>
            <h2>{optionModal === "program" ? "Agregar programa / evento" : optionModal === "lead" ? "Agregar origen del lead" : "Agregar medio de pago"}</h2>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Nombre</label>
              <input autoFocus value={optionDraft} onChange={(event) => setOptionDraft(event.target.value)} placeholder="Escribe el nombre" />
            </div>
            {optionModal === "program" ? (
              <p className="muted" style={{ marginTop: 10 }}>Se guardara como historial para evitar duplicados en futuras ventas.</p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setOptionModal(null)}>Cancelar</button>
              <button className="primary-button" onClick={() => addOption(optionModal)}>Guardar</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

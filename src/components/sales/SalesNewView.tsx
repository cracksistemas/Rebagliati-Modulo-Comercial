"use client";

import { AlertTriangle, Bell, Check, FileText, Plus, Save, UserRoundCog, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCommercialState, money, pushNotification, setCommercialState, upsertSale } from "@/lib/commercial/store";
import type { CommercialOption, ProductType, Sale, SaleAttachmentDraft, SalesProgram } from "@/lib/commercial/types";

type SessionProfile = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type OptionModalKind = "program" | "lead" | "payment" | "product_type";

const productTypeDefaults: ProductType[] = ["Curso", "Curso Modular", "Diplomado", "Taller", "Seminario", "Certifícate", "Asincrónico", "Otro"];
const modalityOptions = ["Virtual", "Asincrónico", "Presencial", "Semipresencial", "Híbrido"];
const billingTypes = ["Pago único", "Matrícula + mensualidades", "Solo matrícula", "Solo mensualidad", "Pago de cuota", "Pago adelantado", "Pago parcial", "Pago de diploma certificado", "Pago de certificado físico", "Regularización", "Otro"];
const paymentConcepts = ["Matrícula", "Mensualidad", "Cuota", "Pago total", "Adelanto", "Separación de vacante", "Diploma certificado", "Certificado físico", "Constancia", "Material", "Regularización", "Otro"];
const paymentPlans = ["Pago completo", "Matrícula + mensualidad", "Cuotas mensuales", "Pago parcial", "Pago personalizado"];
const attentionChannels = ["WhatsApp", "Llamada", "Kommo", "Messenger", "Instagram DM", "Presencial", "Correo", "Otro"];
const evidenceTypes = ["Comprobante de pago", "Captura de conversación WhatsApp", "Captura de Kommo", "Ficha del programa enviada", "Correo de derivación", "PDF de sustento", "Audio", "Otro"];

function createEmptySale(executiveId = "", teamId = ""): Sale {
  return {
    id: crypto.randomUUID(),
    saleDate: new Date().toISOString().slice(0, 10),
    executiveId,
    teamId,
    productType: "Curso",
    productName: "",
    modality: "Virtual",
    commercialStatus: "Pendiente de validación",
    attentionChannel: "WhatsApp",
    quantity: 1,
    grossAmount: 0,
    discountAmount: 0,
    netAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    billingType: "Pago único",
    paymentPlanType: "Pago completo",
    paymentConcept: "Pago total",
    leadSource: "WhatsApp",
    paymentMethod: "Yape",
    paymentStatus: "Pendiente de validación",
    validationStatus: "pendiente_validacion",
    participant: {
      fullName: "",
      documentType: "DNI",
      documentNumber: "",
      phone: "",
      email: "",
      country: "Perú",
      department: "",
      province: "",
      district: ""
    },
    attachments: [],
    modalityDetails: {}
  };
}

export function SalesNewView() {
  const [state, setState] = useState(getCommercialState);
  const first = state.executives.find((item) => item.status === "Activo") ?? state.executives[0];
  const [sale, setSale] = useState<Sale>(() => createEmptySale(first?.id ?? "", first?.teamId ?? ""));
  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(null);
  const [allowOtherExecutive, setAllowOtherExecutive] = useState(false);
  const [optionModal, setOptionModal] = useState<null | OptionModalKind>(null);
  const [optionDraft, setOptionDraft] = useState("");
  const [evidenceDraft, setEvidenceDraft] = useState({ type: evidenceTypes[0], description: "" });
  const [selectedDiscountId, setSelectedDiscountId] = useState(state.discounts.find((item) => item.active)?.id ?? "");
  const [specialDiscountInput, setSpecialDiscountInput] = useState("");
  const [specialReason, setSpecialReason] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const executives = useMemo(() => state.executives.filter((item) => item.status === "Activo"), [state.executives]);
  const productTypes = useMemo(() => Array.from(new Set([...productTypeDefaults, ...state.programs.map((program) => program.productType)])), [state.programs]);
  const activePrograms = useMemo(
    () => state.programs.filter((program) => isProgramActiveForSales(program) && (!sale.productType || program.productType === sale.productType)),
    [sale.productType, state.programs]
  );
  const activeDiscounts = useMemo(() => state.discounts.filter((discount) => discount.active), [state.discounts]);
  const selectedDiscount = activeDiscounts.find((discount) => discount.id === selectedDiscountId);
  const selectedProgram = state.programs.find((program) => program.id === sale.productId);
  const currentExecutive = executives.find((item) => item.id === sale.executiveId);
  const currentTeam = state.teams.find((team) => team.id === sale.teamId);
  const duplicateParticipant = useMemo(() => findDuplicateParticipant(state.sales, sale), [state.sales, sale]);

  useEffect(() => {
    let alive = true;
    async function loadSessionProfile() {
      try {
        const response = await fetch("/api/session/me", { cache: "no-store" });
        const payload = (await response.json()) as { ok?: boolean; data?: SessionProfile };
        if (!alive || !response.ok || !payload.ok || !payload.data) return;
        setSessionProfile(payload.data);
        const current = state.executives.find((executive) => sameText(executive.fullName, payload.data?.fullName ?? ""));
        if (current) setSale((draft) => ({ ...draft, executiveId: current.id, teamId: current.teamId }));
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
        undefined;
      }
    }
    loadCommercialOptions();
    return () => {
      alive = false;
    };
  }, []);

  function patchSale(patch: Partial<Sale>) {
    setSale((current) => recalculateSale({ ...current, ...patch }));
  }

  function update<K extends keyof Sale>(key: K, value: Sale[K]) {
    const patch: Partial<Sale> = { [key]: value } as Partial<Sale>;
    if (key === "executiveId") {
      const executive = state.executives.find((item) => item.id === value);
      patch.teamId = executive?.teamId ?? "";
    }
    if (key === "productType") patch.productName = "";
    patchSale(patch);
  }

  function selectCatalogProgram(programId: string) {
    const program = state.programs.find((item) => item.id === programId);
    if (!program) {
      patchSale({ productName: "" });
      return;
    }
    const price = calculateProgramPrice(program);
    patchSale({
      productId: program.id,
      productEditionId: program.id,
      productType: program.productType,
      productName: program.name,
      programCode: program.code,
      modality: program.modality ?? sale.modality,
      startDate: program.startDate,
      endDate: program.endDate,
      duration: program.durationValue ? `${program.durationValue} ${program.durationUnit ?? ""}`.trim() : sale.duration,
      schedule: program.scheduleSummary,
      certification: program.certificationType,
      certifyingInstitution: program.certifyingInstitution,
      grossAmount: price || sale.grossAmount,
      paidAmount: price && !sale.paidAmount ? price : sale.paidAmount,
      officialAmount: price || sale.officialAmount,
      soldAmount: price || sale.soldAmount,
      paymentPlan: {
        ...sale.paymentPlan,
        enrollmentAmount: program.enrollmentAmount,
        monthlyAmount: program.monthlyAmount,
        monthlyCount: program.monthlyCount,
        certificateAmount: program.certificateAmount,
        totalProgramAmount: calculateProgramTotal(program) || price
      },
      modalityDetails: {
        ...sale.modalityDetails,
        platform: program.campusUrl ?? sale.modalityDetails?.platform,
        accessMode: program.accessConfig?.admissionMode,
        accessReleaseRule: program.accessConfig?.releaseRule,
        accessDurationDays: program.accessConfig?.accessDurationDays,
        credentialDelivery: program.accessConfig?.credentialDelivery,
        welcomeChannel: program.accessConfig?.welcomeChannel,
        moduleCount: program.academicConfig?.moduleCount,
        sessionCount: program.academicConfig?.sessionCount,
        evaluationRequired: program.academicConfig?.evaluationRequired
      },
      followups: buildProgramFollowups(program),
      notes: [
        sale.notes,
        program.formUrl ? `Formulario del programa: ${program.formUrl}` : "",
        program.accessConfig?.releaseRule ? `Acceso al aula: ${program.accessConfig.releaseRule}.` : ""
      ].filter(Boolean).join("\n")
    });
  }

  function updateParticipant(key: string, value: string) {
    patchSale({ participant: { ...sale.participant, [key]: value } });
  }

  function updatePlan(key: string, value: string | number) {
    patchSale({ paymentPlan: { ...sale.paymentPlan, [key]: value } });
  }

  function updateModalityDetail(key: string, value: string | boolean) {
    patchSale({ modalityDetails: { ...sale.modalityDetails, [key]: value } });
  }

  function calculateDiscountAmount(discount = selectedDiscount, grossAmount = sale.grossAmount) {
    if (!discount) return 0;
    if (discount.requiresApproval) return Math.max(Number(specialDiscountInput || 0), 0);
    return discount.discountType === "percent" ? Math.round((grossAmount * discount.amount) / 100) : discount.amount;
  }

  function applyDiscount(discountId: string) {
    setSelectedDiscountId(discountId);
    const discount = state.discounts.find((item) => item.id === discountId);
    if (!discount) return;
    patchSale({ discountAmount: calculateDiscountAmount(discount) });
    if (discount.requiresApproval) setStatus("Descuento especial pendiente de autorización del encargado o jefe.");
  }

  function addOption(kind: OptionModalKind) {
    const name = optionDraft.trim();
    if (!name) {
      setStatus("Escribe un nombre antes de guardar.");
      return;
    }

    if (kind === "product_type") {
      patchSale({ productType: name });
      setOptionModal(null);
      setOptionDraft("");
      setStatus("Tipo de producto disponible para esta venta.");
      return;
    }

    if (kind === "program") {
      const notification = {
        id: `notification-${crypto.randomUUID()}`,
        title: "Solicitud de producto / evento",
        message: `${sessionProfile?.fullName ?? "Usuario comercial"} solicita crear o activar: ${name}. Tipo sugerido: ${sale.productType}.`,
        audience: "Jefatura" as const,
        type: "Comunicado" as const,
        active: true,
        createdAt: new Date().toLocaleString("es-PE"),
        createdBy: sessionProfile?.fullName ?? "Usuario comercial",
        readBy: []
      };
      const next = { ...state, notifications: [notification, ...state.notifications] };
      syncState(next);
      pushNotification(notification);
      setStatus("Solicitud enviada. Ventas solo puede usar productos activos del catálogo.");
    } else {
      const field = kind === "lead" ? "leadSources" : "paymentMethods";
      const nextOption: CommercialOption = { id: `${kind}-${crypto.randomUUID()}`, label: name, active: true, createdAt: new Date().toISOString() };
      const exists = state[field].some((option) => sameText(option.label, name));
      syncState({ ...state, [field]: exists ? state[field] : [nextOption, ...state[field]] });
      update(kind === "lead" ? "leadSource" : "paymentMethod", name);
      persistOption({ kind, name });
      setStatus(kind === "lead" ? "Origen agregado." : "Medio de pago agregado.");
    }
    setOptionModal(null);
    setOptionDraft("");
  }

  function syncState(next: typeof state) {
    setState(next);
    setCommercialState(next);
  }

  function persistOption(payload: { kind: "program" | "lead" | "payment"; name: string; productType?: ProductType }) {
    fetch("/api/commercial/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((responsePayload) => {
        if (!responsePayload?.ok || !responsePayload.data) return;
        setState((current) => {
          const synced = {
            ...current,
            programs: responsePayload.data.programs ?? current.programs,
            discounts: responsePayload.data.discounts ?? current.discounts,
            leadSources: responsePayload.data.leadSources ?? current.leadSources,
            paymentMethods: responsePayload.data.paymentMethods ?? current.paymentMethods
          };
          setCommercialState(synced);
          return synced;
        });
      })
      .catch(() => undefined);
  }

  function addEvidence(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: SaleAttachmentDraft = {
        id: crypto.randomUUID(),
        attachmentType: evidenceDraft.type,
        fileName: file.name,
        description: evidenceDraft.description,
        dataUrl: String(reader.result)
      };
      patchSale({ attachments: [...(sale.attachments ?? []), attachment] });
      setEvidenceDraft({ type: evidenceTypes[0], description: "" });
    };
    reader.readAsDataURL(file);
  }

  function removeEvidence(id: string) {
    patchSale({ attachments: sale.attachments?.filter((item) => item.id !== id) ?? [] });
  }

  function requestSpecialDiscount() {
    const amount = Math.max(Number(specialDiscountInput || 0), 0);
    patchSale({ discountAmount: amount });
    const notification = {
      id: `notification-${crypto.randomUUID()}`,
      title: "Autorización de descuento",
      message: `${sessionProfile?.fullName ?? "Usuario comercial"} solicita ${money(amount)} para ${sale.productName || "venta sin programa"}. Motivo: ${specialReason || "Sin motivo registrado"}.`,
      audience: "Jefatura" as const,
      type: "Autorizacion descuento" as const,
      active: true,
      createdAt: new Date().toLocaleString("es-PE"),
      createdBy: sessionProfile?.fullName ?? "Usuario comercial",
      readBy: [],
      requestStatus: "Pendiente" as const
    };
    const next = { ...state, notifications: [notification, ...state.notifications] };
    syncState(next);
    pushNotification(notification);
    setStatus("Solicitud enviada al encargado o jefe para autorización.");
  }

  function validateSale() {
    const errors: string[] = [];
    if (!sale.saleDate) errors.push("Fecha de venta");
    if (!sale.executiveId) errors.push("Ejecutivo");
    if (!sale.teamId) errors.push("Equipo");
    if (!sale.participant?.fullName?.trim()) errors.push("Nombre del participante");
    if (!sale.participant?.documentNumber?.trim()) errors.push("Documento del participante");
    if (sale.participant?.documentType === "DNI" && (sale.participant.documentNumber ?? "").replace(/\D/g, "").length < 8) errors.push("DNI válido");
    if (!sale.participant?.phone?.trim() || sale.participant.phone.replace(/\D/g, "").length < 9) errors.push("Celular válido");
    if (sale.participant?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sale.participant.email)) errors.push("Correo válido");
    if (!sale.productName.trim()) errors.push("Programa");
    if (!sale.modality) errors.push("Modalidad");
    if (!sale.billingType) errors.push("Tipo de cobro");
    if (!sale.paymentConcept) errors.push("Concepto pagado");
    if (Number(sale.paidAmount ?? 0) <= 0) errors.push("Monto pagado");
    if (!sale.paymentMethod) errors.push("Medio de pago");
    if (["Yape", "Plin", "Transferencia", "Depósito"].some((method) => sameText(method, sale.paymentMethod)) && !sale.operationNumber?.trim()) errors.push("Número de operación");
    if (sale.modality === "Asincrónico" && sale.modalityDetails?.materialWillBeSent === undefined) errors.push("Confirmación de material asincrónico");
    if (sale.productType === "Diplomado" && Number(sale.paymentPlan?.monthlyAmount ?? 0) <= 0) errors.push("Mensualidad de diplomado");
    return errors;
  }

  function openSummary() {
    const errors = validateSale();
    if (errors.length) {
      setStatus(`Completa: ${errors.slice(0, 5).join(", ")}${errors.length > 5 ? "..." : ""}`);
      return;
    }
    setSummaryOpen(true);
  }

  async function saveSale() {
    const errors = validateSale();
    if (errors.length) {
      setStatus(`Completa: ${errors.slice(0, 5).join(", ")}${errors.length > 5 ? "..." : ""}`);
      return;
    }
    setSaving(true);
    const saleToSave = recalculateSale({ ...sale, id: crypto.randomUUID(), validationStatus: "pendiente_validacion", paymentStatus: "Pendiente de validación" });
    upsertSale(saleToSave);
    try {
      const response = await fetch("/api/commercial/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleToSave)
      });
      const payload = (await response.json()) as { ok?: boolean; data?: Sale; error?: string };
      if (response.ok && payload.ok && payload.data) {
        upsertSale(payload.data);
        setStatus("Venta registrada en Supabase y pendiente de validación.");
      } else {
        setStatus(payload.error ?? "Venta guardada localmente. Revisa conexión con Supabase.");
      }
    } catch {
      setStatus("Venta guardada localmente. No se pudo sincronizar con Supabase.");
    } finally {
      const nextBase = state.executives.find((item) => item.id === sale.executiveId);
      setSale(createEmptySale(nextBase?.id ?? sale.executiveId, nextBase?.teamId ?? sale.teamId ?? ""));
      setSummaryOpen(false);
      setSaving(false);
    }
  }

  return (
    <section className="card sales-entry-card">
      <div className="sales-entry-header">
        <div>
          <p className="eyebrow">Expediente comercial</p>
          <h2>Registrar venta</h2>
          <p className="muted">Registra participante, programa, plan de pago, evidencia y trazabilidad para validación.</p>
        </div>
        {status ? <span className="validation-toast">{status}</span> : null}
      </div>

      {duplicateParticipant ? (
        <div className="sales-warning">
          <AlertTriangle size={18} />
          <span>Posible participante duplicado: {duplicateParticipant.participant?.fullName ?? duplicateParticipant.productName}. Revisa antes de guardar.</span>
        </div>
      ) : null}

      <div className="sales-entry-sections">
        <FormSection title="Datos comerciales">
          <Field label="Fecha de venta"><input type="date" value={sale.saleDate} onChange={(event) => update("saleDate", event.target.value)} /></Field>
          <Field label="Ejecutivo">
            <div className="field-inline">
              <select value={sale.executiveId} disabled={!allowOtherExecutive} onChange={(event) => update("executiveId", event.target.value)}>
                {executives.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => setAllowOtherExecutive((value) => !value)} title="Registrar para otro ejecutivo">
                <UserRoundCog size={16} />
              </button>
            </div>
          </Field>
          <Field label="Equipo"><input value={currentTeam?.name ?? "Sin equipo"} readOnly /></Field>
          <Field label="Origen del lead">
            <div className="field-inline">
              <select value={sale.leadSource} onChange={(event) => update("leadSource", event.target.value)}>
                {state.leadSources.filter((item) => item.active).map((item) => <option key={item.id}>{item.label}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => { setOptionModal("lead"); setOptionDraft(""); }} title="Agregar origen"><Plus size={16} /></button>
            </div>
          </Field>
          <Field label="Canal de atención">
            <select value={sale.attentionChannel ?? "WhatsApp"} onChange={(event) => update("attentionChannel", event.target.value)}>
              {attentionChannels.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Estado de venta"><input value="Pendiente de validación" readOnly /></Field>
        </FormSection>

        <FormSection title="Datos del participante">
          <Field label="Nombre completo"><input value={sale.participant?.fullName ?? ""} onChange={(event) => updateParticipant("fullName", event.target.value)} /></Field>
          <Field label="Tipo de documento"><select value={sale.participant?.documentType ?? "DNI"} onChange={(event) => updateParticipant("documentType", event.target.value)}><option>DNI</option><option>Carnet de extranjería</option><option>Pasaporte</option><option>RUC</option><option>Otro</option></select></Field>
          <Field label="Número de documento"><input value={sale.participant?.documentNumber ?? ""} onChange={(event) => updateParticipant("documentNumber", event.target.value)} /></Field>
          <Field label="Celular"><input value={sale.participant?.phone ?? ""} onChange={(event) => updateParticipant("phone", event.target.value)} /></Field>
          <Field label="Correo electrónico"><input type="email" value={sale.participant?.email ?? ""} onChange={(event) => updateParticipant("email", event.target.value)} /></Field>
          <Field label="Departamento"><input value={sale.participant?.department ?? ""} onChange={(event) => updateParticipant("department", event.target.value)} /></Field>
          <Field label="Provincia"><input value={sale.participant?.province ?? ""} onChange={(event) => updateParticipant("province", event.target.value)} /></Field>
          <Field label="Distrito"><input value={sale.participant?.district ?? ""} onChange={(event) => updateParticipant("district", event.target.value)} /></Field>
          <Field label="Profesión / carrera"><input value={sale.participant?.profession ?? ""} onChange={(event) => updateParticipant("profession", event.target.value)} /></Field>
          <Field label="Centro de labores"><input value={sale.participant?.workplace ?? ""} onChange={(event) => updateParticipant("workplace", event.target.value)} /></Field>
        </FormSection>

        <FormSection title="Programa y modalidad">
          <Field label="Tipo de producto">
            <div className="field-inline">
              <select value={sale.productType} onChange={(event) => update("productType", event.target.value)}>
                {productTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => { setOptionModal("product_type"); setOptionDraft(""); }} title="Agregar tipo de producto"><Plus size={16} /></button>
            </div>
          </Field>
          <Field label="Programa / evento">
            <div className="field-inline">
              <select value={sale.productId ?? ""} onChange={(event) => selectCatalogProgram(event.target.value)}>
                <option value="">Seleccionar producto activo</option>
                {activePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code ? `${program.code} · ` : ""}{program.name}
                  </option>
                ))}
              </select>
              <button className="icon-button" type="button" onClick={() => { setOptionModal("program"); setOptionDraft(sale.productName); }} title="Solicitar producto"><Plus size={16} /></button>
            </div>
          </Field>
          <Field label="Código del programa"><input value={sale.programCode ?? ""} onChange={(event) => update("programCode", event.target.value)} /></Field>
          <Field label="Modalidad"><select value={sale.modality ?? "Virtual"} onChange={(event) => update("modality", event.target.value)}>{modalityOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Fecha de inicio"><input type="date" value={sale.startDate ?? ""} onChange={(event) => update("startDate", event.target.value)} /></Field>
          <Field label="Fecha de término"><input type="date" value={sale.endDate ?? ""} onChange={(event) => update("endDate", event.target.value)} /></Field>
          <Field label="Duración"><input value={sale.duration ?? ""} onChange={(event) => update("duration", event.target.value)} /></Field>
          <Field label="Horario"><input value={sale.schedule ?? ""} onChange={(event) => update("schedule", event.target.value)} /></Field>
          {selectedProgram ? (
            <div className="sales-program-operations">
              <span><strong>{selectedProgram.accessConfig?.releaseRule || "Acceso por confirmar"}</strong><small>Habilitación</small></span>
              <span><strong>{selectedProgram.accessConfig?.admissionMode || "Pendiente"}</strong><small>Ingreso al aula</small></span>
              <span><strong>{selectedProgram.academicConfig?.moduleCount || 0}</strong><small>Módulos</small></span>
              <span><strong>{selectedProgram.academicConfig?.sessionCount || 0}</strong><small>Clases</small></span>
              <span><strong>{selectedProgram.academicConfig?.materialsDeliveryMode || "Pendiente"}</strong><small>Materiales</small></span>
            </div>
          ) : null}
          {renderModalityFields(sale, updateModalityDetail)}
        </FormSection>

        <FormSection title="Plan de pago">
          <Field label="Tipo de cobro"><select value={sale.billingType ?? "Pago único"} onChange={(event) => update("billingType", event.target.value)}>{billingTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Concepto pagado"><select value={sale.paymentConcept ?? "Pago total"} onChange={(event) => update("paymentConcept", event.target.value)}>{paymentConcepts.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Plan de pago"><select value={sale.paymentPlanType ?? "Pago completo"} onChange={(event) => update("paymentPlanType", event.target.value)}>{paymentPlans.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Monto bruto"><input type="number" inputMode="decimal" value={numberInput(sale.grossAmount)} onChange={(event) => update("grossAmount", numberFromInput(event.target.value))} /></Field>
          <Field label="Descuento aplicado"><select value={selectedDiscountId} onChange={(event) => applyDiscount(event.target.value)}>{activeDiscounts.map((discount) => <option key={discount.id} value={discount.id}>{discount.label}</option>)}</select></Field>
          {selectedDiscount?.requiresApproval ? (
            <>
              <Field label="Monto especial"><input type="number" min={0} value={specialDiscountInput} onChange={(event) => setSpecialDiscountInput(event.target.value)} /></Field>
              <Field label="Motivo autorización"><input value={specialReason} onChange={(event) => setSpecialReason(event.target.value)} /></Field>
              <Field label="Solicitud"><button className="ghost-button" type="button" onClick={requestSpecialDiscount}><Bell size={16} /> Notificar</button></Field>
            </>
          ) : null}
          <Field label="Monto neto"><input value={money(sale.netAmount)} readOnly /></Field>
          <Field label="Monto pagado hoy"><input type="number" inputMode="decimal" value={numberInput(sale.paidAmount)} onChange={(event) => update("paidAmount", numberFromInput(event.target.value))} /></Field>
          <Field label="Saldo pendiente"><input value={money(sale.pendingAmount ?? 0)} readOnly /></Field>
          {sale.billingType === "Matrícula + mensualidades" || sale.paymentPlanType === "Cuotas mensuales" ? (
            <>
              <Field label="Matrícula"><input type="number" value={numberInput(sale.paymentPlan?.enrollmentAmount)} onChange={(event) => updatePlan("enrollmentAmount", numberFromInput(event.target.value))} /></Field>
              <Field label="Mensualidad"><input type="number" value={numberInput(sale.paymentPlan?.monthlyAmount)} onChange={(event) => updatePlan("monthlyAmount", numberFromInput(event.target.value))} /></Field>
              <Field label="Cantidad de cuotas"><input type="number" value={numberInput(sale.paymentPlan?.monthlyCount)} onChange={(event) => updatePlan("monthlyCount", numberFromInput(event.target.value))} /></Field>
              <Field label="Próxima fecha de pago"><input type="date" value={sale.paymentPlan?.nextDueDate ?? ""} onChange={(event) => updatePlan("nextDueDate", event.target.value)} /></Field>
            </>
          ) : null}
        </FormSection>

        <FormSection title="Datos del pago">
          <Field label="Medio de pago">
            <div className="field-inline">
              <select value={sale.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
                {state.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id}>{item.label}</option>)}
              </select>
              <button className="icon-button" type="button" onClick={() => { setOptionModal("payment"); setOptionDraft(""); }} title="Agregar medio"><Plus size={16} /></button>
            </div>
          </Field>
          <Field label="Entidad destino"><input value={sale.paymentEntity ?? ""} onChange={(event) => update("paymentEntity", event.target.value)} /></Field>
          <Field label="Titular destino"><input value={sale.destinationHolder ?? ""} onChange={(event) => update("destinationHolder", event.target.value)} /></Field>
          <Field label="Número de operación"><input value={sale.operationNumber ?? ""} onChange={(event) => update("operationNumber", event.target.value)} /></Field>
          <Field label="Fecha de operación"><input type="date" value={sale.operationDate ?? sale.saleDate} onChange={(event) => update("operationDate", event.target.value)} /></Field>
          <Field label="Hora de operación"><input type="time" value={sale.operationTime ?? ""} onChange={(event) => update("operationTime", event.target.value)} /></Field>
          <Field label="Estado del pago"><input value="Pendiente de validación" readOnly /></Field>
        </FormSection>

        <FormSection title="Evidencias">
          <Field label="Tipo de evidencia"><select value={evidenceDraft.type} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, type: event.target.value })}>{evidenceTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Descripción"><input value={evidenceDraft.description} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, description: event.target.value })} /></Field>
          <label className="upload-zone sales-upload-zone">
            <FileText size={18} />
            Adjuntar evidencia
            <input type="file" hidden onChange={(event) => addEvidence(event.target.files?.[0])} />
          </label>
          <div className="sales-evidence-list">
            {(sale.attachments ?? []).map((item) => (
              <span key={item.id} className="badge">
                {item.attachmentType}: {item.fileName}
                <button type="button" className="inline-x" onClick={() => removeEvidence(item.id)} title="Quitar evidencia"><X size={13} /></button>
              </span>
            ))}
          </div>
        </FormSection>

        <FormSection title="Observaciones internas">
          <div className="field span-2">
            <label>Observación</label>
            <textarea value={sale.notes ?? ""} onChange={(event) => update("notes", event.target.value)} />
          </div>
        </FormSection>
      </div>

      <div className="sales-entry-actions">
        <button className="ghost-button" type="button" onClick={() => setSale(createEmptySale(sale.executiveId, sale.teamId ?? ""))}>Limpiar</button>
        <button className="primary-button" type="button" onClick={openSummary}><Save size={17} /> Revisar y guardar</button>
      </div>

      {optionModal ? (
        <div className="modal-backdrop">
          <div className="modal sales-modal-small">
            <p className="eyebrow">Nuevo registro</p>
            <h2>{optionTitle(optionModal)}</h2>
            <Field label="Nombre"><input autoFocus value={optionDraft} onChange={(event) => setOptionDraft(event.target.value)} /></Field>
            <div className="sales-modal-actions">
              <button className="ghost-button" onClick={() => setOptionModal(null)}>Cancelar</button>
              <button className="primary-button" onClick={() => addOption(optionModal)}>Guardar</button>
            </div>
          </div>
        </div>
      ) : null}

      {summaryOpen ? (
        <div className="modal-backdrop">
          <div className="modal sales-modal-small">
            <p className="eyebrow">Resumen de venta</p>
            <h2>Confirmar registro</h2>
            <div className="sales-confirm-summary">
              <span>Ejecutivo <strong>{currentExecutive?.fullName ?? "Sin ejecutivo"}</strong></span>
              <span>Participante <strong>{sale.participant?.fullName}</strong></span>
              <span>Documento <strong>{sale.participant?.documentNumber}</strong></span>
              <span>Programa <strong>{sale.productName}</strong></span>
              <span>Modalidad <strong>{sale.modality}</strong></span>
              <span>Concepto <strong>{sale.paymentConcept}</strong></span>
              <span>Monto pagado <strong>{money(sale.paidAmount ?? 0)}</strong></span>
              <span>Saldo pendiente <strong>{money(sale.pendingAmount ?? 0)}</strong></span>
              <span>Evidencias <strong>{sale.attachments?.length ?? 0} archivo(s)</strong></span>
            </div>
            <div className="sales-modal-actions">
              <button className="ghost-button" disabled={saving} onClick={() => setSummaryOpen(false)}>Volver a editar</button>
              <button className="primary-button" disabled={saving} onClick={saveSale}><Check size={16} /> {saving ? "Guardando..." : "Confirmar registro"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="sales-form-section">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function recalculateSale(sale: Sale): Sale {
  const gross = Number(sale.grossAmount ?? 0);
  const discount = Number(sale.discountAmount ?? 0);
  const netAmount = Math.max(gross - discount, 0);
  const paidAmount = Math.max(Number(sale.paidAmount ?? 0), 0);
  const planTotal = computePlanTotal(sale);
  const commercialTotal = Math.max(planTotal || netAmount, netAmount);
  return {
    ...sale,
    grossAmount: gross,
    discountAmount: discount,
    netAmount: commercialTotal,
    paidAmount,
    pendingAmount: Math.max(commercialTotal - paidAmount, 0),
    payment: {
      ...sale.payment,
      paymentDate: sale.operationDate ?? sale.saleDate,
      paymentTime: sale.operationTime,
      concept: sale.paymentConcept ?? "Pago total",
      method: sale.paymentMethod,
      entity: sale.paymentEntity,
      destinationHolder: sale.destinationHolder,
      operationNumber: sale.operationNumber,
      expectedAmount: commercialTotal,
      paidAmount,
      status: sale.paymentStatus ?? "Pendiente de validación"
    },
    paymentPlan: {
      ...sale.paymentPlan,
      planType: sale.paymentPlanType ?? "Pago completo",
      billingType: sale.billingType ?? "Pago único",
      totalProgramAmount: commercialTotal,
      paidAmount,
      pendingAmount: Math.max(commercialTotal - paidAmount, 0)
    }
  };
}

function computePlanTotal(sale: Sale) {
  const enrollment = Number(sale.paymentPlan?.enrollmentAmount ?? 0);
  const monthly = Number(sale.paymentPlan?.monthlyAmount ?? 0);
  const count = Number(sale.paymentPlan?.monthlyCount ?? 0);
  const certificate = Number(sale.paymentPlan?.certificateAmount ?? 0);
  return enrollment + monthly * count + certificate;
}

function renderModalityFields(sale: Sale, onChange: (key: string, value: string | boolean) => void) {
  if (sale.modality === "Asincrónico") {
    return (
      <>
        <Field label="Fecha de acceso al material"><input type="date" value={String(sale.modalityDetails?.materialAccessDate ?? "")} onChange={(event) => onChange("materialAccessDate", event.target.value)} /></Field>
        <Field label="Material enviado"><select value={String(sale.modalityDetails?.materialWillBeSent ?? "")} onChange={(event) => onChange("materialWillBeSent", event.target.value === "true")}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></Field>
        <Field label="Certificado digital incluido"><select value={String(sale.modalityDetails?.digitalCertificateIncluded ?? "")} onChange={(event) => onChange("digitalCertificateIncluded", event.target.value === "true")}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></Field>
      </>
    );
  }
  if (sale.modality === "Presencial") {
    return (
      <>
        <Field label="Sede"><input value={String(sale.modalityDetails?.venue ?? "")} onChange={(event) => onChange("venue", event.target.value)} /></Field>
        <Field label="Vacante reservada"><select value={String(sale.modalityDetails?.seatReserved ?? "")} onChange={(event) => onChange("seatReserved", event.target.value === "true")}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></Field>
      </>
    );
  }
  return (
    <>
      <Field label="Plataforma / campus"><input value={String(sale.modalityDetails?.platform ?? "")} onChange={(event) => onChange("platform", event.target.value)} /></Field>
      <Field label="Link de grupo enviado"><select value={String(sale.modalityDetails?.groupLinkSent ?? "")} onChange={(event) => onChange("groupLinkSent", event.target.value === "true")}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></Field>
    </>
  );
}

function optionTitle(kind: OptionModalKind) {
  if (kind === "program") return "Solicitar producto / evento";
  if (kind === "lead") return "Agregar origen del lead";
  if (kind === "payment") return "Agregar medio de pago";
  return "Agregar tipo de producto";
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

function buildProgramFollowups(program: SalesProgram) {
  const followups = [
    program.accessConfig?.requiresValidatedPayment ? "Confirmar pago validado antes de habilitar acceso" : "Confirmar inscripción",
    program.accessConfig?.credentialDelivery !== "No aplica" ? "Crear o enviar credenciales del aula virtual" : "",
    program.accessConfig?.welcomeChannel && program.accessConfig.welcomeChannel !== "Sin mensaje automático" ? `Enviar bienvenida por ${program.accessConfig.welcomeChannel}` : "",
    program.whatsappGroupUrl ? "Enviar enlace del grupo de WhatsApp" : "",
    program.academicConfig?.materialsDeliveryMode ? `Programar materiales: ${program.academicConfig.materialsDeliveryMode}` : "",
    program.academicConfig?.evaluationRequired ? "Informar evaluación y nota mínima aprobatoria" : "",
    "Confirmar que el participante pudo ingresar"
  ].filter(Boolean);
  return Array.from(new Set(followups));
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function numberFromInput(value: string) {
  if (value === "") return 0;
  return Math.max(Number(value), 0);
}

function numberInput(value?: number) {
  if (!value) return "";
  return String(value);
}

function findDuplicateParticipant(sales: Sale[], sale: Sale) {
  const documentNumber = sale.participant?.documentNumber?.trim();
  const email = sale.participant?.email?.trim().toLowerCase();
  const phone = sale.participant?.phone?.replace(/\D/g, "");
  if (!documentNumber && !email && !phone) return null;
  return sales.find((item) => {
    const participant = item.participant;
    if (!participant) return false;
    return (
      (!!documentNumber && participant.documentNumber === documentNumber) ||
      (!!email && participant.email?.trim().toLowerCase() === email) ||
      (!!phone && participant.phone?.replace(/\D/g, "") === phone)
    );
  }) ?? null;
}

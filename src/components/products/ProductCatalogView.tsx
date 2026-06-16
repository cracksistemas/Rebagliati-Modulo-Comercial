"use client";

import {
  Archive,
  ClipboardCopy,
  CopyPlus,
  Eye,
  FileText,
  Filter,
  Link as LinkIcon,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCommercialState, money, setCommercialState } from "@/lib/commercial/store";
import type { ProductType, Sale, SalesProgram } from "@/lib/commercial/types";

type CatalogModal = "detail" | "edit" | "duplicate" | "template" | "sales" | "import" | null;

type CatalogFilters = {
  query: string;
  month: string;
  productType: string;
  modality: string;
  status: string;
  institution: string;
  area: string;
  audience: string;
  availability: string;
  priceCompleteness: string;
  formStatus: string;
};

const emptyFilters: CatalogFilters = {
  query: "",
  month: "",
  productType: "",
  modality: "",
  status: "",
  institution: "",
  area: "",
  audience: "",
  availability: "",
  priceCompleteness: "",
  formStatus: ""
};

const productTypeOptions: ProductType[] = [
  "Diplomado",
  "Diplomado intensivo",
  "Diplomado internacional",
  "Curso",
  "Curso online",
  "Curso intensivo",
  "Curso Modular",
  "Taller",
  "Seminario",
  "Practica interactiva",
  "Certifícate",
  "Webinar",
  "Evento gratuito",
  "Asincrónico",
  "Otro"
];

const statusOptions = ["Borrador", "En revision", "Activo para ventas", "Pausado", "Cerrado", "Archivado", "Cancelado"];
const modalityOptions = ["Virtual", "Asincrónico", "Presencial", "Semipresencial", "Híbrido", "Asincrónico y virtual"];
const durationUnits = ["Días", "Semanas", "Meses", "Horas", "Sesiones"];
const institutions = ["UNASAM", "Barton", "Rebagliati Diplomados", "CRE XXIV Lima Provincias", "CRO Huaraz", "ANEOP", "FED - CUT ESSALUD", "Otra"];
const audienceOptions = ["Médicos", "Licenciados", "Técnicos", "Estudiantes", "Profesionales de salud", "Profesionales de enfermería", "Profesionales de obstetricia", "Público en general", "Conductores de ambulancia", "Técnicos en farmacia", "Otro"];
const wizardSteps = ["General", "Fechas", "Certificación", "Público", "Tarifas", "Links", "Plantilla", "Revisión"];

function createDraft(base?: Partial<SalesProgram>): SalesProgram {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? `program-${crypto.randomUUID()}`,
    name: base?.name ?? "",
    baseProductName: base?.baseProductName ?? base?.name ?? "",
    editionName: base?.editionName ?? "Edición comercial",
    code: base?.code ?? "",
    productType: base?.productType ?? "Curso",
    area: base?.area ?? "",
    status: base?.status ?? "Borrador",
    modality: base?.modality ?? "Virtual",
    startDate: base?.startDate ?? "",
    endDate: base?.endDate ?? "",
    durationValue: base?.durationValue ?? 0,
    durationUnit: base?.durationUnit ?? "Horas",
    classDays: base?.classDays ?? "",
    scheduleSummary: base?.scheduleSummary ?? "",
    academicHours: base?.academicHours ?? 0,
    credits: base?.credits ?? 0,
    certificationType: base?.certificationType ?? "Institucional",
    certifyingInstitution: base?.certifyingInstitution ?? "Rebagliati Diplomados",
    targetAudience: base?.targetAudience ?? "",
    allowedProfiles: base?.allowedProfiles ?? [],
    shortDescription: base?.shortDescription ?? "",
    commercialDescription: base?.commercialDescription ?? "",
    academicOwner: base?.academicOwner ?? "",
    commercialOwner: base?.commercialOwner ?? "",
    priceFrom: base?.priceFrom ?? 0,
    enrollmentAmount: base?.enrollmentAmount ?? 0,
    monthlyAmount: base?.monthlyAmount ?? 0,
    monthlyCount: base?.monthlyCount ?? 0,
    singlePaymentAmount: base?.singlePaymentAmount ?? 0,
    certificateAmount: base?.certificateAmount ?? 0,
    promoName: base?.promoName ?? "",
    promoValidUntil: base?.promoValidUntil ?? "",
    formUrl: base?.formUrl ?? "",
    whatsappGroupUrl: base?.whatsappGroupUrl ?? "",
    zoomUrl: base?.zoomUrl ?? "",
    campusUrl: base?.campusUrl ?? "",
    brochureUrl: base?.brochureUrl ?? "",
    imageUrl: base?.imageUrl ?? "",
    videoUrl: base?.videoUrl ?? "",
    templateText: base?.templateText ?? "",
    sessions: base?.sessions ?? [],
    priceTiers: base?.priceTiers ?? [],
    active: base?.active ?? base?.status === "Activo para ventas",
    createdAt: base?.createdAt ?? now,
    updatedAt: now
  };
}

export function ProductCatalogView() {
  const [state, setState] = useState(getCommercialState);
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);
  const [modal, setModal] = useState<CatalogModal>(null);
  const [selected, setSelected] = useState<SalesProgram | null>(null);
  const [draft, setDraft] = useState<SalesProgram>(() => createDraft());
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("");
  const [importText, setImportText] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/commercial/options", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!alive || !payload?.ok || !payload.data?.programs) return;
        setState((current) => {
          const next = { ...current, programs: payload.data.programs };
          setCommercialState(next);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const programs = state.programs;
  const activeForSales = programs.filter((program) => isActiveForSales(program));
  const filteredPrograms = useMemo(() => filterPrograms(programs, filters), [programs, filters]);
  const salesByProgram = useMemo(() => groupSalesByProgram(state.sales), [state.sales]);
  const incompletePricing = programs.filter((program) => !hasValidPrice(program)).length;
  const withoutForm = programs.filter((program) => isActiveForSales(program) && !program.formUrl).length;
  const promoWarnings = programs.filter((program) => program.promoValidUntil && program.promoValidUntil < new Date().toISOString().slice(0, 10)).length;

  function sync(nextPrograms: SalesProgram[]) {
    const next = { ...state, programs: nextPrograms };
    setState(next);
    setCommercialState(next);
  }

  function openCreate() {
    setDraft(createDraft());
    setSelected(null);
    setStep(0);
    setModal("edit");
    setStatus("");
  }

  function openEdit(program: SalesProgram) {
    setSelected(program);
    setDraft(createDraft(program));
    setStep(0);
    setModal("edit");
    setStatus("");
  }

  function openDuplicate(program: SalesProgram) {
    setSelected(program);
    setDraft(createDraft({
      ...program,
      id: `program-${crypto.randomUUID()}`,
      code: "",
      startDate: "",
      endDate: "",
      promoValidUntil: "",
      formUrl: "",
      status: "Borrador",
      active: false,
      createdAt: new Date().toISOString()
    }));
    setStep(0);
    setModal("duplicate");
  }

  function patchDraft(patch: Partial<SalesProgram>) {
    setDraft((current) => {
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      if (patch.status) next.active = patch.status === "Activo para ventas";
      if (patch.name && !current.baseProductName) next.baseProductName = patch.name;
      if (patch.singlePaymentAmount || patch.enrollmentAmount || patch.monthlyAmount || patch.certificateAmount) next.priceFrom = calculatePriceFrom(next);
      return next;
    });
  }

  async function saveDraft() {
    const validation = validateProgram(draft, programs, selected?.id);
    if (validation) {
      setStatus(validation);
      return;
    }
    const normalized = {
      ...draft,
      active: draft.status === "Activo para ventas",
      priceFrom: calculatePriceFrom(draft),
      templateText: draft.templateText || buildTemplate(draft),
      changeLog: [
        {
          id: `change-${crypto.randomUUID()}`,
          action: selected ? "Producto editado" : "Producto creado",
          changedBy: "Sistema",
          createdAt: new Date().toLocaleString("es-PE")
        },
        ...(draft.changeLog ?? [])
      ]
    };
    const nextPrograms = programs.some((item) => item.id === normalized.id)
      ? programs.map((item) => (item.id === normalized.id ? normalized : item))
      : [normalized, ...programs];
    sync(nextPrograms);
    setModal(null);
    setStatus("Producto guardado en catálogo y actualizado para ventas.");
    await persistProgram(normalized);
  }

  function archiveProgram(program: SalesProgram) {
    const updated = { ...program, status: "Archivado", active: false, updatedAt: new Date().toISOString() };
    sync(programs.map((item) => (item.id === program.id ? updated : item)));
    persistProgram(updated);
    setStatus("Producto archivado. Ya no aparecerá para registrar ventas.");
  }

  function openTemplate(program: SalesProgram) {
    const template = buildTemplate(program);
    setSelected(program);
    setDraft({ ...program, templateText: template });
    setModal("template");
  }

  function saveTemplate() {
    if (!selected) return;
    const updated = { ...selected, templateText: draft.templateText || buildTemplate(draft), updatedAt: new Date().toISOString() };
    sync(programs.map((item) => (item.id === updated.id ? updated : item)));
    persistProgram(updated);
    setModal(null);
    setStatus("Plantilla informativa actualizada.");
  }

  function importFromTemplate() {
    const parsed = parseTemplate(importText);
    setDraft(createDraft(parsed));
    setStep(0);
    setModal("edit");
    setStatus("Campos detectados desde plantilla. Revisa antes de activar.");
  }

  function requestProductCreation() {
    setStatus("Solicitud preparada: avisa a un administrador si un programa no existe o no está activo para ventas.");
  }

  return (
    <section className="products-module">
      <div className="products-hero card">
        <div>
          <p className="eyebrow">Catálogo comercial</p>
          <h2>Productos y Eventos</h2>
          <p className="muted">Controla programas activos, fechas, tarifas, formularios y plantillas que se usan en ventas.</p>
        </div>
        <div className="products-actions">
          <button className="ghost-button" type="button" onClick={() => setModal("import")}><FileText size={16} /> Importar plantilla</button>
          <button className="primary-button" type="button" onClick={openCreate}><Plus size={17} /> Crear producto / evento</button>
        </div>
      </div>

      {status ? <div className="validation-toast products-toast">{status}</div> : null}

      <div className="products-kpis">
        <Kpi label="Activos para ventas" value={activeForSales.length} detail="Visibles en Registrar venta" />
        <Kpi label="Ediciones registradas" value={programs.length} detail="Base + edición comercial" />
        <Kpi label="Tarifas incompletas" value={incompletePricing} detail="No deben activarse" warning={incompletePricing > 0} />
        <Kpi label="Sin formulario" value={withoutForm} detail="Revisar links" warning={withoutForm > 0} />
        <Kpi label="Promos vencidas" value={promoWarnings} detail="Actualizar precio regular" warning={promoWarnings > 0} />
      </div>

      <div className="card products-filter-card">
        <div className="products-filter-title">
          <Filter size={17} />
          <strong>Filtros del catálogo</strong>
          <button className="ghost-button small" type="button" onClick={() => setFilters(emptyFilters)}>Limpiar</button>
        </div>
        <div className="products-filter-grid">
          <label className="field span-2">
            <span>Buscador</span>
            <div className="search-input">
              <Search size={16} />
              <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Nombre, código, institución, fecha o palabra clave" />
            </div>
          </label>
          <FilterSelect label="Mes de inicio" value={filters.month} onChange={(value) => setFilters({ ...filters, month: value })} options={monthOptions(programs)} />
          <FilterSelect label="Tipo" value={filters.productType} onChange={(value) => setFilters({ ...filters, productType: value })} options={uniqueStrings(programs.map((item) => item.productType))} />
          <FilterSelect label="Modalidad" value={filters.modality} onChange={(value) => setFilters({ ...filters, modality: value })} options={uniqueStrings(programs.map((item) => item.modality ?? ""))} />
          <FilterSelect label="Estado" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={statusOptions} />
          <FilterSelect label="Institución" value={filters.institution} onChange={(value) => setFilters({ ...filters, institution: value })} options={uniqueStrings(programs.map((item) => item.certifyingInstitution ?? ""))} />
          <FilterSelect label="Área / rubro" value={filters.area} onChange={(value) => setFilters({ ...filters, area: value })} options={uniqueStrings(programs.map((item) => item.area ?? ""))} />
          <FilterSelect label="Público dirigido" value={filters.audience} onChange={(value) => setFilters({ ...filters, audience: value })} options={uniqueStrings(programs.map((item) => item.targetAudience ?? ""))} />
          <FilterSelect label="Disponibilidad" value={filters.availability} onChange={(value) => setFilters({ ...filters, availability: value })} options={["Activo para venta", "Archivado o cerrado"]} />
          <FilterSelect label="Tarifas" value={filters.priceCompleteness} onChange={(value) => setFilters({ ...filters, priceCompleteness: value })} options={["Completas", "Incompletas"]} />
          <FilterSelect label="Formulario" value={filters.formStatus} onChange={(value) => setFilters({ ...filters, formStatus: value })} options={["Con formulario", "Sin formulario"]} />
        </div>
      </div>

      <div className="card products-table-card">
        <div className="products-section-header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h3>{filteredPrograms.length} producto(s) / evento(s)</h3>
          </div>
          <button className="ghost-button" type="button" onClick={requestProductCreation}><Send size={16} /> Solicitar creación</button>
        </div>
        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto / evento</th>
                <th>Tipo</th>
                <th>Modalidad</th>
                <th>Inicio</th>
                <th>Término</th>
                <th>Estado</th>
                <th>Precio desde</th>
                <th>Certifica</th>
                <th>Formulario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.map((program) => {
                const associated = salesByProgram.get(program.name) ?? [];
                return (
                  <tr key={program.id}>
                    <td><strong>{program.code || "Sin código"}</strong></td>
                    <td>
                      <div className="product-name-cell">
                        <span>{program.name}</span>
                        <small>{program.editionName || program.baseProductName || "Edición comercial"}</small>
                      </div>
                    </td>
                    <td>{program.productType}</td>
                    <td>{program.modality || "Pendiente"}</td>
                    <td>{formatDate(program.startDate)}</td>
                    <td>{formatDate(program.endDate)}</td>
                    <td><span className={`product-status ${statusClass(program.status)}`}>{program.status || (program.active ? "Activo para ventas" : "Borrador")}</span></td>
                    <td>{money(calculatePriceFrom(program))}</td>
                    <td>{program.certifyingInstitution || "Pendiente"}</td>
                    <td>{program.formUrl ? <a className="table-link" href={program.formUrl} target="_blank" rel="noreferrer"><LinkIcon size={14} /> Ver</a> : <span className="muted">Sin formulario</span>}</td>
                    <td>
                      <div className="table-actions">
                        <button className="icon-button" type="button" title="Ver detalle" onClick={() => { setSelected(program); setModal("detail"); }}><Eye size={15} /></button>
                        <button className="icon-button" type="button" title="Editar" onClick={() => openEdit(program)}><Pencil size={15} /></button>
                        <button className="icon-button" type="button" title="Duplicar edición" onClick={() => openDuplicate(program)}><CopyPlus size={15} /></button>
                        <button className="icon-button" type="button" title="Generar plantilla" onClick={() => openTemplate(program)}><Sparkles size={15} /></button>
                        <button className="icon-button" type="button" title={`Ventas asociadas: ${associated.length}`} onClick={() => { setSelected(program); setModal("sales"); }}><PackageOpen size={15} /></button>
                        <button className="icon-button" type="button" title="Archivar" onClick={() => archiveProgram(program)}><Archive size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredPrograms.length ? <div className="empty-state">No se encontraron productos con los filtros seleccionados.</div> : null}
        </div>
      </div>

      <div className="products-bottom-grid">
        <AlertPanel programs={programs} />
        <ReportPanel programs={programs} sales={state.sales} />
      </div>

      {modal === "edit" || modal === "duplicate" ? (
        <EditProductModal
          draft={draft}
          step={step}
          mode={modal}
          status={status}
          onStep={setStep}
          onPatch={patchDraft}
          onClose={() => setModal(null)}
          onSave={saveDraft}
        />
      ) : null}

      {modal === "detail" && selected ? (
        <DetailModal program={selected} sales={salesByProgram.get(selected.name) ?? []} onClose={() => setModal(null)} onEdit={() => openEdit(selected)} />
      ) : null}

      {modal === "template" && selected ? (
        <TemplateModal draft={draft} onPatch={patchDraft} onClose={() => setModal(null)} onCopy={() => copyText(draft.templateText || buildTemplate(draft))} onSave={saveTemplate} />
      ) : null}

      {modal === "sales" && selected ? (
        <SalesAssociatedModal program={selected} sales={salesByProgram.get(selected.name) ?? []} onClose={() => setModal(null)} />
      ) : null}

      {modal === "import" ? (
        <ImportModal value={importText} onChange={setImportText} onClose={() => setModal(null)} onImport={importFromTemplate} />
      ) : null}
    </section>
  );
}

function Kpi({ label, value, detail, warning = false }: { label: string; value: number; detail: string; warning?: boolean }) {
  return (
    <article className={`card product-kpi ${warning ? "warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EditProductModal({
  draft,
  step,
  mode,
  status,
  onStep,
  onPatch,
  onClose,
  onSave
}: {
  draft: SalesProgram;
  step: number;
  mode: "edit" | "duplicate";
  status: string;
  onStep: (step: number) => void;
  onPatch: (patch: Partial<SalesProgram>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal product-edit-modal">
        <div className="sales-modal-header">
          <div>
            <p className="eyebrow">{mode === "duplicate" ? "Duplicar edición" : "Catálogo comercial"}</p>
            <h2>{mode === "duplicate" ? "Nueva edición desde producto existente" : "Crear / editar producto"}</h2>
            <p className="muted">Completa la edición comercial que ventas podrá seleccionar cuando esté activa.</p>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>Cerrar</button>
        </div>
        <div className="wizard-steps">
          {wizardSteps.map((item, index) => (
            <button key={item} className={index === step ? "active" : ""} type="button" onClick={() => onStep(index)}>{index + 1}. {item}</button>
          ))}
        </div>
        <div className="product-modal-body">
          {step === 0 ? <GeneralStep draft={draft} onPatch={onPatch} /> : null}
          {step === 1 ? <DatesStep draft={draft} onPatch={onPatch} /> : null}
          {step === 2 ? <CertificationStep draft={draft} onPatch={onPatch} /> : null}
          {step === 3 ? <AudienceStep draft={draft} onPatch={onPatch} /> : null}
          {step === 4 ? <PricingStep draft={draft} onPatch={onPatch} /> : null}
          {step === 5 ? <LinksStep draft={draft} onPatch={onPatch} /> : null}
          {step === 6 ? <TemplateStep draft={draft} onPatch={onPatch} /> : null}
          {step === 7 ? <ReviewStep draft={draft} /> : null}
        </div>
        {status ? <span className="validation-toast">{status}</span> : null}
        <div className="sales-modal-actions">
          <button className="ghost-button" type="button" onClick={() => onStep(Math.max(step - 1, 0))}>Anterior</button>
          {step < wizardSteps.length - 1 ? (
            <button className="primary-button" type="button" onClick={() => onStep(Math.min(step + 1, wizardSteps.length - 1))}>Siguiente</button>
          ) : (
            <button className="primary-button" type="button" onClick={onSave}>Guardar catálogo</button>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Nombre del producto"><input value={draft.name} onChange={(event) => onPatch({ name: event.target.value })} /></Field>
      <Field label="Código interno"><input value={draft.code ?? ""} onChange={(event) => onPatch({ code: event.target.value })} placeholder="D.SALUDOCUPACIONAL-0626" /></Field>
      <Field label="Tipo de producto"><select value={draft.productType} onChange={(event) => onPatch({ productType: event.target.value })}>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Área / rubro"><input value={draft.area ?? ""} onChange={(event) => onPatch({ area: event.target.value })} /></Field>
      <Field label="Estado"><select value={draft.status ?? "Borrador"} onChange={(event) => onPatch({ status: event.target.value })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Edición comercial"><input value={draft.editionName ?? ""} onChange={(event) => onPatch({ editionName: event.target.value })} /></Field>
      <Field label="Responsable académico"><input value={draft.academicOwner ?? ""} onChange={(event) => onPatch({ academicOwner: event.target.value })} /></Field>
      <Field label="Responsable comercial"><input value={draft.commercialOwner ?? ""} onChange={(event) => onPatch({ commercialOwner: event.target.value })} /></Field>
      <Field label="Descripción corta" wide><textarea value={draft.shortDescription ?? ""} onChange={(event) => onPatch({ shortDescription: event.target.value })} /></Field>
      <Field label="Descripción comercial" wide><textarea value={draft.commercialDescription ?? ""} onChange={(event) => onPatch({ commercialDescription: event.target.value })} /></Field>
    </div>
  );
}

function DatesStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Fecha de inicio"><input type="date" value={draft.startDate ?? ""} onChange={(event) => onPatch({ startDate: event.target.value })} /></Field>
      <Field label="Fecha de término"><input type="date" value={draft.endDate ?? ""} onChange={(event) => onPatch({ endDate: event.target.value })} /></Field>
      <Field label="Duración"><input type="number" min={0} value={draft.durationValue || ""} onChange={(event) => onPatch({ durationValue: Number(event.target.value || 0) })} /></Field>
      <Field label="Unidad"><select value={draft.durationUnit ?? "Horas"} onChange={(event) => onPatch({ durationUnit: event.target.value })}>{durationUnits.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Días de clase"><input value={draft.classDays ?? ""} onChange={(event) => onPatch({ classDays: event.target.value })} /></Field>
      <Field label="Modalidad"><select value={draft.modality ?? "Virtual"} onChange={(event) => onPatch({ modality: event.target.value })}>{modalityOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Horario resumen" wide><textarea value={draft.scheduleSummary ?? ""} onChange={(event) => onPatch({ scheduleSummary: event.target.value })} placeholder="Teoría: 05:00 PM a 09:00 PM / Taller: 05:00 PM a 08:00 PM" /></Field>
    </div>
  );
}

function CertificationStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Horas académicas"><input type="number" min={0} value={draft.academicHours || ""} onChange={(event) => onPatch({ academicHours: Number(event.target.value || 0) })} /></Field>
      <Field label="Créditos"><input type="number" min={0} value={draft.credits || ""} onChange={(event) => onPatch({ credits: Number(event.target.value || 0) })} /></Field>
      <Field label="Tipo de certificación"><select value={draft.certificationType ?? "Institucional"} onChange={(event) => onPatch({ certificationType: event.target.value })}>{["Universitaria", "Técnica", "Institucional", "Constancia", "Certificación opcional", "Sin certificación"].map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Institución certificadora"><select value={draft.certifyingInstitution ?? "Rebagliati Diplomados"} onChange={(event) => onPatch({ certifyingInstitution: event.target.value })}>{institutions.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Instituciones aliadas" wide><input value={draft.alliedInstitutions ?? ""} onChange={(event) => onPatch({ alliedInstitutions: event.target.value })} /></Field>
    </div>
  );
}

function AudienceStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Dirigido a" wide><input value={draft.targetAudience ?? ""} onChange={(event) => onPatch({ targetAudience: event.target.value })} /></Field>
      <Field label="Perfiles permitidos" wide>
        <div className="chip-grid">
          {audienceOptions.map((item) => {
            const active = draft.allowedProfiles?.includes(item);
            return <button key={item} className={active ? "chip active" : "chip"} type="button" onClick={() => onPatch({ allowedProfiles: toggleValue(draft.allowedProfiles ?? [], item) })}>{item}</button>;
          })}
        </div>
      </Field>
    </div>
  );
}

function PricingStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Matrícula promocional"><input type="number" min={0} value={draft.enrollmentAmount || ""} onChange={(event) => onPatch({ enrollmentAmount: Number(event.target.value || 0) })} /></Field>
      <Field label="Mensualidad promocional"><input type="number" min={0} value={draft.monthlyAmount || ""} onChange={(event) => onPatch({ monthlyAmount: Number(event.target.value || 0) })} /></Field>
      <Field label="Cantidad mensualidades"><input type="number" min={0} value={draft.monthlyCount || ""} onChange={(event) => onPatch({ monthlyCount: Number(event.target.value || 0) })} /></Field>
      <Field label="Pago único"><input type="number" min={0} value={draft.singlePaymentAmount || ""} onChange={(event) => onPatch({ singlePaymentAmount: Number(event.target.value || 0) })} /></Field>
      <Field label="Diploma certificado"><input type="number" min={0} value={draft.certificateAmount || ""} onChange={(event) => onPatch({ certificateAmount: Number(event.target.value || 0) })} /></Field>
      <Field label="Promoción válida hasta"><input type="date" value={draft.promoValidUntil ?? ""} onChange={(event) => onPatch({ promoValidUntil: event.target.value })} /></Field>
      <Field label="Nombre de promoción" wide><input value={draft.promoName ?? ""} onChange={(event) => onPatch({ promoName: event.target.value })} /></Field>
      <div className="product-price-preview">
        <span>Precio desde</span>
        <strong>{money(calculatePriceFrom(draft))}</strong>
      </div>
    </div>
  );
}

function LinksStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Formulario de inscripción" wide><input value={draft.formUrl ?? ""} onChange={(event) => onPatch({ formUrl: event.target.value })} /></Field>
      <Field label="Grupo WhatsApp"><input value={draft.whatsappGroupUrl ?? ""} onChange={(event) => onPatch({ whatsappGroupUrl: event.target.value })} /></Field>
      <Field label="Zoom"><input value={draft.zoomUrl ?? ""} onChange={(event) => onPatch({ zoomUrl: event.target.value })} /></Field>
      <Field label="Campus"><input value={draft.campusUrl ?? ""} onChange={(event) => onPatch({ campusUrl: event.target.value })} /></Field>
      <Field label="Brochure"><input value={draft.brochureUrl ?? ""} onChange={(event) => onPatch({ brochureUrl: event.target.value })} /></Field>
      <Field label="Video comercial"><input value={draft.videoUrl ?? ""} onChange={(event) => onPatch({ videoUrl: event.target.value })} /></Field>
    </div>
  );
}

function TemplateStep({ draft, onPatch }: StepProps) {
  return (
    <div className="product-form-grid">
      <Field label="Plantilla informativa" wide>
        <textarea className="template-textarea" value={draft.templateText || buildTemplate(draft)} onChange={(event) => onPatch({ templateText: event.target.value })} />
      </Field>
    </div>
  );
}

function ReviewStep({ draft }: { draft: SalesProgram }) {
  const alerts = [
    !draft.name ? "Falta nombre del producto." : "",
    !draft.modality ? "Falta modalidad." : "",
    !draft.startDate ? "Falta fecha de inicio." : "",
    !draft.certifyingInstitution ? "Falta institución certificadora." : "",
    !hasValidPrice(draft) ? "Falta tarifa válida." : "",
    draft.status === "Activo para ventas" && !draft.formUrl ? "Activo sin formulario asignado." : ""
  ].filter(Boolean);
  return (
    <div className="product-review-grid">
      <SummaryItem label="Producto" value={draft.name || "Pendiente"} />
      <SummaryItem label="Código" value={draft.code || "Pendiente"} />
      <SummaryItem label="Tipo" value={draft.productType} />
      <SummaryItem label="Modalidad" value={draft.modality || "Pendiente"} />
      <SummaryItem label="Inicio" value={formatDate(draft.startDate)} />
      <SummaryItem label="Precio desde" value={money(calculatePriceFrom(draft))} />
      <SummaryItem label="Certifica" value={draft.certifyingInstitution || "Pendiente"} />
      <SummaryItem label="Formulario" value={draft.formUrl ? "Asignado" : "Sin formulario"} />
      <div className="product-alert-list">
        {alerts.length ? alerts.map((alert) => <span key={alert}>{alert}</span>) : <span>Listo para guardar.</span>}
      </div>
    </div>
  );
}

type StepProps = { draft: SalesProgram; onPatch: (patch: Partial<SalesProgram>) => void };

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? "span-2" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function DetailModal({ program, sales, onClose, onEdit }: { program: SalesProgram; sales: Sale[]; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal product-detail-modal">
        <div className="sales-modal-header">
          <div>
            <p className="eyebrow">Ficha del producto</p>
            <h2>{program.name}</h2>
            <p className="muted">{program.shortDescription || program.commercialDescription || "Sin descripción comercial."}</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
        <div className="product-detail-grid">
          <SummaryItem label="Código" value={program.code || "Sin código"} />
          <SummaryItem label="Tipo" value={program.productType} />
          <SummaryItem label="Modalidad" value={program.modality || "Pendiente"} />
          <SummaryItem label="Estado" value={program.status || "Borrador"} />
          <SummaryItem label="Inicio" value={formatDate(program.startDate)} />
          <SummaryItem label="Término" value={formatDate(program.endDate)} />
          <SummaryItem label="Duración" value={`${program.durationValue || 0} ${program.durationUnit || ""}`} />
          <SummaryItem label="Horario" value={program.scheduleSummary || "Pendiente"} />
          <SummaryItem label="Horas académicas" value={String(program.academicHours || 0)} />
          <SummaryItem label="Certifica" value={program.certifyingInstitution || "Pendiente"} />
          <SummaryItem label="Dirigido a" value={program.targetAudience || "Pendiente"} />
          <SummaryItem label="Precio desde" value={money(calculatePriceFrom(program))} />
          <SummaryItem label="Ventas registradas" value={String(sales.length)} />
          <SummaryItem label="Monto vendido" value={money(sales.reduce((sum, sale) => sum + Number(sale.netAmount ?? 0), 0))} />
        </div>
        <div className="product-detail-tabs">
          <article>
            <h3>Tarifas</h3>
            <p>Matrícula: {money(program.enrollmentAmount ?? 0)} · Mensualidad: {money(program.monthlyAmount ?? 0)} · Pago único: {money(program.singlePaymentAmount ?? 0)} · Diploma: {money(program.certificateAmount ?? 0)}</p>
          </article>
          <article>
            <h3>Links</h3>
            <p>{program.formUrl ? `Formulario: ${program.formUrl}` : "Producto sin formulario asignado."}</p>
          </article>
          <article>
            <h3>Historial</h3>
            {(program.changeLog ?? []).slice(0, 4).map((event) => <p key={event.id}>{event.action} · {event.createdAt}</p>)}
            {!program.changeLog?.length ? <p>Sin cambios registrados en esta sesión.</p> : null}
          </article>
        </div>
        <div className="sales-modal-actions">
          <button className="primary-button" onClick={onEdit}><Pencil size={16} /> Editar</button>
        </div>
      </div>
    </div>
  );
}

function TemplateModal({ draft, onPatch, onClose, onCopy, onSave }: { draft: SalesProgram; onPatch: (patch: Partial<SalesProgram>) => void; onClose: () => void; onCopy: () => void; onSave: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal product-template-modal">
        <div className="sales-modal-header">
          <div>
            <p className="eyebrow">Plantilla informativa</p>
            <h2>{draft.name}</h2>
            <p className="muted">Genera variantes para WhatsApp, Meta Ads, ejecutivo, formulario o correo.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
        <textarea className="template-textarea" value={draft.templateText || buildTemplate(draft)} onChange={(event) => onPatch({ templateText: event.target.value })} />
        <div className="template-variants">
          {["WhatsApp", "Meta Ads", "Ejecutivo", "Formulario", "Correo"].map((variant) => <span key={variant}>{variant}</span>)}
        </div>
        <div className="sales-modal-actions">
          <button className="ghost-button" onClick={onCopy}><ClipboardCopy size={16} /> Copiar</button>
          <button className="primary-button" onClick={onSave}>Guardar plantilla</button>
        </div>
      </div>
    </div>
  );
}

function SalesAssociatedModal({ program, sales, onClose }: { program: SalesProgram; sales: Sale[]; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal product-detail-modal">
        <div className="sales-modal-header">
          <div>
            <p className="eyebrow">Ventas asociadas</p>
            <h2>{program.name}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
        <div className="products-table-wrap">
          <table className="products-table">
            <thead><tr><th>Fecha</th><th>Ejecutivo</th><th>Participante</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDate(sale.saleDate)}</td>
                  <td>{sale.executiveId}</td>
                  <td>{sale.participant?.fullName ?? "Sin participante"}</td>
                  <td>{money(sale.netAmount)}</td>
                  <td>{sale.validationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sales.length ? <div className="empty-state">Este producto aún no tiene ventas asociadas.</div> : null}
        </div>
      </div>
    </div>
  );
}

function ImportModal({ value, onChange, onClose, onImport }: { value: string; onChange: (value: string) => void; onClose: () => void; onImport: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal product-template-modal">
        <div className="sales-modal-header">
          <div>
            <p className="eyebrow">Importar desde plantilla</p>
            <h2>Pegar texto del evento</h2>
            <p className="muted">El sistema detectará nombre, fechas, modalidad, horas, formulario y tarifas cuando sea posible.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>
        <textarea className="template-textarea" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Pega aquí la plantilla completa del producto o evento..." />
        <div className="sales-modal-actions">
          <button className="ghost-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" onClick={onImport}><Sparkles size={16} /> Detectar campos</button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AlertPanel({ programs }: { programs: SalesProgram[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const alerts = programs.flatMap((program) => {
    const items: string[] = [];
    if (program.status === "Activo para ventas" && !hasValidPrice(program)) items.push(`${program.name}: activo sin tarifa.`);
    if (program.status === "Activo para ventas" && !program.formUrl) items.push(`${program.name}: activo sin formulario.`);
    if (program.promoValidUntil && program.promoValidUntil < today) items.push(`${program.name}: promoción vencida.`);
    if (program.startDate && daysBetween(today, program.startDate) >= 0 && daysBetween(today, program.startDate) <= 7) items.push(`${program.name}: inicia en menos de 7 días.`);
    return items;
  }).slice(0, 6);
  return (
    <article className="card products-panel">
      <p className="eyebrow">Alertas automáticas</p>
      <h3>Control académico comercial</h3>
      {alerts.length ? alerts.map((alert) => <div className="product-alert" key={alert}>{alert}</div>) : <p className="muted">Sin alertas críticas del catálogo.</p>}
    </article>
  );
}

function ReportPanel({ programs, sales }: { programs: SalesProgram[]; sales: Sale[] }) {
  const active = programs.filter(isActiveForSales).length;
  const withoutSales = programs.filter((program) => !sales.some((sale) => sameText(sale.productName, program.name))).length;
  return (
    <article className="card products-panel">
      <p className="eyebrow">Reportes rápidos</p>
      <h3>Productos y ventas</h3>
      <div className="report-chip-row">
        <span>Productos activos: {active}</span>
        <span>Sin ventas: {withoutSales}</span>
        <span>Por modalidad: {uniqueStrings(programs.map((program) => program.modality ?? "")).length}</span>
        <span>Por institución: {uniqueStrings(programs.map((program) => program.certifyingInstitution ?? "")).length}</span>
      </div>
    </article>
  );
}

function filterPrograms(programs: SalesProgram[], filters: CatalogFilters) {
  return programs.filter((program) => {
    if (filters.query.trim()) {
      const query = normalize(filters.query);
      const searchable = normalize(`${program.name} ${program.code ?? ""} ${program.modality ?? ""} ${program.certifyingInstitution ?? ""} ${program.startDate ?? ""} ${program.area ?? ""} ${program.targetAudience ?? ""}`);
      if (!searchable.includes(query)) return false;
    }
    if (filters.month && (program.startDate ?? "").slice(0, 7) !== filters.month) return false;
    if (filters.productType && program.productType !== filters.productType) return false;
    if (filters.modality && program.modality !== filters.modality) return false;
    if (filters.status && (program.status ?? "") !== filters.status) return false;
    if (filters.institution && program.certifyingInstitution !== filters.institution) return false;
    if (filters.area && program.area !== filters.area) return false;
    if (filters.audience && program.targetAudience !== filters.audience) return false;
    if (filters.availability === "Activo para venta" && !isActiveForSales(program)) return false;
    if (filters.availability === "Archivado o cerrado" && !["Archivado", "Cerrado", "Cancelado", "Pausado"].includes(program.status ?? "")) return false;
    if (filters.priceCompleteness === "Completas" && !hasValidPrice(program)) return false;
    if (filters.priceCompleteness === "Incompletas" && hasValidPrice(program)) return false;
    if (filters.formStatus === "Con formulario" && !program.formUrl) return false;
    if (filters.formStatus === "Sin formulario" && program.formUrl) return false;
    return true;
  });
}

function validateProgram(program: SalesProgram, programs: SalesProgram[], currentId?: string) {
  if (!program.name.trim()) return "El nombre del producto es obligatorio.";
  if (!program.productType) return "El tipo de producto es obligatorio.";
  if (!program.modality) return "La modalidad es obligatoria.";
  if (program.status === "Activo para ventas") {
    if (!program.startDate) return "No puedes activar sin fecha de inicio.";
    if (!program.durationValue && !program.endDate) return "No puedes activar sin duración o fecha de término.";
    if (!program.targetAudience) return "No puedes activar sin público dirigido.";
    if (!program.certifyingInstitution) return "No puedes activar sin institución certificadora.";
    if (!hasValidPrice(program)) return "No puedes activar sin al menos una tarifa válida.";
  }
  const duplicateCode = program.code && programs.some((item) => item.id !== currentId && item.code === program.code && isActiveForSales(item));
  if (duplicateCode && program.status === "Activo para ventas") return "Ya existe una edición activa con ese código.";
  return "";
}

function calculatePriceFrom(program: SalesProgram) {
  const amounts = [
    Number(program.singlePaymentAmount ?? 0),
    Number(program.enrollmentAmount ?? 0),
    Number(program.monthlyAmount ?? 0),
    Number(program.certificateAmount ?? 0),
    ...((program.priceTiers ?? []).flatMap((tier) => [
      Number(tier.singlePaymentPromoAmount ?? 0),
      Number(tier.singlePaymentRegularAmount ?? 0),
      Number(tier.enrollmentPromoAmount ?? 0),
      Number(tier.monthlyPromoAmount ?? 0)
    ]))
  ].filter((amount) => amount > 0);
  return amounts.length ? Math.min(...amounts) : Number(program.priceFrom ?? 0);
}

function hasValidPrice(program: SalesProgram) {
  return calculatePriceFrom(program) > 0;
}

function isActiveForSales(program: SalesProgram) {
  return program.active || program.status === "Activo para ventas";
}

function buildTemplate(program: SalesProgram) {
  return [
    `${program.productType.toUpperCase()} "${program.name}"`,
    "",
    `CERTIFICACIÓN - ${program.certifyingInstitution || "Institución por confirmar"}`,
    program.commercialDescription || program.shortDescription || "Programa comercial activo para inscripción.",
    "",
    "¿Le ayudo con su proceso de inscripción?",
    `Formulario: ${program.formUrl || "Pendiente de asignar"}`,
    "",
    "CUPOS LIMITADOS",
    `INICIO: ${formatDate(program.startDate)}`,
    `TÉRMINO: ${formatDate(program.endDate)}`,
    `DURACIÓN: ${program.durationValue || ""} ${program.durationUnit || ""}`.trim(),
    `DÍAS DE CLASE: ${program.classDays || "Por confirmar"}`,
    `HORARIO: ${program.scheduleSummary || "Por confirmar"}`,
    `MODALIDAD: ${program.modality || "Por confirmar"}`,
    `HORAS ACADÉMICAS: ${program.academicHours || "Por confirmar"}`,
    `DIRIGIDO A: ${program.targetAudience || "Por confirmar"}`,
    `INSTITUCIÓN QUE CERTIFICA: ${program.certifyingInstitution || "Por confirmar"}`,
    "",
    "INVERSIÓN PROMOCIONAL",
    `Matrícula: ${money(program.enrollmentAmount ?? 0)}`,
    `Mensualidad: ${money(program.monthlyAmount ?? 0)}`,
    `Pago único: ${money(program.singlePaymentAmount ?? 0)}`,
    `Diploma certificado: ${money(program.certificateAmount ?? 0)}`
  ].join("\n");
}

function parseTemplate(text: string): Partial<SalesProgram> {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstTitle = lines.find((line) => /diplomado|curso|taller|seminario|certif/i.test(line)) ?? "";
  const amountMatch = text.match(/S\/?\s*(\d+(?:[.,]\d+)?)/i);
  const formMatch = text.match(/https?:\/\/\S+/i);
  const dateMatch = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  const modality = modalityOptions.find((item) => normalize(text).includes(normalize(item))) ?? "Virtual";
  return {
    name: firstTitle.replace(/^(DIPLOMADO|CURSO|TALLER|SEMINARIO|CERTIFICACIÓN|CERTIFÍCATE)\s*/i, "").replace(/[“”"]/g, "").trim() || "Producto pendiente de nombre",
    productType: /diplomado/i.test(firstTitle) ? "Diplomado" : /taller/i.test(firstTitle) ? "Taller" : /seminario/i.test(firstTitle) ? "Seminario" : "Curso",
    modality,
    status: "Borrador",
    active: false,
    startDate: dateMatch ? `${dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}` : "",
    formUrl: formMatch?.[0] ?? "",
    singlePaymentAmount: amountMatch ? Number(amountMatch[1].replace(",", ".")) : 0,
    commercialDescription: lines.slice(1, 4).join(" "),
    templateText: text
  };
}

function groupSalesByProgram(sales: Sale[]) {
  const map = new Map<string, Sale[]>();
  sales.forEach((sale) => {
    const list = map.get(sale.productName) ?? [];
    list.push(sale);
    map.set(sale.productName, list);
  });
  return map;
}

function monthOptions(programs: SalesProgram[]) {
  return uniqueStrings(programs.map((program) => (program.startDate ?? "").slice(0, 7))).sort().reverse();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function sameText(left: string, right: string) {
  return normalize(left) === normalize(right);
}

function formatDate(value?: string) {
  if (!value) return "Pendiente";
  return value;
}

function statusClass(status?: string) {
  if (status === "Activo para ventas") return "active";
  if (status === "Pausado" || status === "En revision") return "warning";
  if (status === "Archivado" || status === "Cerrado" || status === "Cancelado") return "closed";
  return "draft";
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function daysBetween(from: string, to: string) {
  return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value).catch(() => undefined);
}

async function persistProgram(program: SalesProgram) {
  try {
    await fetch("/api/commercial/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "program", name: program.name, productType: program.productType, program })
    });
  } catch {
    undefined;
  }
}

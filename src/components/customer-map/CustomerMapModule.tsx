"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  Copy,
  GitCompare,
  History,
  Map,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  UserRound
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { clientProfiles, painCategories } from "@/lib/data/customer-map-data";
import type { ClientPainPoint, ClientProfile } from "@/types/customer-map";

type ViewMode = "cards" | "map";
type DetailTab = "quick" | "pain" | "motivators" | "objections" | "arguments" | "programs" | "messages" | "marketing" | "sales" | "history";

export function CustomerMapModule() {
  const [profiles, setProfiles] = useState<ClientProfile[]>(clientProfiles);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("cards");
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? "");
  const [detailProfile, setDetailProfile] = useState<ClientProfile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [filters, setFilters] = useState({
    segment: "Todos",
    academicLevel: "Todos",
    motivator: "Todos",
    painType: "Todos",
    frequency: "Todos",
    urgency: "Todos",
    price: "Todos",
    modality: "Todos",
    certification: "Todos",
    status: "Todos"
  });

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const haystack = [
        profile.name,
        profile.shortDescription,
        profile.commercialSummary,
        profile.mainPain,
        profile.mainMotivator,
        profile.trainingFrequency,
        profile.loyaltyLevel,
        profile.academicLevel,
        profile.preferredModality,
        profile.certificationType,
        ...profile.motivators,
        ...profile.needs,
        ...profile.painPoints.flatMap((pain) => [pain.title, pain.description, pain.category]),
        ...profile.objections.flatMap((objection) => [objection.objection, objection.realMeaning]),
        ...profile.recommendedPrograms.map((program) => program.name)
      ].join(" ").toLowerCase();

      return (
        haystack.includes(query.toLowerCase()) &&
        matches(filters.segment, profile.name) &&
        matches(filters.academicLevel, profile.academicLevel) &&
        (filters.motivator === "Todos" || profile.motivators.includes(filters.motivator)) &&
        (filters.painType === "Todos" || profile.painPoints.some((pain) => pain.category === filters.painType)) &&
        matches(filters.frequency, profile.trainingFrequency) &&
        matches(filters.urgency, profile.urgencyLevel) &&
        matches(filters.price, profile.priceSensitivity) &&
        matches(filters.modality, profile.preferredModality) &&
        matches(filters.certification, profile.certificationType) &&
        matches(filters.status, profile.status)
      );
    });
  }, [profiles, query, filters]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];

  function updateProfile(updatedProfile: ClientProfile) {
    setProfiles((current) => current.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile)));
    setDetailProfile(updatedProfile);
  }

  return (
    <section className="customer-map-page">
      <div className="customer-map-hero card card-pad">
        <div>
          <p className="eyebrow">Mapa de Clientes</p>
          <h2>Puntos de dolor y perfil comercial</h2>
          <p>Entiende rapidamente a quien le vendes, que le preocupa, que objecion puede tener y que argumento usar para convertir mejor.</p>
        </div>
        <div className="customer-map-actions">
          <Button onClick={() => setCreateOpen(true)}><Plus size={17} /> Crear perfil</Button>
          <Button variant="secondary" onClick={() => setCompareOpen(true)}><GitCompare size={17} /> Comparar perfiles</Button>
        </div>
      </div>

      <div className="customer-map-controls card card-pad">
        <label className="customer-search">
          <Search size={17} />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar: recertificacion, CV, primer empleo, virtual, ascenso..." />
        </label>
        <div className="customer-view-toggle">
          <button className={mode === "cards" ? "is-active" : ""} type="button" onClick={() => setMode("cards")}><Target size={16} /> Vista tarjetas</button>
          <button className={mode === "map" ? "is-active" : ""} type="button" onClick={() => setMode("map")}><Map size={16} /> Vista mapa visual</button>
        </div>
        <CustomerFilters profiles={profiles} filters={filters} setFilters={setFilters} />
      </div>

      {mode === "cards" ? (
        <div className="client-card-grid">
          {filteredProfiles.map((profile) => (
            <ClientProfileCard profile={profile} key={profile.id} onOpen={() => setDetailProfile(profile)} />
          ))}
        </div>
      ) : (
        <EmpathyMap profiles={filteredProfiles.length ? filteredProfiles : profiles} selectedProfile={selectedProfile} onSelect={setSelectedId} onOpen={() => setDetailProfile(selectedProfile)} />
      )}

      <div className="section-grid grid-2">
        <PainHeatMap profiles={filteredProfiles.length ? filteredProfiles : profiles} />
        <CommercialQuickGuide profile={selectedProfile} onOpen={() => setDetailProfile(selectedProfile)} />
      </div>

      <ClientProfileModal profile={detailProfile} onClose={() => setDetailProfile(null)} onUpdate={updateProfile} />
      <CreateProfileModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(profile) => setProfiles((current) => [profile, ...current])} />
      <CompareProfilesModal open={compareOpen} profiles={profiles} onClose={() => setCompareOpen(false)} />
    </section>
  );
}

function CustomerFilters({
  profiles,
  filters,
  setFilters
}: {
  profiles: ClientProfile[];
  filters: Record<string, string>;
  setFilters: (filters: any) => void;
}) {
  const allMotivators = unique(profiles.flatMap((profile) => profile.motivators));
  const options = [
    ["segment", "Segmento", ["Todos", ...profiles.map((profile) => profile.name)]],
    ["academicLevel", "Nivel academico", ["Todos", ...unique(profiles.map((profile) => profile.academicLevel))]],
    ["motivator", "Motivador", ["Todos", ...allMotivators]],
    ["painType", "Tipo de dolor", ["Todos", ...painCategories]],
    ["frequency", "Frecuencia", ["Todos", ...unique(profiles.map((profile) => profile.trainingFrequency))]],
    ["urgency", "Urgencia", ["Todos", "Bajo", "Medio", "Alto", "Critico"]],
    ["price", "Sensibilidad precio", ["Todos", "Bajo", "Medio", "Alto", "Critico"]],
    ["modality", "Modalidad", ["Todos", "Presencial", "Virtual", "Semipresencial", "Flexible"]],
    ["certification", "Certificacion", ["Todos", ...unique(profiles.map((profile) => profile.certificationType))]],
    ["status", "Estado", ["Todos", "Activo", "En revision", "Archivado", "Borrador"]]
  ] as const;

  return (
    <div className="customer-filter-grid">
      {options.map(([key, label, values]) => (
        <label key={key}>
          <span>{label}</span>
          <Select value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}>
            {values.map((value) => <option key={value}>{value}</option>)}
          </Select>
        </label>
      ))}
    </div>
  );
}

function ClientProfileCard({ profile, onOpen }: { profile: ClientProfile; onOpen: () => void }) {
  return (
    <article className="client-profile-card card card-pad">
      <div className="client-card-head">
        <div className="client-avatar">{profile.avatar}</div>
        <div>
          <span className="client-status">{profile.status}</span>
          <h3>{profile.name}</h3>
          <p>{profile.shortDescription}</p>
        </div>
      </div>
      <InfoBlock label="Dolor principal" value={profile.mainPain} />
      <InfoBlock label="Motivador" value={profile.mainMotivator} />
      <div className="client-card-metrics">
        <span>Frecuencia: <strong>{profile.trainingFrequency}</strong></span>
        <span>Lealtad: <strong>{profile.loyaltyLevel}</strong></span>
      </div>
      <Button onClick={onOpen}>Ver perfil</Button>
    </article>
  );
}

function EmpathyMap({ profiles, selectedProfile, onSelect, onOpen }: { profiles: ClientProfile[]; selectedProfile: ClientProfile; onSelect: (id: string) => void; onOpen: () => void }) {
  return (
    <section className="empathy-map card card-pad">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Mapa visual</p>
          <h2 style={{ margin: 0 }}>Mapa de empatia comercial</h2>
        </div>
        <Select value={selectedProfile.id} onChange={(event) => onSelect(event.target.value)}>
          {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}
        </Select>
      </div>
      <div className="empathy-layout">
        <MapBubble title="Objeciones" items={selectedProfile.objections.map((item) => item.objection)} area="top" />
        <MapBubble title="Motivadores" items={selectedProfile.motivators.slice(0, 4)} area="left" />
        <div className="map-center">
          <div className="client-avatar is-large">{selectedProfile.avatar}</div>
          <strong>{selectedProfile.name}</strong>
          <span>{selectedProfile.shortDescription}</span>
          <div className="temperature-bar"><i style={{ width: `${selectedProfile.commercialTemperature}%` }} /></div>
          <small>Temperatura comercial {selectedProfile.commercialTemperature}%</small>
          <Button onClick={onOpen}>Abrir ficha</Button>
        </div>
        <MapBubble title="Puntos de dolor" items={selectedProfile.painPoints.map((item) => item.title)} area="right" />
        <MapBubble title="Argumentos de venta" items={selectedProfile.arguments.map((item) => item.title)} area="bottom" />
      </div>
    </section>
  );
}

function MapBubble({ title, items, area }: { title: string; items: string[]; area: string }) {
  return (
    <div className={`map-bubble map-${area}`}>
      <strong>{title}</strong>
      {items.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

function PainHeatMap({ profiles }: { profiles: ClientProfile[] }) {
  const heat = profiles
    .flatMap((profile) => profile.painPoints.map((pain) => pain.title))
    .reduce<Record<string, number>>((acc, pain) => ({ ...acc, [pain]: (acc[pain] ?? 0) + 1 }), {});
  const rows = Object.entries(heat).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <article className="card card-pad pain-heat">
      <p className="eyebrow">Mapa de calor de dolores</p>
      <h2 style={{ margin: 0 }}>Dolores mas repetidos</h2>
      {rows.map(([pain, count]) => (
        <div className="heat-row" key={pain}>
          <span>{pain}</span>
          <strong>{count} perfiles</strong>
          <i style={{ width: `${Math.min(100, count * 25)}%` }} />
        </div>
      ))}
    </article>
  );
}

function CommercialQuickGuide({ profile, onOpen }: { profile: ClientProfile; onOpen: () => void }) {
  return (
    <article className="card card-pad quick-guide">
      <p className="eyebrow">Vista rapida para ejecutivos</p>
      <h2>{profile.name}</h2>
      <InfoBlock label="Que le duele" value={profile.mainPain} />
      <InfoBlock label="Que quiere lograr" value={profile.mainMotivator} />
      <InfoBlock label="Que decirle" value={profile.arguments[0]?.suggestedText ?? "Usar argumento consultivo."} />
      <InfoBlock label="Que evitar" value={profile.avoidSaying.join(". ")} />
      <Button onClick={onOpen}>Ver guia completa</Button>
    </article>
  );
}

function ClientProfileModal({ profile, onClose, onUpdate }: { profile: ClientProfile | null; onClose: () => void; onUpdate: (profile: ClientProfile) => void }) {
  const [tab, setTab] = useState<DetailTab>("quick");
  const [editingPain, setEditingPain] = useState<ClientPainPoint | null>(null);

  if (!profile) return null;

  function archivePain(painId: string) {
    const updated = {
      ...profile!,
      painPoints: profile!.painPoints.map((pain) => pain.id === painId ? { ...pain, status: "Archivado" as const, updatedAt: new Date().toISOString().slice(0, 10) } : pain),
      changeLog: [
        { id: crypto.randomUUID(), user: "Administrador", changedAt: new Date().toISOString(), field: "Punto de dolor", oldValue: "Activo", newValue: "Archivado", reason: "Archivado desde ficha comercial" },
        ...profile!.changeLog
      ]
    };
    onUpdate(updated);
  }

  return (
    <Modal open title={profile.name} description={profile.commercialSummary} onClose={onClose}>
      <div className="profile-detail-header">
        <div className="client-avatar is-large">{profile.avatar}</div>
        <div>
          <span className="client-status">{profile.status}</span>
          <h2>{profile.name}</h2>
          <p>{profile.shortDescription}</p>
        </div>
        <div className="detail-metrics">
          <span>Urgencia <strong>{profile.urgencyLevel}</strong></span>
          <span>Precio <strong>{profile.priceSensitivity}</strong></span>
          <span>Frecuencia <strong>{profile.trainingFrequency}</strong></span>
          <span>Lealtad <strong>{profile.loyaltyLevel}</strong></span>
        </div>
      </div>
      <div className="detail-tabs">
        {[
          ["quick", "Venta rapida"],
          ["pain", "Puntos de dolor"],
          ["motivators", "Motivadores"],
          ["objections", "Objeciones"],
          ["arguments", "Argumentos"],
          ["programs", "Programas"],
          ["messages", "WhatsApp"],
          ["marketing", "Insight Marketing"],
          ["sales", "Guia Ventas"],
          ["history", "Historial"]
        ].map(([id, label]) => <button className={tab === id ? "is-active" : ""} type="button" onClick={() => setTab(id as DetailTab)} key={id}>{label}</button>)}
      </div>
      {tab === "quick" ? <QuickTab profile={profile} /> : null}
      {tab === "pain" ? <PainTab profile={profile} onEdit={setEditingPain} onArchive={archivePain} /> : null}
      {tab === "motivators" ? <ListTab icon={Sparkles} items={profile.motivators} title="Motivadores de compra" /> : null}
      {tab === "objections" ? <ObjectionsTab profile={profile} /> : null}
      {tab === "arguments" ? <ArgumentsTab profile={profile} /> : null}
      {tab === "programs" ? <ProgramsTab profile={profile} /> : null}
      {tab === "messages" ? <MessagesTab profile={profile} /> : null}
      {tab === "marketing" ? <MarketingTab profile={profile} /> : null}
      {tab === "sales" ? <SalesGuideTab profile={profile} /> : null}
      {tab === "history" ? <HistoryTab profile={profile} /> : null}
      <PainEditorModal pain={editingPain} onClose={() => setEditingPain(null)} onSave={(pain) => {
        const updated = { ...profile, painPoints: profile.painPoints.map((item) => item.id === pain.id ? pain : item) };
        onUpdate(updated);
        setEditingPain(null);
      }} />
    </Modal>
  );
}

function QuickTab({ profile }: { profile: ClientProfile }) {
  return (
    <div className="quick-sales-card">
      <InfoBlock label="Que le duele" value={profile.mainPain} />
      <InfoBlock label="Que quiere lograr" value={profile.mainMotivator} />
      <InfoBlock label="Que decirle" value={profile.arguments[0]?.suggestedText ?? ""} />
      <InfoBlock label="Que evitar decirle" value={profile.avoidSaying.join(". ")} />
      <InfoBlock label="Curso recomendado" value={profile.recommendedPrograms[0]?.name ?? "Validar campana vigente"} />
    </div>
  );
}

function PainTab({ profile, onEdit, onArchive }: { profile: ClientProfile; onEdit: (pain: ClientPainPoint) => void; onArchive: (painId: string) => void }) {
  return (
    <div className="pain-card-grid">
      {profile.painPoints.map((pain) => (
        <article className="pain-card" key={pain.id}>
          <span className="client-status">{pain.status}</span>
          <h3>{pain.title}</h3>
          <p>{pain.description}</p>
          <div className="pain-meta"><span>{pain.category}</span><span>{pain.intensity}</span><span>{pain.stage}</span></div>
          <InfoBlock label="Argumento recomendado" value={pain.recommendedArgument} />
          <div className="action-cluster">
            <Button variant="secondary" onClick={() => onEdit(pain)}><Pencil size={16} /> Editar</Button>
            <Button variant="ghost" onClick={() => onEdit({ ...pain, id: crypto.randomUUID(), title: `Copia de ${pain.title}` })}><Copy size={16} /> Duplicar</Button>
            <Button variant="danger" onClick={() => onArchive(pain.id)}><Archive size={16} /> Archivar</Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function PainEditorModal({ pain, onClose, onSave }: { pain: ClientPainPoint | null; onClose: () => void; onSave: (pain: ClientPainPoint) => void }) {
  const [draft, setDraft] = useState<ClientPainPoint | null>(pain);
  useEffect(() => setDraft(pain), [pain]);
  if (!pain || !draft) return null;
  return (
    <Modal open title="Editar punto de dolor" description="Actualiza solo este bloque. El cambio se registrara en historial." onClose={onClose}>
      <form className="editor-grid">
        <label>Titulo<Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Categoria<Select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{painCategories.map((item) => <option key={item}>{item}</option>)}</Select></label>
        <label>Intensidad<Select value={draft.intensity} onChange={(event) => setDraft({ ...draft, intensity: event.target.value as any })}><option>Bajo</option><option>Medio</option><option>Alto</option><option>Critico</option></Select></label>
        <label>Etapa<Select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as any })}><option>Curioso</option><option>Interesado</option><option>Comparando opciones</option><option>Listo para comprar</option><option>Recurrente</option></Select></label>
        <label className="span-2">Descripcion<textarea className="textarea" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <label className="span-2">Argumento recomendado<textarea className="textarea" value={draft.recommendedArgument} onChange={(event) => setDraft({ ...draft, recommendedArgument: event.target.value })} /></label>
      </form>
      <div className="editor-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString().slice(0, 10) })}>Guardar</Button></div>
    </Modal>
  );
}

function ListTab({ title, items, icon: Icon }: { title: string; items: string[]; icon: typeof Sparkles }) {
  return <div className="list-tab"><h3>{title}</h3>{items.map((item) => <span key={item}><Icon size={16} /> {item}</span>)}</div>;
}

function ObjectionsTab({ profile }: { profile: ClientProfile }) {
  return <div className="pain-card-grid">{profile.objections.map((item) => <article className="pain-card" key={item.id}><h3>{item.objection}</h3><InfoBlock label="Que significa realmente" value={item.realMeaning} /><InfoBlock label="Respuesta sugerida" value={item.suggestedResponse} /><div className="pain-meta"><span>Riesgo {item.riskLevel}</span><span>{item.resolver}</span></div></article>)}</div>;
}

function ArgumentsTab({ profile }: { profile: ClientProfile }) {
  return <div className="pain-card-grid">{profile.arguments.map((item) => <article className="pain-card" key={item.id}><h3>{item.title}</h3><InfoBlock label="Situacion" value={item.situation} /><InfoBlock label="Texto sugerido" value={item.suggestedText} /><div className="pain-meta"><span>{item.relatedPain}</span><span>Efectividad {item.effectiveness}</span></div></article>)}</div>;
}

function ProgramsTab({ profile }: { profile: ClientProfile }) {
  return <div className="pain-card-grid">{profile.recommendedPrograms.map((item) => <article className="pain-card" key={item.id}><h3>{item.name}</h3><div className="pain-meta"><span>{item.modality}</span><span>{item.duration}</span><span>{item.certification}</span></div><InfoBlock label="Dolor que resuelve" value={item.solvesPain} /><span className="client-status">Prioridad {item.priority}</span></article>)}</div>;
}

function MessagesTab({ profile }: { profile: ClientProfile }) {
  return <div className="pain-card-grid">{profile.messages.map((item) => <article className="pain-card" key={item.id}><h3>{item.type}</h3><p>{item.text}</p><Button variant="secondary" onClick={() => navigator.clipboard?.writeText(item.text)}><Copy size={16} /> Copiar mensaje</Button></article>)}</div>;
}

function MarketingTab({ profile }: { profile: ClientProfile }) {
  const insight = profile.marketingInsight;
  return <div className="quick-sales-card"><InfoBlock label="Dolor principal" value={insight.mainPain} /><InfoBlock label="Promesa comercial" value={insight.promise} /><InfoBlock label="Angulo de campana" value={insight.campaignAngle} /><InfoBlock label="Gancho sugerido" value={insight.hook} /><InfoBlock label="CTA sugerido" value={insight.cta} /><InfoBlock label="Formato y canales" value={`${insight.format} · ${insight.channels.join(", ")}`} /></div>;
}

function SalesGuideTab({ profile }: { profile: ClientProfile }) {
  const guide = profile.conversationGuide;
  return <div className="quick-sales-card"><InfoBlock label="Inicio de conversacion" value={guide.opening} /><InfoBlock label="Preguntas de diagnostico" value={guide.diagnosticQuestions.join(" / ")} /><InfoBlock label="Dolor probable" value={guide.likelyPain} /><InfoBlock label="Argumento recomendado" value={guide.recommendedArgument} /><InfoBlock label="Objeciones frecuentes" value={guide.frequentObjections.join(", ")} /><InfoBlock label="Cierre sugerido" value={guide.suggestedClose} /></div>;
}

function HistoryTab({ profile }: { profile: ClientProfile }) {
  return <div className="pain-card-grid">{profile.changeLog.length ? profile.changeLog.map((item) => <article className="pain-card" key={item.id}><h3>{item.field}</h3><p>{item.reason}</p><div className="pain-meta"><span>{item.user}</span><span>{new Date(item.changedAt).toLocaleString("es-PE")}</span></div><InfoBlock label="Antes" value={item.oldValue} /><InfoBlock label="Despues" value={item.newValue} /></article>) : <div className="empty-client-state"><History size={24} /><strong>Sin cambios registrados</strong><span>Las ediciones apareceran aqui.</span></div>}</div>;
}

function CreateProfileModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (profile: ClientProfile) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [area, setArea] = useState("Salud");
  const [summary, setSummary] = useState("");

  if (!open) return null;

  function createProfile() {
    const newProfile: ClientProfile = {
      ...clientProfiles[0],
      id: crypto.randomUUID(),
      name: name || "Nuevo perfil",
      avatar: (name || "NP").slice(0, 2).toUpperCase(),
      professionalArea: area,
      shortDescription: summary || "Perfil en construccion.",
      commercialSummary: summary || "Perfil comercial pendiente de completar.",
      status: "Borrador",
      painPoints: [],
      motivators: [],
      objections: [],
      arguments: [],
      recommendedPrograms: [],
      messages: [],
      updatedAt: new Date().toISOString().slice(0, 10),
      changeLog: []
    };
    onCreate(newProfile);
    onClose();
  }

  return (
    <Modal open title="Crear perfil" description="Flujo guiado para ordenar conocimiento comercial por segmento." onClose={onClose}>
      <div className="settings-stepper">{[1, 2, 3, 4, 5, 6, 7].map((item) => <span className={step >= item ? "is-active" : ""} key={item}>{item}</span>)}</div>
      {step === 1 ? <form className="editor-grid"><label>Nombre del perfil<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Area profesional<Input value={area} onChange={(event) => setArea(event.target.value)} /></label><label className="span-2">Descripcion corta<textarea className="textarea" value={summary} onChange={(event) => setSummary(event.target.value)} /></label></form> : <div className="empty-client-state"><Sparkles size={24} /><strong>Paso {step}</strong><span>Este bloque quedara listo para cargar informacion editable desde la ficha.</span></div>}
      <div className="editor-actions"><Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(step - 1)}>{step === 1 ? "Cancelar" : "Atras"}</Button>{step < 7 ? <Button onClick={() => setStep(step + 1)}>Continuar</Button> : <Button onClick={createProfile}>Confirmar creacion</Button>}</div>
    </Modal>
  );
}

function CompareProfilesModal({ open, profiles, onClose }: { open: boolean; profiles: ClientProfile[]; onClose: () => void }) {
  const [leftId, setLeftId] = useState(profiles[1]?.id ?? profiles[0]?.id ?? "");
  const [rightId, setRightId] = useState(profiles[3]?.id ?? profiles[0]?.id ?? "");
  if (!open) return null;
  const left = profiles.find((profile) => profile.id === leftId) ?? profiles[0];
  const right = profiles.find((profile) => profile.id === rightId) ?? profiles[0];
  const commonMotivators = left.motivators.filter((item) => right.motivators.includes(item));
  return (
    <Modal open title="Comparar perfiles" description="Diferencia argumentos para no vender igual a segmentos distintos." onClose={onClose}>
      <div className="compare-selectors"><Select value={left.id} onChange={(event) => setLeftId(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</Select><Select value={right.id} onChange={(event) => setRightId(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</Select></div>
      <div className="compare-grid">
        <CompareColumn profile={left} />
        <CompareColumn profile={right} />
      </div>
      <article className="pain-card"><h3>Motivadores comunes</h3><p>{commonMotivators.length ? commonMotivators.join(", ") : "No hay motivadores identicos; adaptar discurso."}</p></article>
    </Modal>
  );
}

function CompareColumn({ profile }: { profile: ClientProfile }) {
  return <article className="pain-card"><h3>{profile.name}</h3><InfoBlock label="Dolor principal" value={profile.mainPain} /><InfoBlock label="Precio" value={profile.priceSensitivity} /><InfoBlock label="Frecuencia" value={profile.trainingFrequency} /><InfoBlock label="Argumento" value={profile.arguments[0]?.title ?? "Pendiente"} /></article>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <div className="info-block"><span>{label}</span><p>{value}</p></div>;
}

function matches(filter: string, value: string) {
  return filter === "Todos" || value.toLowerCase().includes(filter.toLowerCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

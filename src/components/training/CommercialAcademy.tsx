"use client";

import { BookOpenCheck, CheckCircle2, ClipboardList, FileText, GraduationCap, PlayCircle, Plus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { getCommercialState } from "@/lib/commercial/store";

const learningPaths = [
  {
    id: "onboarding",
    name: "Inducción Comercial Inicial",
    objective: "Dominar cultura, productos, Kommo, registro de ventas, pagos, validación e incidencias.",
    audience: "Nuevos ejecutivos",
    duration: "Semana 1",
    modules: [
      "Bienvenida y cultura Rebagliati",
      "Organigrama y áreas internas",
      "Productos que vendemos",
      "Modalidades de estudio",
      "Proceso comercial completo",
      "Uso de WhatsApp y Kommo",
      "Registro correcto de ventas",
      "Pagos, validación y sustentos",
      "Manejo de objeciones",
      "Seguimiento, cierre y postventa",
      "Incidencias y errores frecuentes",
      "Evaluación final"
    ],
    progress: 35,
    status: "Activa"
  },
  {
    id: "sales-record",
    name: "Registro correcto de ventas",
    objective: "Evitar observaciones por datos incompletos, modalidad incorrecta o evidencia insuficiente.",
    audience: "Ventas y validación",
    duration: "2 h",
    modules: ["Datos del participante", "Modalidad y tipo de cobro", "Evidencias", "Errores frecuentes", "Evaluación del módulo"],
    progress: 62,
    status: "Activa"
  },
  {
    id: "kommo",
    name: "Uso correcto de Kommo",
    objective: "Ordenar seguimiento, tiempos de respuesta y trazabilidad de conversaciones.",
    audience: "Ventas, líderes y jefatura",
    duration: "3 h",
    modules: ["Embudo", "Mensajes", "Notas", "Tareas", "Buenas prácticas"],
    progress: 48,
    status: "En revisión"
  }
];

const contentLibrary = [
  { title: "Speech de primer contacto", type: "Texto interno", area: "Ventas", status: "Publicado" },
  { title: "Checklist de evidencia para ventas", type: "PDF", area: "Validación", status: "Publicado" },
  { title: "Objeciones por perfil de cliente", type: "Plantilla", area: "Mapa de Clientes", status: "Publicado" },
  { title: "Proceso de pagos y derivación", type: "Video externo", area: "Administración", status: "Pendiente de actualización" }
];

export function CommercialAcademy() {
  const [state] = useState(getCommercialState);
  const [activePathId, setActivePathId] = useState("onboarding");
  const activePath = learningPaths.find((path) => path.id === activePathId) ?? learningPaths[0];
  const activeExecutives = useMemo(() => state.executives.filter((item) => item.status === "Activo"), [state.executives]);
  const averageProgress = Math.round(learningPaths.reduce((sum, path) => sum + path.progress, 0) / learningPaths.length);

  return (
    <div className="academy-page page-stack">
      <section className="card academy-hero">
        <div>
          <p className="eyebrow">Capacitación interna y refuerzo comercial</p>
          <h2>Academia Comercial Interna</h2>
          <p className="muted">Rutas, lecciones, materiales, evaluaciones y seguimiento para estandarizar el proceso comercial.</p>
        </div>
        <div className="academy-actions">
          <button className="primary-button"><Plus size={17} /> Crear ruta</button>
          <button className="ghost-button"><FileText size={17} /> Crear contenido</button>
        </div>
      </section>

      <section className="goal-kpi-grid academy-kpis">
        <AcademyKpi label="Avance general" value={`${averageProgress}%`} icon={<GraduationCap size={20} />} />
        <AcademyKpi label="Rutas activas" value={String(learningPaths.filter((item) => item.status === "Activa").length)} icon={<BookOpenCheck size={20} />} />
        <AcademyKpi label="Ejecutivos activos" value={String(activeExecutives.length)} icon={<UsersRound size={20} />} />
        <AcademyKpi label="Evaluaciones pendientes" value="2" icon={<ClipboardList size={20} />} />
      </section>

      <section className="academy-layout">
        <article className="card academy-panel">
          <div className="academy-section-title">
            <div>
              <p className="eyebrow">Rutas de capacitación</p>
              <h3>Camino de aprendizaje</h3>
            </div>
          </div>
          <div className="academy-path-list">
            {learningPaths.map((path) => (
              <button key={path.id} className={`academy-path ${path.id === activePathId ? "active" : ""}`} onClick={() => setActivePathId(path.id)}>
                <span>{path.name}</span>
                <small>{path.audience} · {path.duration}</small>
                <strong>{path.progress}%</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="card academy-panel">
          <p className="eyebrow">Ruta seleccionada</p>
          <h3>{activePath.name}</h3>
          <p className="muted">{activePath.objective}</p>
          <div className="academy-progress">
            <span style={{ width: `${activePath.progress}%` }} />
          </div>
          <div className="academy-module-grid">
            {activePath.modules.map((module, index) => (
              <div key={module} className="academy-module">
                {index < Math.round(activePath.modules.length * (activePath.progress / 100)) ? <CheckCircle2 size={17} /> : <PlayCircle size={17} />}
                <span>{module}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="academy-layout">
        <article className="card academy-panel">
          <p className="eyebrow">Biblioteca de contenidos</p>
          <h3>Materiales y plantillas</h3>
          <div className="academy-content-list">
            {contentLibrary.map((item) => (
              <div key={item.title} className="academy-content-row">
                <FileText size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.type} · {item.area}</small>
                </div>
                <span className="badge">{item.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card academy-panel">
          <p className="eyebrow">Progreso del equipo</p>
          <h3>Seguimiento por ejecutivo</h3>
          <div className="academy-team-list">
            {activeExecutives.slice(0, 6).map((executive, index) => {
              const progress = [72, 64, 58, 45, 38, 31][index] ?? 25;
              return (
                <div key={executive.id} className="academy-team-row">
                  {executive.photoUrl ? <img className="avatar" src={executive.photoUrl} alt={executive.fullName} /> : <div className="avatar">{executive.fullName.slice(0, 2)}</div>}
                  <div>
                    <strong>{executive.fullName}</strong>
                    <span><i style={{ width: `${progress}%` }} /></span>
                  </div>
                  <b>{progress}%</b>
                </div>
              );
            })}
            {!activeExecutives.length ? <p className="muted">Aún no hay ejecutivos activos vinculados.</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function AcademyKpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="card metric">
      <span className="badge">{icon}{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

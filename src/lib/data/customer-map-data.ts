import type { ClientProfile } from "@/types/customer-map";

const today = "2026-06-11";

export const painCategories = [
  "Laboral",
  "Economico",
  "Academico",
  "Procedimental",
  "Curricular",
  "Certificacion",
  "Reconocimiento profesional",
  "Independencia laboral",
  "Confianza institucional",
  "Modalidad / tiempo",
  "Precio"
];

export const clientProfiles: ClientProfile[] = [
  {
    id: "medicos",
    name: "Medicos",
    shortDescription: "Profesionales que buscan vigencia, respaldo academico y fortalecimiento curricular.",
    commercialSummary: "Necesitan mantenerse actualizados, sumar certificaciones y fortalecer su CV para recertificacion, cargos jefaturales o crecimiento profesional.",
    avatar: "MD",
    professionalArea: "Salud",
    academicLevel: "Profesional universitario",
    mainPain: "Recertificacion, actualizacion constante y respaldo institucional.",
    mainMotivator: "Certificaciones, horas academicas, creditos y mejora curricular.",
    trainingFrequency: "Capacitacion continua anual y recertificacion cada 5 anos.",
    loyaltyLevel: "Alta si perciben respaldo academico e institucional.",
    urgencyLevel: "Critico",
    priceSensitivity: "Medio",
    preferredModality: "Flexible",
    certificationType: "Certificacion con horas o creditos academicos",
    commercialTemperature: 86,
    status: "Activo",
    channels: ["WhatsApp", "Referidos", "Correo", "Eventos academicos"],
    motivators: ["Recertificacion", "Creditos academicos", "Certificaciones respaldadas", "Actualizacion de CV", "Especializacion por area"],
    needs: ["Confianza institucional", "Contenido actualizado", "Certificacion formal", "Docentes expertos"],
    avoidSaying: ["Es solo un curso rapido", "No mencionar respaldo ni horas academicas"],
    painPoints: [
      {
        id: "med-cv",
        title: "Necesita actualizar su CV",
        description: "Busca cursos o diplomados que fortalezcan su perfil para continuidad laboral, ascensos o cargos jefaturales.",
        category: "Curricular",
        intensity: "Alto",
        stage: "Listo para comprar",
        recommendedArgument: "Este programa le ayuda a fortalecer su CV con certificacion respaldada y horas academicas utiles para su crecimiento profesional.",
        relatedCourses: ["Diplomado en Salud Ocupacional", "Auditoria Medica"],
        status: "Activo",
        updatedAt: today
      },
      {
        id: "med-recert",
        title: "Debe cumplir recertificacion profesional",
        description: "Requiere formacion verificable para sostener su vigencia profesional.",
        category: "Certificacion",
        intensity: "Critico",
        stage: "Listo para comprar",
        recommendedArgument: "Doctor, este programa suma formacion util para mantener su perfil actualizado con respaldo academico.",
        relatedCourses: ["Emergencias y Desastres", "Gestion en Salud"],
        status: "Activo",
        updatedAt: today
      }
    ],
    objections: [
      {
        id: "med-cert",
        objection: "Necesito saber si la certificacion me sirve.",
        realMeaning: "Busca respaldo formal antes de invertir tiempo y dinero.",
        suggestedResponse: "Doctor, le envio el detalle de certificacion, horas y respaldo para que valide que aporta a su CV profesional.",
        riskLevel: "Alto",
        resolver: "Ficha de certificacion y horas academicas"
      }
    ],
    arguments: [
      {
        id: "med-arg-recert",
        title: "Argumento de recertificacion",
        situation: "Cuando pregunta por certificacion, horas o respaldo.",
        suggestedText: "Doctor, este programa le permite fortalecer su actualizacion profesional y sumar formacion util para mantener su CV competitivo dentro de su especialidad.",
        relatedPain: "Debe cumplir recertificacion profesional",
        effectiveness: "Alto"
      }
    ],
    recommendedPrograms: [
      { id: "med-p1", name: "Auditoria Medica", modality: "Virtual", duration: "3 meses", certification: "Horas academicas", solvesPain: "Actualizacion de CV", priority: "Alto" },
      { id: "med-p2", name: "Gestion en Salud", modality: "Semipresencial", duration: "4 meses", certification: "Diploma", solvesPain: "Cargos jefaturales", priority: "Alto" }
    ],
    messages: [
      { id: "med-msg-1", type: "Primer contacto", text: "Doctor, este programa esta orientado a fortalecer su actualizacion profesional con certificacion util para su CV y crecimiento dentro del sector salud." },
      { id: "med-msg-2", type: "Respuesta a certificacion", text: "Le comparto el detalle de certificacion, horas y respaldo para que pueda validar el aporte academico del programa." }
    ],
    marketingInsight: {
      mainPain: "Necesidad de vigencia profesional y respaldo academico.",
      promise: "Actualiza tu perfil medico con certificacion util y respaldo institucional.",
      campaignAngle: "Recertificacion y crecimiento profesional sin detener tu agenda.",
      hook: "Fortalece tu CV medico con formacion certificada.",
      cta: "Solicita el detalle academico.",
      format: "Carrusel tecnico + testimonio",
      channels: ["Meta Ads", "LinkedIn", "WhatsApp"]
    },
    conversationGuide: {
      opening: "Doctor, para orientarlo mejor, esta buscando actualizar CV, recertificacion o fortalecer una especialidad?",
      diagnosticQuestions: ["Que certificacion necesita sumar?", "Busca horas academicas o un diplomado mas completo?", "Para que fecha necesita presentar su CV?"],
      likelyPain: "Certificacion y actualizacion curricular.",
      recommendedArgument: "Enfatizar respaldo, horas, aplicabilidad y vigencia profesional.",
      frequentObjections: ["Certificacion", "Tiempo", "Respaldo"],
      suggestedClose: "Le envio la malla y certificacion para reservar su vacante con la promocion vigente."
    },
    updatedAt: today,
    changeLog: []
  },
  {
    id: "lic-enfermeria",
    name: "Licenciados en Enfermeria",
    shortDescription: "Buscan capacitacion accesible, practica y certificada para mejorar su desempeno y CV.",
    commercialSummary: "Valoran cursos aplicables al cuidado del paciente, mejora laboral, registros profesionales, ascensos y certificacion respaldada.",
    avatar: "LE",
    professionalArea: "Salud",
    academicLevel: "Profesional universitario",
    mainPain: "Necesitan mejorar CV, desempeno practico y oportunidades laborales.",
    mainMotivator: "Capacitacion accesible, practica, certificada y util para ascensos.",
    trainingFrequency: "Una o dos veces al ano.",
    loyaltyLevel: "Alta hacia instituciones de salud con capacitacion certificada.",
    urgencyLevel: "Alto",
    priceSensitivity: "Medio",
    preferredModality: "Flexible",
    certificationType: "Certificacion respaldada",
    commercialTemperature: 82,
    status: "Activo",
    channels: ["WhatsApp", "Meta Ads", "Referidos"],
    motivators: ["Capacitacion accesible", "Conocimientos practicos", "Mejora salarial", "Registros profesionales", "Concursos jefaturales", "Eventos auspiciados"],
    needs: ["Aplicacion practica", "Certificacion", "Mejor desempeno", "Flexibilidad"],
    avoidSaying: ["Solo teoria", "No enfatizar aplicacion al paciente"],
    painPoints: [
      {
        id: "lic-cv",
        title: "Fortalecer perfil profesional",
        description: "Busca actualizar CV para continuidad laboral, concursos o ascensos.",
        category: "Curricular",
        intensity: "Alto",
        stage: "Interesado",
        recommendedArgument: "Licenciada, este programa fortalece su CV con conocimientos practicos aplicables al cuidado del paciente.",
        relatedCourses: ["Cuidados Intensivos", "Emergencias y Desastres"],
        status: "Activo",
        updatedAt: today
      },
      {
        id: "lic-practica",
        title: "Necesita conocimientos practicos aplicables",
        description: "Valora procedimientos y contenidos que pueda usar en el trabajo diario.",
        category: "Procedimental",
        intensity: "Alto",
        stage: "Comparando opciones",
        recommendedArgument: "La malla esta pensada para fortalecer habilidades aplicables en el entorno asistencial.",
        relatedCourses: ["Central de Esterilizacion", "Inyectoterapia"],
        status: "Activo",
        updatedAt: today
      }
    ],
    objections: [
      { id: "lic-price", objection: "Esta caro.", realMeaning: "Aun no percibe retorno laboral o valor practico.", suggestedResponse: "Entiendo. Justamente este programa busca darle herramientas practicas y certificacion util para fortalecer su perfil profesional.", riskLevel: "Medio", resolver: "Beneficio laboral y facilidades" }
    ],
    arguments: [
      { id: "lic-arg-cv", title: "Argumento curricular-practico", situation: "Cuando busca mejorar CV o desempeno.", suggestedText: "Licenciada, este programa puede ayudarle a fortalecer su perfil profesional con conocimientos practicos aplicables al cuidado del paciente y certificacion util para su CV.", relatedPain: "Fortalecer perfil profesional", effectiveness: "Alto" }
    ],
    recommendedPrograms: [
      { id: "lic-p1", name: "Cuidados Intensivos", modality: "Virtual", duration: "2 meses", certification: "Certificado", solvesPain: "Mejora profesional", priority: "Alto" },
      { id: "lic-p2", name: "Emergencias y Desastres", modality: "Semipresencial", duration: "2 meses", certification: "Certificado", solvesPain: "Procedimientos practicos", priority: "Alto" }
    ],
    messages: [
      { id: "lic-msg-1", type: "Primer contacto", text: "Licenciada, este programa puede ayudarle a fortalecer su perfil profesional con conocimientos practicos aplicables al cuidado del paciente y certificacion util para su CV." },
      { id: "lic-msg-2", type: "Respuesta a precio", text: "Entiendo su consulta. El valor esta en que obtiene formacion aplicable y certificacion que puede sumar a su crecimiento profesional." }
    ],
    marketingInsight: { mainPain: "Mejorar CV y practica asistencial.", promise: "Capacitate con contenido practico y certificacion util.", campaignAngle: "Impulsa tu crecimiento en enfermeria con formacion aplicable.", hook: "Fortalece tu perfil profesional como licenciada.", cta: "Solicita informacion por WhatsApp.", format: "Reel educativo + carrusel", channels: ["Meta Ads", "WhatsApp"] },
    conversationGuide: { opening: "Licenciada, esta buscando actualizar su CV, mejorar practica o postular a una mejor oportunidad?", diagnosticQuestions: ["Que area desea fortalecer?", "Busca certificado para CV o conocimientos practicos?", "Prefiere modalidad virtual o semipresencial?"], likelyPain: "CV, practica y mejora laboral.", recommendedArgument: "Enfatizar aplicabilidad, certificacion y crecimiento laboral.", frequentObjections: ["Precio", "Tiempo", "Modalidad"], suggestedClose: "Puedo enviarle la malla y separar su vacante con la tarifa vigente." },
    updatedAt: today,
    changeLog: []
  },
  {
    id: "obstetras",
    name: "Obstetras",
    shortDescription: "Buscan flexibilidad, tecnicas innovadoras y opciones para mejorar ingresos o independencia.",
    commercialSummary: "Valoran formacion actualizada, horarios flexibles, mejora remunerativa y herramientas para consultorios o consejerias particulares.",
    avatar: "OB",
    professionalArea: "Salud",
    academicLevel: "Profesional universitario",
    mainPain: "Necesitan diferenciarse, actualizar tecnicas y ampliar oportunidades laborales.",
    mainMotivator: "Flexibilidad, mejora remunerativa, primeras oportunidades y desarrollo independiente.",
    trainingFrequency: "Una vez al ano o por campana laboral.",
    loyaltyLevel: "Media-alta si el programa es aplicable y flexible.",
    urgencyLevel: "Alto",
    priceSensitivity: "Medio",
    preferredModality: "Flexible",
    certificationType: "Certificacion practica",
    commercialTemperature: 76,
    status: "Activo",
    channels: ["Meta Ads", "WhatsApp", "Comunidad profesional"],
    motivators: ["Flexibilidad horaria", "Tecnicas innovadoras", "Mejora remunerativa", "Primeras oportunidades laborales", "Consultorios particulares"],
    needs: ["Horarios flexibles", "Aplicacion practica", "Diferenciacion profesional"],
    avoidSaying: ["No hablar solo de teoria", "No ignorar independencia laboral"],
    painPoints: [
      { id: "obs-flex", title: "Necesita flexibilidad horaria", description: "Puede trabajar por turnos y necesita estudiar sin afectar su agenda.", category: "Modalidad / tiempo", intensity: "Alto", stage: "Comparando opciones", recommendedArgument: "La modalidad flexible le permite avanzar sin detener su actividad profesional.", relatedCourses: ["Psicoprofilaxis Obstetrica", "Monitoreo Fetal"], status: "Activo", updatedAt: today },
      { id: "obs-ind", title: "Busca independencia laboral", description: "Quiere abrir consultorios, consejerias o servicios particulares.", category: "Independencia laboral", intensity: "Alto", stage: "Interesado", recommendedArgument: "Este programa le ayuda a sumar herramientas para diferenciar su servicio profesional.", relatedCourses: ["Consejeria en Salud Sexual", "Psicoprofilaxis"], status: "Activo", updatedAt: today }
    ],
    objections: [{ id: "obs-time", objection: "No tengo tiempo.", realMeaning: "Necesita claridad de modalidad y carga academica.", suggestedResponse: "Precisamente la modalidad esta pensada para profesionales con agenda activa, con acceso flexible al contenido.", riskLevel: "Medio", resolver: "Modalidad flexible" }],
    arguments: [{ id: "obs-arg-flex", title: "Argumento de flexibilidad", situation: "Cuando menciona turnos o falta de tiempo.", suggestedText: "Este programa le permite actualizarse con una modalidad flexible y aplicar herramientas utiles para ampliar sus oportunidades laborales.", relatedPain: "Necesita flexibilidad horaria", effectiveness: "Alto" }],
    recommendedPrograms: [
      { id: "obs-p1", name: "Psicoprofilaxis Obstetrica", modality: "Virtual", duration: "2 meses", certification: "Certificado", solvesPain: "Independencia laboral", priority: "Alto" },
      { id: "obs-p2", name: "Monitoreo Fetal", modality: "Semipresencial", duration: "1 mes", certification: "Certificado", solvesPain: "Tecnicas innovadoras", priority: "Alto" }
    ],
    messages: [{ id: "obs-msg-1", type: "Primer contacto", text: "Obstetra, este programa esta pensado para actualizar sus tecnicas y fortalecer oportunidades laborales con una modalidad flexible." }],
    marketingInsight: { mainPain: "Flexibilidad y mejora laboral.", promise: "Actualizate sin detener tu agenda profesional.", campaignAngle: "Tecnicas actuales para ampliar tus oportunidades.", hook: "Fortalece tu perfil obstetrico con formacion flexible.", cta: "Consulta la malla por WhatsApp.", format: "Video corto + carrusel", channels: ["Meta Ads", "WhatsApp"] },
    conversationGuide: { opening: "Esta buscando actualizar tecnicas, mejorar ingresos o fortalecer un servicio particular?", diagnosticQuestions: ["Que horario le acomoda?", "Busca aplicar esto en trabajo o consultorio?", "Prefiere virtual o semipresencial?"], likelyPain: "Flexibilidad e independencia.", recommendedArgument: "Enfatizar modalidad, aplicacion practica y oportunidades.", frequentObjections: ["Tiempo", "Precio"], suggestedClose: "Le envio la malla y opciones de horario para que elija la que mejor se adapta." },
    updatedAt: today,
    changeLog: []
  },
  {
    id: "tecnicos-enfermeria",
    name: "Tecnicos en Enfermeria",
    shortDescription: "Buscan certificarse rapido, aprender procedimientos practicos y mejorar ingresos.",
    commercialSummary: "Quieren escalar a trabajos con mejor remuneracion, conseguir primeras oportunidades y acceder a certificados economicos en menor tiempo.",
    avatar: "TE",
    professionalArea: "Salud",
    academicLevel: "Tecnico",
    mainPain: "Necesitan mejores oportunidades laborales y certificacion practica accesible.",
    mainMotivator: "Costos economicos, certificados rapidos, procedimientos practicos y primer empleo.",
    trainingFrequency: "Por necesidad laboral o campanas de empleabilidad.",
    loyaltyLevel: "Media si el costo y la utilidad practica son claros.",
    urgencyLevel: "Alto",
    priceSensitivity: "Alto",
    preferredModality: "Flexible",
    certificationType: "Certificado en menor tiempo",
    commercialTemperature: 88,
    status: "Activo",
    channels: ["WhatsApp", "Meta Ads", "TikTok"],
    motivators: ["Costos economicos", "Certificados en menor tiempo", "Procedimientos practicos", "Ascenso laboral", "Primer empleo"],
    needs: ["Precio accesible", "Rapidez", "Practica", "Empleabilidad"],
    avoidSaying: ["Lenguaje demasiado tecnico", "Enfocar solo en teoria"],
    painPoints: [
      { id: "tec-salario", title: "Quiere mejorar sus ingresos", description: "Busca habilidades certificables para acceder a mejores oportunidades laborales.", category: "Laboral", intensity: "Alto", stage: "Interesado", recommendedArgument: "Este curso fortalece habilidades practicas que pueden mejorar su perfil laboral en menor tiempo.", relatedCourses: ["Auxiliar de Enfermeria", "Central de Esterilizacion"], status: "Activo", updatedAt: today },
      { id: "tec-precio", title: "Alta sensibilidad al precio", description: "Compara costos, duracion y facilidad de pago antes de decidir.", category: "Precio", intensity: "Alto", stage: "Comparando opciones", recommendedArgument: "La inversion es accesible y esta orientada a una certificacion practica que puede usar para su crecimiento laboral.", relatedCourses: ["Inyectoterapia", "Toma de muestras"], status: "Activo", updatedAt: today }
    ],
    objections: [{ id: "tec-carop", objection: "Esta caro.", realMeaning: "No ve aun retorno o necesita facilidad economica.", suggestedResponse: "Entiendo. Este curso esta pensado para que pueda certificarse en menor tiempo y fortalecer habilidades practicas utiles para mejores oportunidades.", riskLevel: "Alto", resolver: "Facilidades, duracion y utilidad practica" }],
    arguments: [{ id: "tec-arg-practico", title: "Argumento practico-laboral", situation: "Cuando busca primer empleo, ascenso o precio.", suggestedText: "Este curso esta disenado para que pueda fortalecer sus habilidades practicas y mejorar su perfil laboral en menos tiempo.", relatedPain: "Quiere mejorar sus ingresos", effectiveness: "Alto" }],
    recommendedPrograms: [
      { id: "tec-p1", name: "Auxiliar de Enfermeria", modality: "Semipresencial", duration: "3 meses", certification: "Certificado", solvesPain: "Primer empleo", priority: "Alto" },
      { id: "tec-p2", name: "Central de Esterilizacion", modality: "Virtual", duration: "1 mes", certification: "Certificado", solvesPain: "Mejora laboral", priority: "Alto" },
      { id: "tec-p3", name: "Inyectoterapia", modality: "Presencial", duration: "Corto", certification: "Certificado", solvesPain: "Procedimiento practico", priority: "Alto" },
      { id: "tec-p4", name: "Toma de muestras", modality: "Presencial", duration: "Corto", certification: "Certificado", solvesPain: "Habilidad practica", priority: "Medio" }
    ],
    messages: [{ id: "tec-msg-1", type: "Primer contacto", text: "Este curso esta pensado para tecnicos que desean certificarse en menor tiempo, aprender procedimientos practicos y mejorar su perfil laboral." }, { id: "tec-msg-2", type: "Respuesta a precio", text: "Tenemos una alternativa accesible y orientada a que pueda sumar una habilidad practica certificada para sus oportunidades laborales." }],
    marketingInsight: { mainPain: "Mejorar ingresos y empleabilidad.", promise: "Certificate rapido en habilidades practicas que suman a tu perfil laboral.", campaignAngle: "Aprende procedimientos practicos y mejora tus oportunidades.", hook: "Certificado en menor tiempo para crecer laboralmente.", cta: "Pregunta por la promocion por WhatsApp.", format: "Reel demostrativo", channels: ["Meta Ads", "TikTok", "WhatsApp"] },
    conversationGuide: { opening: "Esta buscando el curso para primer empleo, ascenso o aprender un procedimiento especifico?", diagnosticQuestions: ["Que habilidad quiere fortalecer?", "Busca algo corto o un programa completo?", "Que presupuesto tiene pensado?"], likelyPain: "Precio, rapidez y utilidad practica.", recommendedArgument: "Hablar claro, practico y con enfoque laboral.", frequentObjections: ["Precio", "Duracion"], suggestedClose: "Le envio las opciones mas cortas y accesibles para que elija la que mejor encaja." },
    updatedAt: today,
    changeLog: []
  },
  {
    id: "publico-general",
    name: "Publico en General",
    shortDescription: "Personas que buscan aprender un oficio, generar ingresos y acceder sin barreras academicas.",
    commercialSummary: "Valoran acceso sin examen inicial, diploma en menor tiempo, costos economicos y habilidades aplicables para ingresos.",
    avatar: "PG",
    professionalArea: "General",
    academicLevel: "Sin requisito especifico",
    mainPain: "Quiere aprender algo util para generar ingresos o iniciar una nueva oportunidad.",
    mainMotivator: "Aprender un oficio, diploma rapido, acceso simple y costo economico.",
    trainingFrequency: "Por oportunidad, necesidad economica o interes personal.",
    loyaltyLevel: "Media si percibe resultado rapido y apoyo.",
    urgencyLevel: "Medio",
    priceSensitivity: "Alto",
    preferredModality: "Flexible",
    certificationType: "Diploma en menor tiempo",
    commercialTemperature: 72,
    status: "Activo",
    channels: ["Meta Ads", "WhatsApp", "TikTok"],
    motivators: ["Aprender un oficio", "Obtener ingresos", "Acceso sin examen inicial", "Diploma en menor tiempo", "Costos economicos"],
    needs: ["Claridad", "Costo bajo", "Aprendizaje aplicable", "Rapidez"],
    avoidSaying: ["Lenguaje academico complejo", "Requisitos innecesarios"],
    painPoints: [{ id: "gen-oficio", title: "Quiere aprender un oficio para obtener ingresos", description: "Busca una habilidad aplicable sin barreras academicas.", category: "Laboral", intensity: "Alto", stage: "Curioso", recommendedArgument: "Este curso esta pensado para aprender una habilidad aplicable en menor tiempo y sin examen inicial.", relatedCourses: ["Cosmiatria", "Inyectoterapia", "Primeros auxilios"], status: "Activo", updatedAt: today }],
    objections: [{ id: "gen-duda", objection: "No se si podre aprender.", realMeaning: "Necesita seguridad y explicacion simple del proceso.", suggestedResponse: "El curso esta disenado para avanzar paso a paso, sin examen inicial y con acompanamiento para aprender desde la base.", riskLevel: "Medio", resolver: "Acceso simple y acompanamiento" }],
    arguments: [{ id: "gen-arg-oficio", title: "Argumento de oficio e ingreso", situation: "Cuando busca una alternativa rapida y aplicable.", suggestedText: "Este curso esta pensado para personas que desean aprender un oficio de manera accesible, sin necesidad de examen inicial y con una certificacion en menor tiempo.", relatedPain: "Quiere aprender un oficio para obtener ingresos", effectiveness: "Alto" }],
    recommendedPrograms: [{ id: "gen-p1", name: "Primeros auxilios", modality: "Virtual", duration: "Corto", certification: "Certificado", solvesPain: "Habilidad aplicable", priority: "Medio" }],
    messages: [{ id: "gen-msg-1", type: "Primer contacto", text: "Este curso puede ayudarle a aprender una habilidad aplicable en menor tiempo, sin examen inicial y con una certificacion que respalde su aprendizaje." }],
    marketingInsight: { mainPain: "Quiere aprender un oficio para obtener ingresos.", promise: "Aprende una habilidad aplicable en menor tiempo y con acceso flexible.", campaignAngle: "Empieza a construir una nueva oportunidad laboral sin examen inicial.", hook: "Aprende desde cero y certificate en menor tiempo.", cta: "Solicita informacion por WhatsApp.", format: "Video testimonial", channels: ["Meta Ads", "TikTok"] },
    conversationGuide: { opening: "Esta buscando aprender por trabajo, ingresos o interes personal?", diagnosticQuestions: ["Tiene experiencia previa?", "Busca algo corto?", "Prefiere virtual o presencial?"], likelyPain: "Acceso, precio y confianza.", recommendedArgument: "Simple, directo y enfocado en aprender desde cero.", frequentObjections: ["Precio", "No tengo experiencia"], suggestedClose: "Le envio una opcion accesible para empezar desde cero." },
    updatedAt: today,
    changeLog: []
  },
  {
    id: "publico-extranjero",
    name: "Publico Extranjero",
    shortDescription: "Busca modalidad virtual, mejor posicion laboral y confianza institucional desde otro pais.",
    commercialSummary: "Valora accesibilidad economica, docentes diversos, intercambio de conocimiento y una institucion posicionada.",
    avatar: "EX",
    professionalArea: "Internacional",
    academicLevel: "Variable",
    mainPain: "Necesita estudiar a distancia con confianza y aplicabilidad laboral.",
    mainMotivator: "Modalidad virtual, mejores puestos, accesibilidad economica y confianza institucional.",
    trainingFrequency: "Segun campana laboral o disponibilidad virtual.",
    loyaltyLevel: "Alta si la experiencia virtual es confiable.",
    urgencyLevel: "Medio",
    priceSensitivity: "Medio",
    preferredModality: "Virtual",
    certificationType: "Certificacion virtual respaldada",
    commercialTemperature: 74,
    status: "Activo",
    channels: ["WhatsApp", "Meta Ads", "Correo"],
    motivators: ["Modalidad virtual", "Mejores puestos laborales", "Accesibilidad economica", "Institucion posicionada", "Docentes de distintas nacionalidades"],
    needs: ["Confianza", "Virtualidad", "Claridad de pago", "Certificacion digital"],
    avoidSaying: ["Solo presencial", "No aclarar validez o modalidad"],
    painPoints: [{ id: "ext-virtual", title: "Necesita modalidad virtual confiable", description: "Estudia desde otro pais y requiere acceso, soporte y certificacion clara.", category: "Modalidad / tiempo", intensity: "Alto", stage: "Comparando opciones", recommendedArgument: "La modalidad virtual le permite capacitarse desde su pais con respaldo institucional y acceso flexible.", relatedCourses: ["Diplomados virtuales", "Gestion en Salud"], status: "Activo", updatedAt: today }],
    objections: [{ id: "ext-confianza", objection: "Como se si la institucion es confiable?", realMeaning: "Necesita seguridad antes de pagar desde otro pais.", suggestedResponse: "Le comparto informacion institucional, modalidad, certificacion y canales oficiales para que pueda validar con tranquilidad.", riskLevel: "Alto", resolver: "Respaldo institucional y canales oficiales" }],
    arguments: [{ id: "ext-arg-virtual", title: "Argumento de confianza virtual", situation: "Cuando pregunta por estudiar desde otro pais.", suggestedText: "Puede capacitarse de forma virtual con una institucion posicionada, acceso flexible y certificacion que respalde su formacion.", relatedPain: "Necesita modalidad virtual confiable", effectiveness: "Alto" }],
    recommendedPrograms: [{ id: "ext-p1", name: "Diplomados virtuales en salud", modality: "Virtual", duration: "3 meses", certification: "Diploma digital", solvesPain: "Acceso internacional", priority: "Alto" }],
    messages: [{ id: "ext-msg-1", type: "Primer contacto", text: "Puede llevar este programa desde su pais en modalidad virtual, con acceso flexible y certificacion respaldada por nuestra institucion." }],
    marketingInsight: { mainPain: "Confianza y acceso virtual desde otro pais.", promise: "Capacitate desde donde estes con respaldo institucional.", campaignAngle: "Formacion virtual para crecer profesionalmente sin fronteras.", hook: "Estudia desde tu pais con certificacion respaldada.", cta: "Consulta disponibilidad internacional.", format: "Carrusel institucional", channels: ["Meta Ads", "WhatsApp"] },
    conversationGuide: { opening: "Desde que pais nos escribe y que modalidad esta buscando?", diagnosticQuestions: ["Necesita certificacion digital?", "Busca mejorar empleo o actualizar CV?", "Prefiere pagos por cuotas?"], likelyPain: "Confianza, virtualidad y pago.", recommendedArgument: "Enfatizar respaldo institucional, canales oficiales y modalidad virtual.", frequentObjections: ["Confianza", "Pago", "Certificacion"], suggestedClose: "Le envio la informacion institucional y la malla para que pueda validarla antes de inscribirse." },
    updatedAt: today,
    changeLog: []
  }
];

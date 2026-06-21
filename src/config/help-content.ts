import type { HelpContentItem } from "@/types/help";

export const HELP_CONTENT: Record<string, HelpContentItem> = {
  "products.name": {
    title: "Nombre del producto",
    description: "Nombre comercial que verá ventas al registrar una venta.",
    example: "Ejemplo: Diplomado en Salud Ocupacional."
  },
  "products.code": {
    title: "Código interno",
    description: "Identificador corto para ubicar el programa en reportes y filtros.",
    example: "Ejemplo: D-SALUD-0626."
  },
  "products.type": {
    title: "Tipo de producto",
    description: "Clasifica qué se vende: Diplomado, Curso, Técnico u otro tipo agregado."
  },
  "products.area": {
    title: "Área o rubro",
    description: "Agrupa el programa por línea académica o especialidad comercial."
  },
  "products.status": {
    title: "Estado",
    description: "Controla si el programa aparece o no para registrar ventas.",
    warning: "Solo los activos para ventas deben usarse en operaciones reales."
  },
  "products.academic_owner": {
    title: "Responsable académico",
    description: "Persona que valida contenido, docentes, horarios o coordinación académica."
  },
  "products.commercial_owner": {
    title: "Responsable comercial",
    description: "Usuario interno responsable de empujar ventas, seguimiento y coordinación comercial."
  },
  "products.short_description": {
    title: "Descripción corta",
    description: "Resumen breve para ubicar rápido de qué trata el producto."
  },
  "products.commercial_description": {
    title: "Descripción comercial",
    description: "Texto orientado a ventas: beneficio, promesa y argumento principal."
  },
  "products.start_date": {
    title: "Fecha de inicio",
    description: "Día en que inicia la clase, acceso o actividad principal."
  },
  "products.end_date": {
    title: "Fecha de término",
    description: "Fecha estimada de cierre académico o fin del programa."
  },
  "products.duration": {
    title: "Duración",
    description: "Cantidad total de días, semanas, meses, horas o sesiones."
  },
  "products.class_days": {
    title: "Días de clase",
    description: "Días en que se dictará el programa. Usa el selector para evitar textos distintos."
  },
  "products.modality": {
    title: "Modalidad",
    description: "Indica si el programa es virtual, asincrónico, presencial, semipresencial o híbrido.",
    warning: "La modalidad debe coincidir con lo ofrecido al cliente.",
    variant: "popover"
  },
  "products.schedule": {
    title: "Horario resumen",
    description: "Franja horaria que ventas comunicará al participante."
  },
  "products.admission_mode": {
    title: "Forma de ingreso al aula",
    description: "Define cómo recibirá el participante sus credenciales o enlace de acceso."
  },
  "products.release_rule": {
    title: "Regla de habilitación",
    description: "Condición que debe cumplirse antes de dar acceso al aula.",
    warning: "Recomendado: pago o matrícula validada."
  },
  "products.access_duration": {
    title: "Duración del acceso",
    description: "Cantidad de días que el participante podrá ingresar al contenido."
  },
  "products.credential_delivery": {
    title: "Entrega de credenciales",
    description: "Indica si el usuario y contraseña se envían automáticamente o manualmente."
  },
  "products.welcome_channel": {
    title: "Canal de bienvenida",
    description: "Medio usado para enviar acceso, instrucciones y próximos pasos."
  },
  "products.module_count": {
    title: "Cantidad de módulos",
    description: "Número de bloques académicos que componen el curso o diplomado."
  },
  "products.session_count": {
    title: "Cantidad de clases",
    description: "Total estimado de sesiones en vivo, presenciales o asincrónicas."
  },
  "products.material_delivery": {
    title: "Entrega de materiales",
    description: "Momento en que el participante recibe grabaciones, PDFs u otros recursos."
  },
  "products.progress_tracking": {
    title: "Seguimiento de avance",
    description: "Criterio usado para saber cuánto del programa completó el participante."
  },
  "products.minimum_grade": {
    title: "Nota mínima",
    description: "Calificación mínima necesaria para aprobar la evaluación."
  },
  "products.certificate_rule": {
    title: "Condición para certificado",
    description: "Requisitos académicos y de pago que deben cumplirse antes de emitirlo."
  },
  "products.academic_hours": {
    title: "Horas académicas",
    description: "Cantidad de horas certificables o comunicables del programa."
  },
  "products.credits": {
    title: "Créditos",
    description: "Créditos académicos ofrecidos cuando la certificación los incluye."
  },
  "products.certification_type": {
    title: "Tipo de certificación",
    description: "Define si el respaldo es universitario, técnico, institucional, constancia u otro."
  },
  "products.certifying_institution": {
    title: "Institución certificadora",
    description: "Entidad que respalda o emite la certificación ofrecida."
  },
  "products.allied_institutions": {
    title: "Instituciones aliadas",
    description: "Organizaciones asociadas que pueden aparecer en la comunicación del programa."
  },
  "products.target_audience": {
    title: "Dirigido a",
    description: "Texto comercial que resume a qué público se ofrece el programa."
  },
  "products.allowed_profiles": {
    title: "Perfiles permitidos",
    description: "Selecciona los segmentos válidos. El campo Dirigido a se actualiza con la selección.",
    example: "Si marcas Médicos y Técnicos, se copiarán al público dirigido."
  },
  "products.enrollment": {
    title: "Matrícula promocional",
    description: "Monto inicial que puede cobrar ventas para reservar o iniciar inscripción."
  },
  "products.monthly": {
    title: "Mensualidad promocional",
    description: "Importe de cada cuota mensual del programa."
  },
  "products.monthly_count": {
    title: "Cantidad de mensualidades",
    description: "Número de cuotas mensuales que tendrá el plan de pago."
  },
  "products.single_payment": {
    title: "Pago único",
    description: "Monto total si el participante cancela el programa en una sola operación."
  },
  "products.promo_until": {
    title: "Promoción válida hasta",
    description: "Fecha límite para usar la tarifa promocional."
  },
  "products.form_url": {
    title: "Formulario de inscripción",
    description: "Link que ventas comparte para registrar o completar datos del participante."
  },
  "products.whatsapp_group": {
    title: "Grupo WhatsApp",
    description: "Link del grupo que se entrega luego de validar inscripción o pago."
  },
  "products.zoom_url": {
    title: "Zoom",
    description: "Enlace de clase o sala virtual si ya está definida."
  },
  "products.campus_url": {
    title: "Campus",
    description: "Acceso al campus o plataforma del programa."
  },
  "products.brochure_url": {
    title: "Brochure",
    description: "Archivo o enlace comercial que ventas puede compartir con el interesado."
  },
  "products.video_url": {
    title: "Video comercial",
    description: "Video explicativo, promocional o de presentación del programa."
  },
  "products.save_catalog": {
    title: "Guardar catálogo",
    description: "Guarda el producto y lo actualiza para los módulos de ventas, dashboard y reportes."
  },
  "products.add_option": {
    title: "Agregar opción",
    description: "Crea una nueva opción y la deja seleccionada en este campo."
  },
  "sales.gross_amount": {
    title: "Monto bruto",
    description: "Monto total antes de aplicar descuentos."
  },
  "sales.net_amount": {
    title: "Monto neto",
    description: "Monto final después de descuentos.",
    warning: "No siempre es igual al monto pagado."
  },
  "sales.save_sale": {
    title: "Guardar venta",
    description: "Registra la venta como pendiente de validación.",
    warning: "No impacta ranking ni metas hasta ser validada."
  },
  "goals.monthly_goal": {
    title: "Meta mensual",
    description: "Monto objetivo que la empresa espera alcanzar durante el mes."
  }
};

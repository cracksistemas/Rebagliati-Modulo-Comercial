export type ClientProfileStatus = "Activo" | "En revision" | "Archivado" | "Borrador";
export type PainIntensity = "Bajo" | "Medio" | "Alto" | "Critico";
export type ClientStage = "Curioso" | "Interesado" | "Comparando opciones" | "Listo para comprar" | "Recurrente";

export interface ClientPainPoint {
  id: string;
  title: string;
  description: string;
  category: string;
  intensity: PainIntensity;
  stage: ClientStage;
  recommendedArgument: string;
  relatedCourses: string[];
  status: "Activo" | "Archivado";
  updatedAt: string;
}

export interface ClientObjection {
  id: string;
  objection: string;
  realMeaning: string;
  suggestedResponse: string;
  riskLevel: PainIntensity;
  resolver: string;
}

export interface SalesArgument {
  id: string;
  title: string;
  situation: string;
  suggestedText: string;
  relatedPain: string;
  effectiveness: PainIntensity;
}

export interface RecommendedProgram {
  id: string;
  name: string;
  modality: string;
  duration: string;
  certification: string;
  solvesPain: string;
  priority: PainIntensity;
}

export interface SuggestedMessage {
  id: string;
  type: "Primer contacto" | "Seguimiento" | "Respuesta a precio" | "Respuesta a certificacion" | "Cierre" | "Reactivacion";
  text: string;
}

export interface ClientChangeLog {
  id: string;
  user: string;
  changedAt: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  shortDescription: string;
  commercialSummary: string;
  avatar: string;
  professionalArea: string;
  academicLevel: string;
  mainPain: string;
  mainMotivator: string;
  trainingFrequency: string;
  loyaltyLevel: string;
  urgencyLevel: PainIntensity;
  priceSensitivity: PainIntensity;
  preferredModality: string;
  certificationType: string;
  commercialTemperature: number;
  status: ClientProfileStatus;
  channels: string[];
  motivators: string[];
  needs: string[];
  avoidSaying: string[];
  painPoints: ClientPainPoint[];
  objections: ClientObjection[];
  arguments: SalesArgument[];
  recommendedPrograms: RecommendedProgram[];
  messages: SuggestedMessage[];
  marketingInsight: {
    mainPain: string;
    promise: string;
    campaignAngle: string;
    hook: string;
    cta: string;
    format: string;
    channels: string[];
  };
  conversationGuide: {
    opening: string;
    diagnosticQuestions: string[];
    likelyPain: string;
    recommendedArgument: string;
    frequentObjections: string[];
    suggestedClose: string;
  };
  updatedAt: string;
  changeLog: ClientChangeLog[];
}

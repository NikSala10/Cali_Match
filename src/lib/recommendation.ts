const API_BASE = import.meta.env.VITE_API_URL;

export interface PersonaProto {
  vector: Record<string, number>;
  participantes: number;
  consenso: Record<string, number>;
  diversidad: number;
}

export interface LugarRecomendado {
  id: number;
  nombre: string;
  categoria: string;
  tags: string[];
  barrio: string;
  zona: string;
  descripcion: string;
  precio: string;
  precio_rango: number;
  horario: string;
  ambiente: string[];
  ideal_para: string[];
  pet_friendly: boolean;
  al_aire_libre: boolean;
  accesibilidad: boolean;
  tip: string;
  emoji: string;
  match_pct: number;
  explicacion: string;
  coordenadas: { lat: number; lng: number };
}

export interface RecommendationResponse {
  persona_prototipica: PersonaProto;
  top_lugares: LugarRecomendado[];
  score: number;
  insights: string[];
  explicacion: string;
  saved?: boolean;
}

export const generateRecommendationFromBackend = async (
  groupId: string,
): Promise<RecommendationResponse> => {
  const response = await fetch(`${API_BASE}/recomendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : "No se pudo generar la recomendación.";
    throw new Error(message);
  }

  return data as RecommendationResponse;
};

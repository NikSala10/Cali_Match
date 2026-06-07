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

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const generateRecommendationFromBackend = async (
  groupId: string,
): Promise<RecommendationResponse> => {
  const MAX_ATTEMPTS = 3;
  // Render free tier can take ~30s to wake up; retry with increasing delays
  const DELAYS_MS = [0, 15_000, 20_000];

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (DELAYS_MS[attempt] > 0) await delay(DELAYS_MS[attempt]);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55_000);

      const response = await fetch(`${API_BASE}/recomendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data === "object" && data && "detail" in data
            ? String((data as { detail?: unknown }).detail)
            : "No se pudo generar la recomendación.";
        throw new Error(message);
      }

      return data as RecommendationResponse;
    } catch (err) {
      lastError = err;
      // Only retry on network/abort errors, not on 4xx/5xx from the server
      const isNetworkError =
        err instanceof TypeError || (err instanceof DOMException && err.name === "AbortError");
      if (!isNetworkError) throw err;
    }
  }

  throw lastError;
};

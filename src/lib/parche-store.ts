// Lightweight client-side store using localStorage.
export type Vibe = "salsa" | "rooftop" | "brunch" | "cafe" | "cultura" | "perreo";
export type Ambiente = "elegante" | "casual" | "alternativo" | "tropical" | "romantico" | "fiesta";
export type Horario = "manana" | "tarde" | "noche";

export interface Profile {
  name: string;
  email?: string;
  password?: string;
  phone?: string;
  birthdate?: string;
}

export interface OnboardingAnswers {
  // New fields
  turistico?: string;   // "famosos" | "mix" | "local"
  ambiente?: string[];  // multi-select
  // Legacy fields kept for backward compat
  budget?: string;
  horario?: Horario;
  experiencias?: string[];
}

export interface Member {
  id: string;
  name: string;
  emoji: string;
  status: "answered" | "pending";
}

export interface AdminQuiz {
  // Group quiz — 6 questions
  tipoSalida?: string;      // "manana" | "tarde" | "noche_tranquila" | "todo_el_dia"
  actividades?: string[];   // multi-select
  experiencia?: string;     // "cultural" | "gastronomica" | "turistica" | ...
  energia?: string;         // "relax" | "curiosos" | "tranquilo_comida" | "recorrer"
  tiempo?: string;          // "1_2h" | "media_tarde" | "todo_el_dia"
  vibe?: string;            // "sunset_urbano" | "cafe_acogedor" | ...
  // Legacy fields kept for backward compat
  disponibilidad?: string[];
  lugares?: string[];
  mood?: string;
  franja?: "dia" | "tarde" | "noche";
}

export interface RecommendationResult {
  persona_prototipica?: Record<string, unknown>;
  top_lugares?: Array<Record<string, unknown>>;
  score?: number;
  insights?: string[];
  explicacion?: string;
}

export interface Parche {
  code: string;
  name: string;
  size: number;
  type?: string;                              // kept optional for backward compat
  createdBy?: string | null;
  members: Member[];
  adminAnswered?: boolean;
  adminQuiz?: AdminQuiz;
  memberAnswers?: Record<string, AdminQuiz>;  // quiz answers keyed by member id
  status?: "active" | "finalizado";
  finalizedAt?: string;
  recommendation?: RecommendationResult;      // result from backend
}

export const isParcheActive = (p: Parche) => (p.status ?? "active") === "active";

// ── Keys ─────────────────────────────────────────────────────────────────────
const PROFILE_KEY = "cg.profile";
const ONB_KEY = "cg.onboarding";
const PARCHE_KEY = "cg.parche";
const PARCHES_KEY = "cg.parches";
const SESSION_KEY = "cg.session";
const LEGACY_SESSION_KEY = "cg.session.email";

const safeWindow = () => typeof window !== "undefined";

// ── Profile ───────────────────────────────────────────────────────────────────
export const saveProfile = (p: Profile) =>
  safeWindow() && localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
export const getProfile = (): Profile | null => {
  if (!safeWindow()) return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const clearProfile = () => safeWindow() && localStorage.removeItem(PROFILE_KEY);

// ── Session ───────────────────────────────────────────────────────────────────
export const saveSession = (id: string, email: string) => {
  if (!safeWindow()) return;
  localStorage.setItem(SESSION_KEY, id);
  localStorage.setItem(SESSION_KEY + ".email", email);
};
export const getSessionId = (): string | null => {
  if (!safeWindow()) return null;
  return localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
};
export const getSessionEmail = (): string | null => {
  if (!safeWindow()) return null;
  return (
    localStorage.getItem(SESSION_KEY + ".email") ||
    localStorage.getItem(LEGACY_SESSION_KEY + ".email")
  );
};
export const clearSession = () => {
  if (!safeWindow()) return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY + ".email");
  localStorage.removeItem(LEGACY_SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY + ".email");
  localStorage.removeItem(PROFILE_KEY);
};

// ── Onboarding ────────────────────────────────────────────────────────────────
export const saveOnboarding = (a: OnboardingAnswers) =>
  safeWindow() && localStorage.setItem(ONB_KEY, JSON.stringify(a));
export const getOnboarding = (): OnboardingAnswers => {
  if (!safeWindow()) return {};
  const raw = localStorage.getItem(ONB_KEY);
  return raw ? JSON.parse(raw) : {};
};

// ── Parches ───────────────────────────────────────────────────────────────────
export const getParches = (): Parche[] => {
  if (!safeWindow()) return [];
  const raw = localStorage.getItem(PARCHES_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveParche = (p: Parche) => {
  if (!safeWindow()) return;
  localStorage.setItem(PARCHE_KEY, JSON.stringify(p));
  const list = getParches();
  const idx = list.findIndex((x) => x.code === p.code);
  if (idx >= 0) list[idx] = p;
  else list.unshift(p);
  localStorage.setItem(PARCHES_KEY, JSON.stringify(list));
};

export const getParche = (code?: string): Parche | null => {
  if (!safeWindow()) return null;
  if (code) {
    const found = getParches().find((p) => p.code === code);
    if (found) return found;
  }
  const raw = localStorage.getItem(PARCHE_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const removeParche = (code: string) => {
  if (!safeWindow()) return;
  const list = getParches().filter((p) => p.code !== code);
  localStorage.setItem(PARCHES_KEY, JSON.stringify(list));
  const current = localStorage.getItem(PARCHE_KEY);
  if (current) {
    const cur = JSON.parse(current) as Parche;
    if (cur.code === code) localStorage.removeItem(PARCHE_KEY);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const EMOJIS = ["💃", "🕺", "🌺", "🍹", "✨", "🎷", "🌴", "🦋", "🌊", "🎉", "🔥", "⚡"];
export const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export const createStarterMembers = (currentName?: string, sessionId?: string | null): Member[] => [
  {
    id: sessionId ?? "me",
    name: currentName ?? "Tú",
    emoji: "🔥",
    status: "pending",
  },
];

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import {
  getParche, saveParche, getSessionId, getProfile, isParcheActive,
  type AdminQuiz, type Parche,
} from "@/lib/parche-store";
import { saveMemberQuizToSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/parche_/$code/quiz")({
  head: () => ({ meta: [{ title: "Quiz del parche — CaliMatch" }] }),
  component: QuizPage,
});

// ── Q0: Días disponibles (original, conservado) ───────────────────────────────
const dias = [
  { id: "lun", label: "Lun" }, { id: "mar", label: "Mar" }, { id: "mie", label: "Mié" },
  { id: "jue", label: "Jue" }, { id: "vie", label: "Vie" }, { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
];

// ── Q1: Lugares de interés (original, conservado) ────────────────────────────
const lugares = [
  { id: "rooftop", label: "Rooftop", emoji: "🌇" },
  { id: "salsa", label: "Salsa", emoji: "💃" },
  { id: "brunch", label: "Brunch", emoji: "🥐" },
  { id: "rumba", label: "Rumba", emoji: "🔥" },
  { id: "cafe", label: "Café", emoji: "☕" },
  { id: "cultura", label: "Cultura", emoji: "🎨" },
  { id: "gastro", label: "Gastro", emoji: "🍽️" },
  { id: "naturaleza", label: "Naturaleza", emoji: "🌴" },
];

// ── Q2: Energía del parche (REEMPLAZA el mood original) ──────────────────────
const energiaOpts = [
  { id: "relax", label: "Relax", emoji: "😌", desc: "Sin prisa, tranquilos" },
  { id: "curiosos", label: "Curiosos y exploradores", emoji: "🔍", desc: "Queremos descubrir" },
  { id: "tranquilo_comida", label: "Plan tranquilo con buena comida", emoji: "🍜", desc: "Comer rico y conversar" },
  { id: "recorrer", label: "Queremos recorrer bastante", emoji: "🚀", desc: "Mucho movimiento" },
];

// ── Q3: Tipo de salida ────────────────────────────────────────────────────────
const tipoSalidaOpts = [
  { id: "manana", label: "Mañana", emoji: "☀️", desc: "7am – 12pm" },
  { id: "tarde", label: "Tarde", emoji: "🌤️", desc: "2pm – 7pm" },
  { id: "noche_tranquila", label: "Noche tranquila", emoji: "🌙", desc: "8pm en adelante" },
  { id: "todo_el_dia", label: "Todo el día", emoji: "🌟", desc: "Experiencia completa" },
];

// ── Q4: ¿Qué quieren hacer? ───────────────────────────────────────────────────
const actividadesOpts = [
  { id: "comer", label: "Comer rico", emoji: "🍴" },
  { id: "lugares_bonitos", label: "Conocer lugares bonitos", emoji: "📸" },
  { id: "cultural", label: "Vivir algo cultural", emoji: "🎨" },
  { id: "relajarse", label: "Relajarse", emoji: "🌿" },
  { id: "explorar_ciudad", label: "Explorar la ciudad", emoji: "🏛️" },
  { id: "hablar_tiempo", label: "Hablar y pasar tiempo juntos", emoji: "☕" },
  { id: "lugares_nuevos", label: "Descubrir lugares nuevos", emoji: "🚶" },
  { id: "mercados", label: "Visitar mercados o tiendas", emoji: "🛍️" },
];

// ── Q5: Experiencia a priorizar ───────────────────────────────────────────────
const experienciaOpts = [
  { id: "cultural", label: "Cultural", emoji: "🎭" },
  { id: "gastronomica", label: "Gastronómica", emoji: "🍽️" },
  { id: "turistica", label: "Turística", emoji: "📍" },
  { id: "naturaleza", label: "Naturaleza", emoji: "🌿" },
  { id: "cafe_conv", label: "Café y conversación", emoji: "☕" },
  { id: "urbana", label: "Exploración urbana", emoji: "🏙️" },
];

// ── Q6: Tiempo disponible ─────────────────────────────────────────────────────
const tiempoOpts = [
  { id: "1_2h", label: "1 – 2 horas", emoji: "⏱️", desc: "Una salida rápida" },
  { id: "media_tarde", label: "Media tarde", emoji: "🕐", desc: "Unas 3–4 horas" },
  { id: "todo_el_dia", label: "Todo el día", emoji: "📅", desc: "Sin límite de tiempo" },
];

// ── Q7: Vibe visual ───────────────────────────────────────────────────────────
const vibeOpts = [
  { id: "sunset_urbano", label: "Sunset urbano", emoji: "🌇", color: "from-orange-500 to-pink-600" },
  { id: "cafe_acogedor", label: "Café acogedor", emoji: "☕", color: "from-amber-700 to-yellow-600" },
  { id: "arte_cultura", label: "Arte y cultura", emoji: "🎨", color: "from-purple-600 to-indigo-600" },
  { id: "naturaleza", label: "Naturaleza relajante", emoji: "🌿", color: "from-green-600 to-teal-600" },
  { id: "foodie", label: "Foodie experience", emoji: "🍽️", color: "from-red-500 to-orange-500" },
  { id: "hidden_gems", label: "Hidden gems", emoji: "📸", color: "from-cyan-600 to-blue-600" },
];

const TOTAL_STEPS = 8;

function QuizPage() {
  const navigate = useNavigate();
  const { code } = Route.useParams();
  const sessionId = getSessionId();
  const profile = getProfile();

  const [parche, setParche] = useState<Parche | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AdminQuiz>({ disponibilidad: [], actividades: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = getParche(code);
    setParche(p);

    if (!p || !isParcheActive(p)) {
      void navigate({ to: "/parche/$code", params: { code } });
      return;
    }

    // Pre-fill ONLY this user's own previous answers
    const myId = sessionId ?? "me";
    const existing = p.memberAnswers?.[myId];
    if (existing) setAnswers({ disponibilidad: [], actividades: [], ...existing });
  }, [code, sessionId, navigate]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const toggleDia = (id: string) =>
    setAnswers((a) => {
      const cur = a.disponibilidad ?? [];
      return { ...a, disponibilidad: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  const toggleLugar = (id: string) =>
    setAnswers((a) => {
      const cur = a.lugares ?? [];
      return { ...a, lugares: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  const toggleActividad = (id: string) =>
    setAnswers((a) => {
      const cur = a.actividades ?? [];
      return { ...a, actividades: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  const canAdvance =
    (step === 0 && (answers.disponibilidad?.length ?? 0) > 0) ||
    (step === 1 && (answers.lugares?.length ?? 0) > 0) ||
    (step === 2 && !!answers.energia) ||
    (step === 3 && !!answers.tipoSalida) ||
    (step === 4 && (answers.actividades?.length ?? 0) > 0) ||
    (step === 5 && !!answers.experiencia) ||
    (step === 6 && !!answers.tiempo) ||
    (step === 7 && !!answers.vibe);

  const finish = async () => {
    if (!parche) return;
    setSaving(true);

    const myId = sessionId ?? "me";
    const myName = profile?.name ?? "Tú";
    const isAdmin = parche.createdBy === sessionId;

    const alreadyMember = parche.members.some((m) => m.id === myId);
    const updatedMembers = alreadyMember
      ? parche.members.map((m) => m.id === myId ? { ...m, status: "answered" as const } : m)
      : [...parche.members, { id: myId, name: myName, emoji: "🔥", status: "answered" as const }];

    const updated: Parche = {
      ...parche,
      members: updatedMembers,
      adminAnswered: isAdmin ? true : parche.adminAnswered,
      adminQuiz: isAdmin ? answers : parche.adminQuiz,
      memberAnswers: { ...(parche.memberAnswers ?? {}), [myId]: answers },
    };

    saveParche(updated);

    try {
      await saveMemberQuizToSupabase(code, myId, answers);
    } catch (err) {
      console.error("[quiz] No se pudo guardar en Supabase:", err);
    }

    setSaving(false);
    void navigate({ to: "/parche/$code", params: { code } });
  };

  const next = async () => {
    if (step < TOTAL_STEPS - 1) { setStep(step + 1); return; }
    await finish();
  };

  if (!parche) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />

      <header className="px-5 py-5 flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={() => void navigate({ to: "/parche/$code", params: { code } })}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Salir
        </button>
      </header>

      <div className="px-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Pregunta {step + 1} de {TOTAL_STEPS}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div className="h-full bg-[image:var(--gradient-sunset)]" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </div>

      <main className="flex-1 px-5 py-8 pb-24">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

              {/* Q0: Días disponibles */}
              {step === 0 && (
                <Section title="¿Qué días tienen disponibles?" subtitle="Seleccionen uno o varios.">
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-6">
                    {dias.map((d) => {
                      const active = answers.disponibilidad?.includes(d.id);
                      return (
                        <button key={d.id} onClick={() => toggleDia(d.id)}
                          className={`glass rounded-2xl py-4 font-bold text-sm transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange" : "hover:bg-white/5"}`}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q1: Lugares */}
              {step === 1 && (
                <Section title="¿Qué lugares les interesan?" subtitle="Elige todos los que les llamen.">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {lugares.map((l) => {
                      const active = answers.lugares?.includes(l.id);
                      return (
                        <motion.button key={l.id} whileTap={{ scale: 0.97 }} onClick={() => toggleLugar(l.id)}
                          className={`relative glass rounded-2xl p-5 text-center transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange" : "hover:bg-white/5"}`}>
                          <div className="text-3xl">{l.emoji}</div>
                          <div className="mt-2 text-xs font-semibold">{l.label}</div>
                          {active && <span className="absolute top-2 right-2 h-5 w-5 grid place-items-center rounded-full bg-[image:var(--gradient-sunset)]"><Check className="h-3 w-3 text-black" /></span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q2: Energía (reemplaza mood) */}
              {step === 2 && (
                <Section title="¿Cómo está la energía del parche hoy?" subtitle="La vibra que mejor describe al grupo.">
                  <div className="grid gap-3 mt-6">
                    {energiaOpts.map((o) => {
                      const active = answers.energia === o.id;
                      return (
                        <motion.button key={o.id} whileTap={{ scale: 0.98 }} onClick={() => setAnswers((a) => ({ ...a, energia: o.id }))}
                          className={`glass rounded-2xl p-4 flex items-center gap-4 text-left transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange bg-white/5" : "hover:bg-white/5"}`}>
                          <span className="text-3xl shrink-0">{o.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-semibold">{o.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>
                          </div>
                          {active && <span className="ml-auto shrink-0 h-6 w-6 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center"><Check className="h-3.5 w-3.5 text-black" /></span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q3: Tipo de salida */}
              {step === 3 && (
                <Section title="¿Qué tipo de salida planean?" subtitle="Elige la franja del día.">
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {tipoSalidaOpts.map((o) => {
                      const active = answers.tipoSalida === o.id;
                      return (
                        <motion.button key={o.id} whileTap={{ scale: 0.97 }} onClick={() => setAnswers((a) => ({ ...a, tipoSalida: o.id }))}
                          className={`glass rounded-2xl p-5 text-center transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange" : "hover:bg-white/5"}`}>
                          <div className="text-4xl">{o.emoji}</div>
                          <div className="mt-2 font-bold text-sm">{o.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{o.desc}</div>
                          {active && <div className="mt-2 flex justify-center"><span className="h-4 w-4 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center"><Check className="h-2.5 w-2.5 text-black" /></span></div>}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q4: ¿Qué quieren hacer? */}
              {step === 4 && (
                <Section title="¿Qué quieren hacer hoy?" subtitle="Elige todo lo que aplique.">
                  <div className="grid grid-cols-2 gap-2 mt-6">
                    {actividadesOpts.map((o) => {
                      const active = answers.actividades?.includes(o.id) ?? false;
                      return (
                        <motion.button key={o.id} whileTap={{ scale: 0.96 }} onClick={() => toggleActividad(o.id)}
                          className={`glass rounded-xl px-4 py-3 flex items-center gap-3 text-left transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange bg-white/5" : "hover:bg-white/5"}`}>
                          <span className="text-xl shrink-0">{o.emoji}</span>
                          <span className="text-sm font-medium leading-tight">{o.label}</span>
                          {active && <Check className="h-3.5 w-3.5 text-[var(--sunset)] ml-auto shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q5: Experiencia a priorizar */}
              {step === 5 && (
                <Section title="¿Qué experiencia quieren priorizar?" subtitle="Una sola respuesta.">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                    {experienciaOpts.map((o) => {
                      const active = answers.experiencia === o.id;
                      return (
                        <motion.button key={o.id} whileTap={{ scale: 0.97 }} onClick={() => setAnswers((a) => ({ ...a, experiencia: o.id }))}
                          className={`glass rounded-2xl p-5 text-center transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange" : "hover:bg-white/5"}`}>
                          <div className="text-3xl">{o.emoji}</div>
                          <div className="mt-2 text-sm font-semibold">{o.label}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q6: Tiempo disponible */}
              {step === 6 && (
                <Section title="¿Cuánto tiempo tienen?" subtitle="Para ajustar el plan a tu disponibilidad.">
                  <div className="grid gap-3 mt-6">
                    {tiempoOpts.map((o) => {
                      const active = answers.tiempo === o.id;
                      return (
                        <motion.button key={o.id} whileTap={{ scale: 0.98 }} onClick={() => setAnswers((a) => ({ ...a, tiempo: o.id }))}
                          className={`glass rounded-2xl p-5 flex items-center gap-4 text-left transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange bg-white/5" : "hover:bg-white/5"}`}>
                          <span className="text-3xl shrink-0">{o.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-bold">{o.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>
                          </div>
                          {active && <span className="ml-auto shrink-0 h-6 w-6 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center"><Check className="h-3.5 w-3.5 text-black" /></span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Q7: Vibe visual */}
              {step === 7 && (
                <Section title="¿Qué vibe representa mejor el plan?" subtitle="La carta que más les llama.">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                    {vibeOpts.map((o) => {
                      const active = answers.vibe === o.id;
                      return (
                        <motion.button key={o.id} whileTap={{ scale: 0.97 }} onClick={() => setAnswers((a) => ({ ...a, vibe: o.id }))}
                          className={`relative rounded-2xl overflow-hidden aspect-[3/4] transition ${active ? "ring-2 ring-[var(--sunset)] scale-[1.03]" : "opacity-80 hover:opacity-100"}`}>
                          <div className={`absolute inset-0 bg-gradient-to-br ${o.color}`} />
                          <div className="absolute inset-0 bg-black/20" />
                          {active && <div className="absolute inset-0 bg-[image:var(--gradient-sunset)] opacity-20" />}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
                            <span className="text-4xl">{o.emoji}</span>
                            <span className="text-xs font-bold text-white text-center leading-tight">{o.label}</span>
                          </div>
                          {active && (
                            <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center">
                              <Check className="h-3.5 w-3.5 text-black" />
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>
              )}

            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
              className="rounded-full glass px-5 py-3 text-sm inline-flex items-center gap-2 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <button onClick={() => void next()} disabled={!canAdvance || saving}
              className="btn-sunset rounded-full px-6 py-3 inline-flex items-center gap-2 disabled:opacity-40">
              {saving ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : step === TOTAL_STEPS - 1 ? (
                <>Listo <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Siguiente <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground text-sm">{subtitle}</p>}
      {children}
    </div>
  );
}

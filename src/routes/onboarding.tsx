import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import {
  saveOnboarding, getSessionId, type OnboardingAnswers, type Horario,
} from "@/lib/parche-store";
import { saveOnboardingToSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Tu vibra — CaliMatch" }] }),
  component: Onboarding,
});

// ── Step 0: Experiencias ──────────────────────────────────────────────────────
const experienciaOpts = [
  { id: "cafes", label: "Cafés bonitos", emoji: "☕" },
  { id: "cultura", label: "Lugares culturales", emoji: "🎨" },
  { id: "museos", label: "Museos o historia", emoji: "🏛️" },
  { id: "naturaleza", label: "Naturaleza y miradores", emoji: "🌿" },
  { id: "gastro", label: "Gastronomía local", emoji: "🍽️" },
  { id: "insta", label: "Instagrameables", emoji: "📸" },
  { id: "mercados", label: "Mercados y tiendas", emoji: "🛍️" },
  { id: "eventos", label: "Eventos culturales", emoji: "🎭" },
  { id: "barrios", label: "Caminar barrios", emoji: "🚶" },
  { id: "musica", label: "Música", emoji: "🎵" },
];

// ── Step 1: Presupuesto ───────────────────────────────────────────────────────
const presupuestoOpts = [
  { id: "bajo", label: "Menos de $30.000", emoji: "💸" },
  { id: "medio", label: "$30.000 – $70.000", emoji: "💵" },
  { id: "alto", label: "$70.000 – $150.000", emoji: "💰" },
  { id: "premium", label: "Más de $150.000", emoji: "✨" },
];

// ── Step 2: Ambiente (reformulado) ────────────────────────────────────────────
const ambienteOpts = [
  { id: "tranquilo", label: "Tranquilo", emoji: "😌" },
  { id: "creativo", label: "Creativo / artístico", emoji: "🎨" },
  { id: "natural", label: "Natural", emoji: "🌿" },
  { id: "elegante", label: "Elegante", emoji: "🥂" },
  { id: "tradicional", label: "Tradicional / local", emoji: "🎶" },
  { id: "moderno", label: "Moderno", emoji: "✨" },
];

// ── Step 3: Horario ───────────────────────────────────────────────────────────
const horarioOpts: { id: Horario; label: string; emoji: string; time: string }[] = [
  { id: "tarde", label: "Tarde", emoji: "🌤️", time: "3pm – 7pm" },
  { id: "noche", label: "Noche", emoji: "🌙", time: "8pm – 12am" },
  { id: "madrugada", label: "Madrugada", emoji: "🌃", time: "12am en adelante" },
];

// ── Step 4: Turístico (nuevo) ─────────────────────────────────────────────────
const turisticoOpts = [
  {
    id: "famosos",
    label: "Lugares famosos de Cali",
    desc: "Los clásicos que todo el mundo recomienda",
    emoji: "📍",
  },
  {
    id: "mix",
    label: "Mix entre local y turístico",
    desc: "Un poco de todo — lo mejor de ambos mundos",
    emoji: "🔀",
  },
  {
    id: "local",
    label: "Joyas escondidas / locales",
    desc: "Lugares que solo conocen los caleños de verdad",
    emoji: "💎",
  },
];

const TOTAL_STEPS = 5;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [saving, setSaving] = useState(false);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const update = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  const toggleList = (key: "experiencias" | "ambiente", id: string) => {
    const current = (answers[key] as string[] | undefined) ?? [];
    update(key as keyof OnboardingAnswers, (current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]) as OnboardingAnswers[typeof key]);
  };

  const canAdvance =
    (step === 0 && (answers.experiencias?.length ?? 0) > 0) ||
    (step === 1 && !!answers.budget) ||
    (step === 2 && (answers.ambiente?.length ?? 0) > 0) ||
    (step === 3 && !!answers.horario) ||
    (step === 4 && !!answers.turistico);

  const finish = async () => {
    setSaving(true);
    saveOnboarding(answers);

    const userId = getSessionId();
    if (userId) {
      try {
        await saveOnboardingToSupabase(userId, answers);
      } catch (err) {
        console.error("[Onboarding] Error guardando en Supabase:", err);
      }
    }

    setSaving(false);
    void navigate({ to: "/bienvenida" });
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) { setStep(step + 1); return; }
    void finish();
  };

  if (saving) return <LoadingFinal />;

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />

      <header className="px-5 py-5 flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Salir</Link>
      </header>

      {/* Progress */}
      <div className="px-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Pregunta {step + 1} de {TOTAL_STEPS}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-[image:var(--gradient-sunset)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 px-5 py-8">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >

              {/* STEP 0 — Experiencias */}
              {step === 0 && (
                <StepShell title="¿Qué tipo de experiencias disfrutas más?" subtitle="Elige todas las que quieras.">
                  <div className="grid grid-cols-2 gap-2 mt-6">
                    {experienciaOpts.map((o) => {
                      const selected = answers.experiencias?.includes(o.id) ?? false;
                      return (
                        <motion.button
                          key={o.id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleList("experiencias", o.id)}
                          className={`glass rounded-xl px-4 py-3 flex items-center gap-3 text-left transition ${selected ? "ring-2 ring-[var(--sunset)] glow-orange bg-white/5" : "hover:bg-white/5"}`}
                        >
                          <span className="text-xl">{o.emoji}</span>
                          <span className="text-sm font-medium leading-tight">{o.label}</span>
                          {selected && <Check className="h-3.5 w-3.5 text-[var(--sunset)] ml-auto shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

              {/* STEP 1 — Presupuesto */}
              {step === 1 && (
                <StepShell title="¿Cuál es tu presupuesto aproximado para salir?" subtitle="Elige el rango que mejor te describe.">
                  <div className="grid gap-3 mt-6">
                    {presupuestoOpts.map((o) => {
                      const active = answers.budget === o.id;
                      return (
                        <button
                          key={o.id}
                          onClick={() => update("budget", o.id)}
                          className={`glass rounded-2xl p-5 flex items-center gap-4 text-left transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange" : "hover:bg-white/5"}`}
                        >
                          <span className="text-3xl">{o.emoji}</span>
                          <span className="font-semibold">{o.label}</span>
                          {active && <Check className="h-4 w-4 text-[var(--sunset)] ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

              {/* STEP 2 — Ambiente (reformulado) */}
              {step === 2 && (
                <StepShell title="¿Qué ambiente te gusta más?" subtitle="Puedes elegir varios — todos cuentan.">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                    {ambienteOpts.map((a) => {
                      const selected = answers.ambiente?.includes(a.id) ?? false;
                      return (
                        <motion.button
                          key={a.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleList("ambiente", a.id)}
                          className={`glass rounded-2xl p-5 text-center transition ${selected ? "ring-2 ring-[var(--sunset)] glow-orange bg-white/5" : "hover:bg-white/5"}`}
                        >
                          <div className="text-3xl">{a.emoji}</div>
                          <div className="mt-2 text-sm font-semibold leading-tight">{a.label}</div>
                          {selected && (
                            <div className="mt-1.5 flex justify-center">
                              <span className="h-4 w-4 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center">
                                <Check className="h-2.5 w-2.5 text-black" />
                              </span>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

              {/* STEP 3 — Horario */}
              {step === 3 && (
                <StepShell title="¿A qué hora sueles salir?" subtitle="El horario marca todo el plan.">
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    {horarioOpts.map((o) => {
                      const active = answers.horario === o.id;
                      return (
                        <motion.button
                          key={o.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => update("horario", o.id)}
                          className={`glass rounded-2xl p-5 text-center transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange" : "hover:bg-white/5"}`}
                        >
                          <div className="text-4xl">{o.emoji}</div>
                          <div className="mt-2 font-bold">{o.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{o.time}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

              {/* STEP 4 — ¿Qué tan turístico? (nuevo) */}
              {step === 4 && (
                <StepShell
                  title="¿Qué tan turístico quieres que sea el plan?"
                  subtitle="Esto nos ayuda a personalizar los lugares que te recomendamos."
                >
                  <div className="grid gap-3 mt-6">
                    {turisticoOpts.map((o) => {
                      const active = answers.turistico === o.id;
                      return (
                        <motion.button
                          key={o.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => update("turistico", o.id)}
                          className={`glass rounded-2xl p-5 flex items-center gap-4 text-left transition ${active ? "ring-2 ring-[var(--sunset)] glow-orange bg-white/5" : "hover:bg-white/5"}`}
                        >
                          <span className="text-3xl shrink-0">{o.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-semibold">{o.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>
                          </div>
                          {active && (
                            <span className="ml-auto shrink-0 h-6 w-6 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center">
                              <Check className="h-3.5 w-3.5 text-black" />
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              className="rounded-full glass px-5 py-3 text-sm inline-flex items-center gap-2 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <button
              onClick={next}
              disabled={!canAdvance}
              className="btn-sunset rounded-full px-6 py-3 inline-flex items-center gap-2 disabled:opacity-40"
            >
              {step === TOTAL_STEPS - 1 ? "Finalizar" : "Siguiente"}{" "}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground text-sm">{subtitle}</p>}
      {children}
    </div>
  );
}

function LoadingFinal() {
  return (
    <div className="min-h-screen grid place-items-center px-5">
      <GlowBg />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="relative h-32 w-32 mx-auto">
          <div className="absolute inset-0 rounded-full bg-[image:var(--gradient-sunset)] blur-2xl opacity-60 animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--sunset)] border-r-[var(--pink-glow)]"
          />
          <div className="absolute inset-0 grid place-items-center">
            <Sparkles className="h-10 w-10 text-[var(--sunset)]" />
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-bold">
          Guardando tus preferencias...<br />
          <span className="text-gradient-sunset">Ya casi listo 🔥</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">Combinando vibras, presupuestos y horarios.</p>
      </motion.div>
    </div>
  );
}

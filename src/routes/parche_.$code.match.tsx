import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import { getParche, saveParche, type Parche, type Member, type AdminQuiz } from "@/lib/parche-store";
import { fetchGroupFromSupabase } from "@/lib/supabase";

type BackendLugar = {
  nombre?: string;
  emoji?: string;
  match_pct?: number;
};

type Answer = {
  actividades?: string[];
  vibe?: string;
};

export const Route = createFileRoute("/parche_/$code/match")({
  head: () => ({ meta: [{ title: "Compatibilidad — CaliMatch" }] }),
  component: Match,
});

const CIRCUMFERENCE = 2 * Math.PI * 68;

function ScoreCircle({ score }: { score: number }) {
  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="80" cy="80" r="68"
          fill="none"
          stroke="oklch(1 0 0 / 0.08)"
          strokeWidth="14"
        />
        {/* Progress arc */}
        <motion.circle
          cx="80" cy="80" r="68"
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tabular-nums">{score}%</span>
        <span className="text-xs text-muted-foreground mt-1 tracking-wide">compatibilidad</span>
      </div>
    </div>
  );
}

function Match() {
  const navigate = useNavigate();
  const { code } = Route.useParams();

  const [parche, setParche] = useState<Parche | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const local = getParche(code);
      if (local) setParche(local);

      try {
        const remote = await fetchGroupFromSupabase(code);
        const merged: Parche = {
          code: remote.id as string,
          name: remote.name as string,
          size: remote.size as number,
          createdBy: remote.created_by as string | null,
          members: ((remote.members as Member[])?.length > 0
            ? (remote.members as Member[])
            : (local?.members ?? [])),
          status: (remote.status as Parche["status"]) ?? "finalizado",
          finalizedAt: remote.finalized_at as string | undefined,
          recommendation: remote.recommendation
            ? {
                score: remote.recommendation.score,
                insights: remote.recommendation.insights ?? [],
                explicacion: remote.recommendation.explicacion ?? "",
                top_lugares: remote.recommendation.top_lugares ?? [],
              }
            : local?.recommendation,
          adminAnswered: local?.adminAnswered,
          adminQuiz: local?.adminQuiz,
          memberAnswers: {
            ...(remote.quizAnswers as Record<string, AdminQuiz>),
            ...(local?.memberAnswers ?? {}),
          },
        };
        saveParche(merged);
        setParche(merged);
      } catch {
        // Already showing local data
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const targetScore = parche?.recommendation?.score ?? computeFallbackScore(parche);

  useEffect(() => {
    if (loading) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setScore(Math.min(i, targetScore));
      if (i >= targetScore) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [targetScore, loading]);

  const rec = parche?.recommendation;
  const hasBackend = !!(rec?.top_lugares && rec.top_lugares.length > 0);

  const backendLugares: BackendLugar[] = rec?.top_lugares ?? [];

  const memberAnswers = parche?.memberAnswers ?? {};
  const allAnswers = Object.values(memberAnswers) as Answer[];
  const total = allAnswers.length || 1;

  const actCounts: Record<string, number> = {};
  allAnswers.forEach((a) => {
    a.actividades?.forEach((act) => {
      actCounts[act] = (actCounts[act] ?? 0) + 1;
    });
  });

  const actLabels: Record<string, { label: string; emoji: string }> = {
    comer: { label: "Comer rico", emoji: "🍴" },
    lugares_bonitos: { label: "Lugares bonitos", emoji: "📸" },
    cultural: { label: "Cultural", emoji: "🎨" },
    relajarse: { label: "Relajarse", emoji: "🌿" },
    explorar_ciudad: { label: "Explorar ciudad", emoji: "🏛️" },
    hablar_tiempo: { label: "Pasar tiempo juntos", emoji: "☕" },
    lugares_nuevos: { label: "Descubrir lugares", emoji: "🚶" },
    mercados: { label: "Mercados / tiendas", emoji: "🛍️" },
  };

  const localCats = Object.entries(actCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id, count]) => ({
      label: actLabels[id]?.label ?? id,
      emoji: actLabels[id]?.emoji ?? "✨",
      value: Math.round((count / total) * 100),
    }));

  const fallbackCats =
    localCats.length > 0
      ? localCats
      : [
          { label: "Comer rico", value: 90, emoji: "🍴" },
          { label: "Lugares bonitos", value: 80, emoji: "📸" },
          { label: "Cultural", value: 70, emoji: "🎨" },
          { label: "Relajarse", value: 65, emoji: "🌿" },
        ];

  const displayCats = hasBackend
    ? backendLugares.slice(0, 4).map((l: BackendLugar) => ({
        label: String(l.nombre ?? ""),
        emoji: String(l.emoji ?? "✨"),
        value: Number(l.match_pct ?? 0),
      }))
    : fallbackCats;

  const insights =
    rec?.insights?.length
      ? rec.insights
      : [
          "Recomendación generada a partir del grupo 🎯",
          "El parche tiene buena química 🔥",
        ];

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />

      <header className="px-5 py-5 flex items-center justify-between">
        <Logo size="sm" />
        <Link
          to="/parche/$code"
          params={{ code }}
          className="text-sm text-muted-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Link>
      </header>

      <main className="flex-1 px-5 py-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">
              {hasBackend ? "RECOMENDACIÓN PERSONALIZADA" : "COMPATIBILIDAD GRUPAL"}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              {parche?.name ?? "Tu parche"}{" "}
              <span className="text-gradient-sunset">tiene química 🔥</span>
            </h1>
          </div>

          {/* Score circle */}
          <div className="mt-8 flex justify-center">
            {loading ? (
              <div className="w-48 h-48 rounded-full glass flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-[var(--sunset)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ScoreCircle score={score} />
            )}
          </div>
          {/* Banner Telegram */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 flex items-start gap-3"
        >
          <span className="text-2xl">📱</span>
          <div>
            <p className="text-sm font-semibold text-orange-400">
              ¡La recomendación completa llega por Telegram!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Aquí ves el resumen. En Telegram recibirás los lugares detallados, 
              podrás votar por tu favorito y pedir nuevas opciones con tu grupo.
            </p>
          </div>
        </motion.div>

          <div className="mt-8 space-y-3">
            {displayCats.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.emoji} {c.label}</span>
                  <span>{c.value}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.value}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full bg-[image:var(--gradient-sunset)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            {insights.map((t, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 text-sm">
                {t}
              </div>
            ))}
          </div>

          <motion.button
            onClick={() => navigate({ to: "/telegram", search: { group_id: code } })}
            className="mt-7 w-full rounded-2xl py-3 flex items-center justify-center gap-2 bg-orange-500 text-white"
          >
            <Sparkles className="h-4 w-4" />
             Ver recomendación completa en Telegram <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </main>
    </div>
  );
}

function computeFallbackScore(parche: Parche | null): number {
  const answers = Object.values(parche?.memberAnswers ?? {});
  if (answers.length === 0) return 72;
  return Math.min(72 + answers.length * 4, 94);
}

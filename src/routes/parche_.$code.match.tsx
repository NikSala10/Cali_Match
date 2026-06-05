import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import { getParche, saveParche, type Parche } from "@/lib/parche-store";
import { finalizeGroupInSupabase } from "@/lib/supabase";

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

function Match() {
  const navigate = useNavigate();
  const { code } = Route.useParams();

  const [parche, setParche] = useState<Parche | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const p = getParche(code);
    setParche(p);

    if (p && (p.status ?? "active") !== "finalizado") {
      const updated: Parche = {
        ...p,
        status: "finalizado",
        finalizedAt: new Date().toISOString(),
      };

      saveParche(updated);
      setParche(updated);

      finalizeGroupInSupabase(code).catch((err) =>
        console.error("[match] No se pudo finalizar en Supabase:", err)
      );
    }
  }, [code]);

  const targetScore =
    parche?.recommendation?.score ?? computeFallbackScore(parche);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setScore(Math.min(i, targetScore));
      if (i >= targetScore) clearInterval(id);
    }, 25);

    return () => clearInterval(id);
  }, [targetScore]);

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

          <div className="mt-8 text-center text-5xl font-bold">
            {score}%
          </div>

          <div className="mt-8 space-y-3">
            {displayCats.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span>{c.value}%</span>
                </div>

                <div className="h-2 bg-white/10 rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.value}%` }}
                    className="h-full bg-orange-400"
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
            onClick={() =>
              navigate({ to: "/telegram", search: { group_id: code } })
            }
            className="mt-7 w-full rounded-2xl py-3 flex items-center justify-center gap-2 bg-orange-500 text-white"
          >
            <Sparkles className="h-4 w-4" />
            Ir a Telegram <ArrowRight className="h-4 w-4" />
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
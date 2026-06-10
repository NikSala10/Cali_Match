import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowRight, Sparkles, Users, Plus, LogOut, Heart, Star, Crown,
} from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import {
  getParches, saveParche, removeParche, clearSession, isParcheActive,
  getSessionId, getSessionEmail, saveSession,
  type Profile, type Parche, type Member, type AdminQuiz,
} from "@/lib/parche-store";
import { supabase, fetchGroupFromSupabase, saveGroupToSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "CaliMatch — Planes para tu parche en Cali" }] }),
  component: LandingSwitch,
});

// ─── Switch ───────────────────────────────────────────────────────────────────
function LandingSwitch() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [parches, setParches] = useState<Parche[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      const localId = getSessionId();
      // Despertar el servidor de Render
      fetch('https://cali-match.onrender.com/test').catch(() => {});
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user ?? null;
      const userId = localId || authUser?.id || null;

      if (!userId) {
        setProfile(null);
        return;
      }

      if (authUser && !localId) {
        saveSession(authUser.id, authUser.email ?? "");
      }

      const meta = authUser?.user_metadata ?? {};
      const nombre = meta.nombre as string | undefined;
      const email = authUser?.email ?? getSessionEmail() ?? "";

      setProfile({
        name: nombre ?? email.split("@")[0] ?? "Usuario",
        email,
      });

      // Load groups where this user is creator or member, then validate against Supabase
      const all = getParches();
      const mine = userId
        ? all.filter(
            (p) =>
              (p.createdBy && p.createdBy === userId) ||
              p.members.some((m) => m.id === userId),
          )
        : all;

      // Show local data immediately while we validate
      setParches(mine);
      // Si no hay parches en local, buscar en Supabase por created_by
      if (mine.length === 0 && userId) {
        try {
          const { data: remoteGroups } = await supabase
            .from("groups")
            .select("*")
            .eq("created_by", userId);

          if (remoteGroups && remoteGroups.length > 0) {
            const recovered: Parche[] = [];
            for (const g of remoteGroups) {
              try {
                const remote = await fetchGroupFromSupabase(g.id);
                const parche: Parche = {
                  code: remote.id as string,
                  name: remote.name as string,
                  size: remote.size as number,
                  createdBy: remote.created_by as string | null,
                  members: (remote.members as Member[]) ?? [],
                  status: (remote.status as Parche["status"]) ?? "active",
                  finalizedAt: remote.finalized_at as string | undefined,
                  memberAnswers: (remote.quizAnswers as Record<string, AdminQuiz>) ?? {},
                };
                saveParche(parche);
                recovered.push(parche);
              } catch {
                // skip
              }
            }
            setParches(recovered);
          }
        } catch (err) {
          console.error("[landing] Error recuperando grupos:", err);
        }
      }

      // Validate each group against Supabase in parallel.
      // Remove stale groups (deleted from DB) and refresh member/answer data.
      if (mine.length > 0) {
        const results = await Promise.allSettled(
          mine.map((p) => fetchGroupFromSupabase(p.code)),
        );

        const validated: Parche[] = [];
        results.forEach((result, i) => {
          const local = mine[i];
          if (result.status === "rejected") {
            // Group no longer exists in Supabase → remove from localStorage
            removeParche(local.code);
          } else {
            const remote = result.value;
            const merged: Parche = {
              ...local,
              name: remote.name as string,
              size: remote.size as number,
              createdBy: remote.created_by as string | null,
              members: (remote.members as Member[]).length > 0
                ? (remote.members as Member[])
                : local.members,
              status: (remote.status as Parche["status"]) ?? local.status ?? "active",
              finalizedAt: (remote.finalized_at as string | undefined) ?? local.finalizedAt,
              memberAnswers: {
                ...(remote.quizAnswers as Record<string, AdminQuiz>),
                ...(local.memberAnswers ?? {}),
              },
            };
            saveParche(merged);
            validated.push(merged);
          }
        });

        setParches(validated);
      }
    };

    loadProfile();
  }, []);

  if (profile === undefined) {
    return (
      <div className="min-h-screen grid place-items-center">
        <GlowBg />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return profile ? (
    <PersonalLanding profile={profile} parches={parches} setParches={setParches} />
  ) : (
    <PublicLanding />
  );
}

// ─── Landing pública ──────────────────────────────────────────────────────────
const categorias = [
  "SALSA", "ROOFTOPS", "BRUNCH", "MIRADOR", "RUMBA", "CULTURA", "CAFÉ", "LIVE BAND",
];

function PublicLanding() {
  return (
    <div className="min-h-screen">
      <GlowBg />

      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#como" className="hover:text-foreground transition">Cómo funciona</a>
            <a href="#grupos" className="hover:text-foreground transition">Grupos</a>
          </nav>
          <Link
            to="/registro"
            className="btn-sunset rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Empezar
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pt-12 md:pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[var(--sunset)] animate-pulse" />
              Hecho en Cali · Para los parches caleños
            </div>
            <h1 className="mt-5 text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              Cali, para<br /><span className="text-gradient-sunset">tu parche.</span>
            </h1>
            <p className="mt-5 text-muted-foreground text-lg max-w-md">
              Planes y lugares personalizados para tu grupo — salsa, rooftops, brunch y rumba.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/registro" className="btn-sunset rounded-full px-6 py-3.5 inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Crear mi parche
              </Link>
              <a href="#como" className="rounded-full px-6 py-3.5 glass hover:bg-white/10 transition inline-flex items-center gap-2">
                Ver cómo funciona <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="absolute -inset-10 bg-[image:var(--gradient-glow)] blur-2xl opacity-70 -z-10" />
            <div className="glass rounded-3xl p-6 max-w-sm mx-auto space-y-3">
              <p className="text-xs text-muted-foreground tracking-widest">PLAN DE HOY 🔥</p>
              {[
                { emoji: "💃", place: "Son de Luz", desc: "Salsa en vivo · San Antonio", tag: "Hoy 9pm" },
                { emoji: "🌇", place: "Rooftop La Flora", desc: "Vista panorámica · Norte", tag: "Hoy 7pm" },
                { emoji: "🥐", place: "Brunch Factory", desc: "Brunch & cocktails · Granada", tag: "Mañana 11am" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }} className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{item.place}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                  </div>
                  <span className="text-[10px] bg-white/10 rounded-full px-2 py-0.5 shrink-0">{item.tag}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="border-y border-white/5 overflow-hidden py-3">
        <motion.div animate={{ x: [0, -1200] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="flex gap-8 whitespace-nowrap">
          {[...categorias, ...categorias, ...categorias].map((c, i) => (
            <span key={i} className="text-[10px] tracking-[0.25em] font-semibold text-muted-foreground flex items-center gap-2">
              <Star className="h-2.5 w-2.5 text-[var(--sunset)]" /> {c}
            </span>
          ))}
        </motion.div>
      </div>

      <section id="como" className="mx-auto max-w-7xl px-5 py-20">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">CÓMO FUNCIONA</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-extrabold">3 pasos, un plan perfecto.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", emoji: "✨", title: "Regístrate", desc: "Crea tu perfil en segundos y cuéntanos qué tipo de salidas disfrutas." },
            { n: "02", emoji: "👥", title: "Arma tu parche", desc: "Invita a tus amigos, cada quien responde qué quiere hacer hoy." },
            { n: "03", emoji: "🎯", title: "Recibe tu plan", desc: "CaliMatch combina los gustos de todos y recomienda el plan perfecto." },
          ].map((s) => (
            <div key={s.n} className="glass rounded-3xl p-7 relative overflow-hidden">
              <span className="absolute top-4 right-5 text-[3.5rem] font-extrabold text-white/5 leading-none">{s.n}</span>
              <div className="text-4xl">{s.emoji}</div>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="grupos" className="mx-auto max-w-7xl px-5 py-16">
        <div className="glass rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[image:var(--gradient-glow)] opacity-30 -z-10" />
          <div className="text-5xl">🔥</div>
          <h2 className="mt-5 text-3xl md:text-5xl font-extrabold">¿Y tu parche qué?</h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Únete a miles de caleños que ya arman sus planes con CaliMatch.
          </p>
          <Link to="/registro" className="mt-8 btn-sunset rounded-full px-8 py-4 inline-flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" /> Crear mi parche gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-5 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
          <Logo size="sm" />
          <span>Hecho con <Heart className="h-3 w-3 inline text-[var(--sunset)]" /> en Cali</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Landing personalizada ─────────────────────────────────────────────────────
const VIBES: Record<string, { label: string; emoji: string }> = {
  salsa: { label: "Salsa", emoji: "💃" },
  rooftop: { label: "Rooftop", emoji: "🌇" },
  brunch: { label: "Brunch", emoji: "🥐" },
  cafe: { label: "Café", emoji: "☕" },
  cultura: { label: "Cultura", emoji: "🎨" },
  perreo: { label: "Rumba", emoji: "🔥" },
};

function PersonalLanding({
  profile,
  parches,
  setParches,
}: {
  profile: Profile;
  parches: Parche[];
  setParches: React.Dispatch<React.SetStateAction<Parche[]>>;
}) {
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const firstName = profile.name?.split(" ")[0];

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Join by code
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setJoining(true);
    setJoinError("");

    // Check local cache first
    const local = getParches().find((p) => p.code === code);
    if (local) {
      setJoining(false);
      void navigate({ to: "/parche/$code", params: { code } });
      return;
    }

    // Fetch from Supabase
    try {
      const remote = await fetchGroupFromSupabase(code);
      const myId = sessionId ?? "me";

      const parche: Parche = {
        code: remote.id as string,
        name: remote.name as string,
        size: remote.size as number,
        type: remote.type as string,
        createdBy: remote.created_by as string | null,
        members: (remote.members as Parche["members"]) ?? [],
        adminAnswered: false,
      };

      // Auto-join as member if not already in
      const alreadyMember = parche.members.some((m) => m.id === myId);
      if (!alreadyMember) {
        const me = {
          id: myId,
          name: profile.name ?? "Tú",
          emoji: "🔥",
          status: "pending" as const,
        };
        parche.members = [...parche.members, me];
        try {
          await saveGroupToSupabase({
            code,
            name: parche.name,
            size: parche.size,
            createdBy: parche.createdBy ?? null,
            members: parche.members,
          });
        } catch {
          // ok
        }
      }

      saveParche(parche);
      setParches((prev) => {
        const idx = prev.findIndex((p) => p.code === code);
        if (idx >= 0) return prev;
        return [parche, ...prev];
      });
      setJoining(false);
      void navigate({ to: "/parche/$code", params: { code } });
    } catch {
      setJoinError("No encontramos ningún parche con ese código. Verifica e intenta de nuevo.");
      setJoining(false);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      clearSession();
      window.location.href = "/landing";
    }
  };

  return (
    <div className="min-h-screen">
      <GlowBg />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#mis-grupos" className="hover:text-foreground transition">Mis grupos</a>
            <a href="#unirse" className="hover:text-foreground transition">Unirse</a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
              <span className="h-6 w-6 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center text-[10px] font-bold text-[oklch(0.16_0.02_280)]">
                {firstName?.[0]?.toUpperCase() ?? "U"}
              </span>
              {firstName}
            </span>
            <button
              onClick={() => setShowLogout(true)}
              title="Cerrar sesión"
              className="glass rounded-full h-9 w-9 grid place-items-center hover:bg-white/10 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-5 pt-12 md:pt-16 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Sesión activa · Bienvenido de vuelta
          </div>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Hola, <span className="text-gradient-sunset">{firstName} 👋</span>
            <br />¿listo pa' otro parche?
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-md">
            Tienes {parches.length} {parches.length === 1 ? "grupo activo" : "grupos activos"}.
            Arma uno nuevo o únete con un código.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/parche/crear" className="btn-sunset rounded-full px-6 py-3.5 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Crear nuevo parche
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Join by code */}
      <section id="unirse" className="mx-auto max-w-7xl px-5 pb-6">
        <div className="glass rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -inset-4 bg-[image:var(--gradient-glow)] blur-3xl -z-10 opacity-25" />
          <h2 className="font-bold text-lg mb-1">Unirse a un parche</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ingresa el código que te compartieron para unirte al grupo.
          </p>
          <form onSubmit={joinGroup} className="flex gap-2 max-w-md">
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setJoinError("");
              }}
              placeholder="Ej: AB1C2D"
              maxLength={8}
              className="cg-input flex-1 font-mono tracking-widest"
            />
            <button
              type="submit"
              disabled={!joinCode.trim() || joining}
              className="btn-sunset rounded-2xl px-5 text-sm inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {joining ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <><ArrowRight className="h-4 w-4" /> Unirme</>
              )}
            </button>
          </form>
          <AnimatePresence>
            {joinError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-xs text-red-400"
              >
                {joinError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* My groups */}
      <section id="mis-grupos" className="mx-auto max-w-7xl px-5 pb-16">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">TUS GRUPOS</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-extrabold">
              Tus parches <span className="text-gradient-sunset">activos.</span>
            </h2>
          </div>
          <Link
            to="/parche/crear"
            className="btn-sunset rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo parche
          </Link>
        </div>

        {parches.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-5xl">🎉</div>
            <h3 className="mt-3 text-xl font-bold">Aún no tienes grupos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea tu primer parche o únete a uno con el código de arriba.
            </p>
            <Link to="/parche/crear" className="mt-5 inline-flex btn-sunset rounded-full px-5 py-2.5 text-sm items-center gap-2">
              <Plus className="h-4 w-4" /> Crear mi primer parche
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parches.map((p) => (
              <GroupCard key={p.code} parche={p} sessionId={sessionId} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-5 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
          <Logo size="sm" />
          <span>Hecho con <Heart className="h-3 w-3 inline text-[var(--sunset)]" /> en Cali</span>
        </div>
      </footer>

      {/* Logout modal */}
      <AnimatePresence>
        {showLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center px-5 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-3xl p-8 w-full max-w-sm text-center"
            >
              <div className="text-4xl mb-4">👋</div>
              <h2 className="text-xl font-bold">¿Cerrar sesión?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Puedes volver cuando quieras con tu correo y contraseña.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowLogout(false)}
                  disabled={loggingOut}
                  className="glass rounded-2xl py-3 text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void logout()}
                  disabled={loggingOut}
                  className="btn-sunset rounded-2xl py-3 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loggingOut ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : "Sí, salir"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .cg-input {
          width: 100%;
          background: oklch(1 0 0 / 0.04);
          border: 1px solid oklch(1 0 0 / 0.08);
          border-radius: 0.9rem;
          padding: 0.75rem 1rem;
          color: var(--foreground);
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .cg-input::placeholder { color: oklch(0.6 0.02 280); }
        .cg-input:focus { outline: none; border-color: var(--sunset); box-shadow: 0 0 0 4px oklch(0.7 0.21 35 / 0.15); }
      `}</style>
    </div>
  );
}

// ─── Group card ────────────────────────────────────────────────────────────────
function GroupCard({ parche, sessionId }: { parche: Parche; sessionId: string | null }) {
  const navigate = useNavigate();
  const isAdmin = !!(parche.createdBy && sessionId && parche.createdBy === sessionId);
  const active = isParcheActive(parche);

  const answeredSet = new Set(Object.keys(parche.memberAnswers ?? {}));
  if (parche.adminAnswered && parche.createdBy) answeredSet.add(parche.createdBy);

  const answeredCount = answeredSet.size;
  const totalMembers = Math.max(parche.members.length, parche.size || 1);
  const progress = totalMembers > 0 ? Math.round((answeredCount / totalMembers) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass rounded-3xl p-5 relative overflow-hidden group cursor-pointer"
      onClick={() => void navigate({ to: "/parche/$code", params: { code: parche.code } })}
    >
      <div className="absolute -inset-10 bg-[image:var(--gradient-glow)] opacity-0 group-hover:opacity-30 blur-3xl -z-10 transition" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold truncate">{parche.name}</h3>
          <p className="text-[10px] tracking-[0.25em] text-muted-foreground mt-0.5 font-mono">
            {parche.code}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-col items-end">
          {isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-[var(--sunset)]/20 text-[var(--sunset)] border border-[var(--sunset)]/30 rounded-full px-2 py-0.5">
              <Crown className="h-2.5 w-2.5" /> admin
            </span>
          )}
          {active ? (
            <span className="text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activo
            </span>
          ) : (
            <span className="text-[10px] rounded-full bg-white/10 text-muted-foreground border border-white/10 px-2 py-0.5">
              ✓ Finalizado
            </span>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {parche.members.slice(0, 5).map((m, i) => (
            <span key={i} className="h-7 w-7 rounded-full border-2 border-background grid place-items-center text-xs bg-[image:var(--gradient-rumba)]">
              {m.emoji}
            </span>
          ))}
          {parche.members.length > 5 && (
            <span className="h-7 w-7 rounded-full border-2 border-background grid place-items-center text-[10px] font-bold bg-white/10">
              +{parche.members.length - 5}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {parche.members.length}/{parche.size}
        </span>
      </div>

      {/* Quiz progress */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{answeredCount}/{totalMembers} respondieron el quiz</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-[image:var(--gradient-sunset)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          void navigate({ to: "/parche/$code", params: { code: parche.code } });
        }}
        className="mt-4 w-full btn-sunset rounded-xl py-2.5 text-xs inline-flex items-center justify-center gap-1.5"
      >
        <ArrowRight className="h-3.5 w-3.5" /> {active ? "Abrir parche" : "Ver resultados"}
      </button>
    </motion.div>
  );
}

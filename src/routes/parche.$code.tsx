import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Check, Clock, Copy, Crown, Edit2, LogOut,
  Plus, Share2, Sparkles, UserMinus, Users, X,
} from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import {
  getParche, saveParche, getSessionId, getProfile, isParcheActive, randomEmoji,
  type Parche, type Member, type AdminQuiz,
} from "@/lib/parche-store";
import {
  saveGroupToSupabase, fetchGroupFromSupabase,
  updateGroupMembersInSupabase, updateGroupInfoInSupabase, finalizeGroupInSupabase,
} from "@/lib/supabase";
import { generateRecommendationFromBackend } from "@/lib/recommendation";

export const Route = createFileRoute("/parche/$code")({
  head: () => ({ meta: [{ title: "Parche — CaliMatch" }] }),
  component: ParcheHub,
});

function ParcheHub() {
  const navigate = useNavigate();
  const { code } = Route.useParams();
  const sessionId = getSessionId();
  const profile = getProfile();

  const [parche, setParche] = useState<Parche | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSize, setEditSize] = useState(4);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const local = getParche(code);

    // Always wait for Supabase to get accurate member count and quiz answers.
    // Showing local data first causes a "1/1" flash when admin has 6 members in DB.
    (async () => {
      try {
        const remote = await fetchGroupFromSupabase(code);
        const merged: Parche = {
          code: remote.id as string,
          name: remote.name as string,
          size: remote.size as number,
          createdBy: remote.created_by as string | null,
          members: (remote.members as Member[]).length > 0
            ? (remote.members as Member[])
            : (local?.members ?? []),
          status: (remote.status as Parche["status"]) ?? "active",
          finalizedAt: remote.finalized_at as string | undefined,
          recommendation: remote.recommendation
          ? {
              score: remote.recommendation.score,
              insights: remote.recommendation.insights ?? [],
              explicacion: remote.recommendation.explicacion ?? "",
              top_lugares: remote.recommendation.top_lugares ?? [],
            }
          : undefined,
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
        // Supabase failed → fall back to localStorage
        if (local) setParche(local);
      }
      setLoading(false);
    })();
  }, [code]);

  const myId = sessionId ?? "me";
  const isAdmin = !!(parche?.createdBy && sessionId && parche.createdBy === sessionId);
  const isMember = parche?.members.some((m) => m.id === myId) ?? false;
  const active = parche ? isParcheActive(parche) : false;
  const hasAnswered = !!(parche?.memberAnswers?.[myId]) || parche?.adminAnswered === true && isAdmin;

  const answeredSet = new Set(Object.keys(parche?.memberAnswers ?? {}));
  if (parche?.adminAnswered && parche?.createdBy) answeredSet.add(parche.createdBy);

  const answeredCount = answeredSet.size;
  const totalMembers = Math.max(parche?.members.length ?? 0, parche?.size ?? 1);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const joinGroup = async () => {
    if (!parche || isMember || !active) return;
    const me: Member = {
      id: myId,
      name: profile?.name ?? "Tú",
      emoji: randomEmoji(),
      status: "pending",
    };
    const updated = { ...parche, members: [...parche.members, me] };
    saveParche(updated);
    setParche(updated);
    try {
      await updateGroupMembersInSupabase(code, updated.members);
    } catch {
      try {
        await saveGroupToSupabase({ code, name: updated.name, size: updated.size, createdBy: parche.createdBy ?? null, members: updated.members });
      } catch (err) { console.error("[groups] join error:", err); }
    }
  };

  const leaveGroup = async () => {
    if (!parche || isAdmin) return;
    const updated = { ...parche, members: parche.members.filter((m) => m.id !== myId) };
    saveParche(updated);
    setParche(updated);
    try {
      await updateGroupMembersInSupabase(code, updated.members);
    } catch (err) { console.error("[groups] leave error:", err); }
    void navigate({ to: "/landing" });
  };

  const removeMember = async (memberId: string) => {
    if (!parche || !isAdmin) return;
    const updated = { ...parche, members: parche.members.filter((m) => m.id !== memberId) };
    saveParche(updated);
    setParche(updated);
    try {
      await updateGroupMembersInSupabase(code, updated.members);
    } catch (err) { console.error("[groups] remove member error:", err); }
  };

  const finalize = async () => {
    if (!parche || !isMember || !active) return;

    if (answeredCount < totalMembers) {
      alert("Aún no todos los integrantes han respondido el quiz");
      return;
    }

    setFinalizing(true);

    // Re-fetch to check if another member already triggered finalization
    try {
      const remote = await fetchGroupFromSupabase(code);
      if (remote.status === "finalizado" || remote.recommendation) {
        void navigate({ to: "/parche/$code/match", params: { code } });
        return;
      }
    } catch {
      // If fetch fails, proceed anyway
    }

    const nowIso = new Date().toISOString();
    let updated = { ...parche, status: "finalizado" as const, finalizedAt: nowIso };

    try {
      const result = await generateRecommendationFromBackend(code);
      updated = {
        ...updated,
        recommendation: {
          persona_prototipica: result.persona_prototipica as unknown as Record<string, unknown>,
          top_lugares: result.top_lugares as unknown as Array<Record<string, unknown>>,
          score: result.score,
          insights: result.insights,
          explicacion: result.explicacion,
        },
      };
      // Always finalize in Supabase on the happy path
      await finalizeGroupInSupabase(code);
    } catch (err) {
      console.error("[groups] recommendation error:", err);
      try {
        await finalizeGroupInSupabase(code);
      } catch (e) {
        console.error("[groups] finalize fallback error:", e);
      }
    }

    saveParche(updated);
    setParche(updated);
    setFinalizing(false);
    void navigate({ to: "/parche/$code/match", params: { code } });
  };

  const openEdit = () => {
    if (!parche) return;
    setEditName(parche.name);
    setEditSize(parche.size);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!parche || !editName.trim()) return;
    setEditSaving(true);
    const updated = { ...parche, name: editName.trim(), size: editSize };
    saveParche(updated);
    setParche(updated);
    try {
      await updateGroupInfoInSupabase(code, { name: editName.trim(), size: editSize });
    } catch (err) { console.error("[groups] edit error:", err); }
    setEditSaving(false);
    setEditOpen(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(code);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading && !parche) {
    return (
      <div className="min-h-screen grid place-items-center px-5">
        <GlowBg />
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-[var(--sunset)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando parche...</p>
        </div>
      </div>
    );
  }

  if (!parche) {
    return (
      <div className="min-h-screen grid place-items-center px-5">
        <GlowBg />
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No encontramos ese parche.</p>
          <Link to="/landing" className="btn-sunset rounded-full px-5 py-2.5 text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const progress = totalMembers > 0 ? Math.round((answeredCount / totalMembers) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />

      <header className="px-5 py-5 flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/landing" className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
      </header>

      <main className="flex-1 px-5 pb-10">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── Header card ─────────────────────────────────────────────────── */}
          <div className="glass rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -inset-4 bg-[image:var(--gradient-glow)] blur-3xl -z-10 opacity-40" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">PARCHE</span>
                  {active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/10 text-muted-foreground border border-white/10 px-2.5 py-0.5">
                      ✓ Finalizado
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-2xl md:text-3xl font-extrabold leading-tight">{parche.name}</h1>
                <p className="text-xs text-muted-foreground mt-1 font-mono tracking-widest">{code}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => void copyLink()} className="h-9 w-9 rounded-xl glass hover:bg-white/10 inline-flex items-center justify-center" title="Copiar link">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                {isAdmin && active && (
                  <button onClick={openEdit} className="h-9 w-9 rounded-xl glass hover:bg-white/10 inline-flex items-center justify-center" title="Editar">
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {parche.members.length}/{parche.size} personas</span>
              <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> {answeredCount} respondieron el quiz</span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!isMember && active && (
                <button onClick={() => void joinGroup()} className="btn-sunset rounded-full px-4 py-2 text-xs inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Unirme al parche
                </button>
              )}
              {isMember && !isAdmin && active && (
                <button onClick={() => void leaveGroup()} className="rounded-full glass px-4 py-2 text-xs inline-flex items-center gap-1.5 text-red-400 hover:bg-red-400/10 transition">
                  <LogOut className="h-3.5 w-3.5" /> Salir del parche
                </button>
              )}
            </div>
          </div>

          {/* ── Quiz progress ─────────────────────────────────────────────── */}
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Progreso del quiz</h2>
              <span className="text-xs text-muted-foreground">{answeredCount}/{totalMembers}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-[image:var(--gradient-sunset)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {active && isMember && (
              <div className="mt-4">
                {!hasAnswered ? (
                  <button
                    onClick={() => void navigate({ to: "/parche/$code/quiz", params: { code } })}
                    className="btn-sunset rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2 w-full justify-center"
                  >
                    <Sparkles className="h-4 w-4" /> Responder mi quiz
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Ya respondiste el quiz
                    </span>
                    <button
                      onClick={() => void navigate({ to: "/parche/$code/quiz", params: { code } })}
                      className="rounded-full glass px-4 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-white/10"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Editar respuestas
                    </button>
                  </div>
                )}
              </div>
            )}

            {!active && (
              <button
                onClick={() => void navigate({ to: "/parche/$code/match", params: { code } })}
                className="mt-4 btn-sunset w-full rounded-full py-2.5 text-sm inline-flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Ver recomendación
              </button>
            )}
          </div>

          {/* ── Members ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold tracking-wide text-muted-foreground mb-3">INTEGRANTES</h2>
            {totalMembers === 0 ? (
              <div className="glass rounded-3xl p-8 text-center">
                <p className="text-muted-foreground text-sm">Aún no hay integrantes.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {parche.members.map((m) => {
                  const memberIsAdmin = m.id === parche.createdBy;
                  const isMe = m.id === myId;
                  const answered = !!(parche.memberAnswers?.[m.id]) || (memberIsAdmin && parche.adminAnswered);
                  return (
                    <motion.div key={m.id} layout className={`glass rounded-2xl p-3 flex items-center gap-3 ${answered ? "ring-1 ring-emerald-400/20" : ""}`}>
                      <div className="h-10 w-10 grid place-items-center rounded-full bg-[image:var(--gradient-rumba)] text-lg shrink-0">
                        {m.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate text-sm">{m.name}</span>
                          {isMe && <span className="text-[10px] text-muted-foreground">(tú)</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {memberIsAdmin && (
                            <span className="text-[10px] text-[var(--sunset)] inline-flex items-center gap-0.5">
                              <Crown className="h-2.5 w-2.5" /> Admin
                            </span>
                          )}
                          <span className={`text-[10px] inline-flex items-center gap-1 ${answered ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {answered ? <><Check className="h-2.5 w-2.5" /> Respondió</> : <><Clock className="h-2.5 w-2.5" /> Pendiente</>}
                          </span>
                        </div>
                      </div>
                      {isAdmin && !memberIsAdmin && !isMe && active && (
                        <button
                          onClick={() => void removeMember(m.id)}
                          className="h-7 w-7 rounded-lg hover:bg-red-400/20 inline-flex items-center justify-center text-red-400 shrink-0"
                          title="Eliminar del parche"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Generate recommendation (visible to all members) ────────────── */}
          {isMember && active && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl p-6 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[image:var(--gradient-glow)] opacity-30 -z-10" />
              <div className="text-3xl mb-2">🎯</div>
              <h2 className="font-extrabold text-lg">¿Listos para el plan?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {answeredCount < totalMembers
                  ? `Faltan ${totalMembers - answeredCount} personas por responder el quiz.`
                  : "¡Todos respondieron! El primero en pulsar genera la recomendación para el parche."}
              </p>
              <button
                onClick={() => void finalize()}
                disabled={finalizing || answeredCount === 0 || answeredCount < totalMembers}
                className="btn-sunset rounded-full px-6 py-3 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {finalizing ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generar recomendación</>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Edit dialog ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center px-5 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass rounded-3xl p-6 w-full max-w-sm space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Editar parche</h3>
                <button onClick={() => setEditOpen(false)} className="h-8 w-8 rounded-lg hover:bg-white/10 grid place-items-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Nombre</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="cg-input mt-1.5" autoFocus />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Cupo máximo</label>
                <div className="mt-2 flex items-center gap-3 glass rounded-2xl p-2">
                  <button type="button" onClick={() => setEditSize(Math.max(2, editSize - 1))} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-lg font-bold">−</button>
                  <span className="flex-1 text-center font-bold text-lg">{editSize}</span>
                  <button type="button" onClick={() => setEditSize(Math.min(20, editSize + 1))} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-lg font-bold">+</button>
                </div>
              </div>

              <button
                onClick={() => void saveEdit()}
                disabled={editSaving || !editName.trim()}
                className="btn-sunset w-full rounded-2xl py-3 disabled:opacity-50"
              >
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
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
        }
        .cg-input::placeholder { color: oklch(0.6 0.02 280); }
        .cg-input:focus { outline: none; border-color: var(--sunset); box-shadow: 0 0 0 4px oklch(0.7 0.21 35 / 0.15); }
      `}</style>
    </div>
  );
}

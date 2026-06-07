import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, Check, CheckCircle, Copy, Loader2, Send, XCircle } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { useSearch } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/telegram")({
  head: () => ({ meta: [{ title: "Abrir Telegram — CaliMatch" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    group_id: String(search.group_id ?? ""),
  }),
  component: TelegramRedirect,
});

const API_BASE = import.meta.env.VITE_API_URL;
const BOT_HANDLE = "calimatch_recommender_bot";

async function sendToTelegram(groupId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/enviar-telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : "No se pudo enviar la recomendación.";
    throw new Error(msg);
  }
}

async function checkVinculacion(groupId: string): Promise<number> {
  const res = await fetch(`${API_BASE}/debug-telegram/${groupId}`);
  if (!res.ok) return 0;
  const data = await res.json() as { usuarios_en_este_grupo?: number };
  return data.usuarios_en_este_grupo ?? 0;
}

function TelegramRedirect() {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [vinculados, setVinculados] = useState<number | null>(null);

  const { group_id: groupId } = useSearch({ from: "/telegram" });

  const botDeepLink = groupId
    ? `https://t.me/${BOT_HANDLE}?start=${groupId}`
    : `https://t.me/${BOT_HANDLE}`;
    console.log("GROUP ID:", groupId);
    console.log("BOT LINK:", botDeepLink);

  const copy = async () => {
    await navigator.clipboard.writeText(botDeepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheck = async () => {
    if (!groupId) return;
    setChecking(true);
    setVinculados(null);
    try {
      const count = await checkVinculacion(groupId);
      setVinculados(count);
    } finally {
      setChecking(false);
    }
  };

  const handleSend = async () => {
    if (!groupId) {
      setSendError("No se encontró el ID del grupo. Vuelve al parche e inténtalo de nuevo.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await sendToTelegram(groupId);
      setSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />
      <header className="px-5 py-5 flex items-center justify-between">
        <Logo />
        <Link to="/landing" className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Mi espacio
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">TELEGRAM</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight">
            Empieza ya.<br />
            <span className="text-gradient-sunset">Sin instalar nada.</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sigue los pasos para recibir tu recomendación en Telegram.
          </p>

          {/* Paso 1 — Vincular */}
          <div className="mt-7 glass rounded-3xl p-5 text-left">
            <p className="text-xs font-bold tracking-widest text-[var(--sunset)] mb-2">
              PASO 1 — VINCULAR EL BOT
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Abre el bot y presiona <strong className="text-foreground">Iniciar</strong>.
              Esto vincula tu Telegram con el parche.
            </p>
            <a
              href={botDeepLink}
              target="_blank"
              rel="noreferrer"
              className="btn-sunset rounded-full px-6 py-3 inline-flex items-center justify-center gap-2 w-full"
            >
              <Send className="h-4 w-4" /> Abrir @CaliMatch Bot
            </a>
            <button
              onClick={copy}
              className="mt-2 glass rounded-full px-6 py-2.5 text-sm inline-flex items-center justify-center gap-2 hover:bg-white/10 transition w-full"
            >
              {copied
                ? <><Check className="h-4 w-4" /> Link copiado</>
                : <><Copy className="h-4 w-4" /> Copiar link del bot</>}
            </button>
          </div>


          {/* Paso 3 — Enviar */}
          <div className="mt-3 glass rounded-3xl p-5 text-left">
            <p className="text-xs font-bold tracking-widest text-[var(--sunset)] mb-2">
              PASO 2 — RECIBIR RECOMENDACIÓN
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Envía la recomendación a todos los integrantes vinculados.
            </p>
            {sent ? (
              <div className="rounded-full px-6 py-3 inline-flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-sm font-semibold w-full">
                <Check className="h-4 w-4" /> Recomendación enviada
              </div>
            ) : (
              <>
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !groupId}
                  className="btn-sunset rounded-full px-6 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50 w-full"
                >
                  {sending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                    : <><Send className="h-4 w-4" /> Enviar recomendación</>}
                </button>
                {sendError && (
                  <p className="text-xs text-red-400 mt-2">{sendError}</p>
                )}
              </>
            )}
          </div>

          <Link
            to="/landing"
            className="mt-4 rounded-full px-6 py-3 text-sm inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a mi espacio
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Plus, Home } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import { getProfile, type Profile } from "@/lib/parche-store";

export const Route = createFileRoute("/bienvenida")({
  head: () => ({ meta: [{ title: "¡Bienvenido! — CaliMatch" }] }),
  component: Bienvenida,
});

function Bienvenida() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const firstName = profile?.name?.split(" ")[0] ?? "tú";

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />
      <header className="px-5 py-5">
        <Logo />
      </header>

      <main className="flex-1 grid place-items-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          {/* Confetti emoji */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            className="text-6xl mb-6"
          >
            🎉
          </motion.div>

          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground mb-5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Perfil creado exitosamente
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            ¡Listo, <span className="text-gradient-sunset">{firstName}!</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-base max-w-sm mx-auto">
            Tu perfil está creado. ¿Qué quieres hacer ahora?
          </p>

          {/* Opciones */}
          <div className="mt-10 grid gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                to="/parche/crear"
                className="glass rounded-2xl p-6 flex items-center gap-5 text-left hover:bg-white/5 transition ring-1 ring-white/10 hover:ring-[var(--sunset)] group block"
              >
                <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-sunset)] grid place-items-center shrink-0">
                  <Plus className="h-6 w-6 text-[oklch(0.16_0.02_280)]" />
                </div>
                <div>
                  <div className="font-bold text-base group-hover:text-[var(--sunset)] transition">
                    Crear mi parche
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Arma un grupo, invita amigos y recibe el plan perfecto
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                to="/landing"
                className="glass rounded-2xl p-6 flex items-center gap-5 text-left hover:bg-white/5 transition ring-1 ring-white/10 hover:ring-white/30 group block"
              >
                <div className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center shrink-0">
                  <Home className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-base">Ir a mi menú</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Ver tu landing personalizada y tus grupos activos
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import { saveProfile, saveSession, clearSession, getSessionId  } from "@/lib/parche-store";
import { supabase } from "@/lib/supabase";


export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Iniciar sesión — CaliMatch" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError("Completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (authError) throw authError;
      if (!authData?.user?.id) {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const meta = authData.user.user_metadata ?? {};
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!profile) {
        setError("No encontramos el perfil asociado a este usuario.");
        setLoading(false);
        return;
      }

      const nombre = (meta.nombre as string | undefined) ?? profile.nombre ?? "";
      const celular = (meta.celular as string | undefined) ?? profile.celular ?? "";
      const fechaNacimiento =
        (meta.fecha_nacimiento as string | undefined) ?? profile.fecha_nacimiento ?? "";

      // Limpiar datos de sesión anterior
      const currentSessionId = getSessionId();

      if (currentSessionId && currentSessionId !== userId) {
        // Solo limpia si es una cuenta diferente
        clearSession();
        localStorage.removeItem('cg.parche');
        localStorage.removeItem('cg.parches');
        localStorage.removeItem('cg.onboarding');
      }

      saveSession(userId, authData.user.email ?? profile.email ?? form.email.trim());
      saveProfile({
        name: nombre,
        email: authData.user.email ?? profile.email ?? form.email.trim(),
        password: "",
        phone: celular,
        birthdate: fechaNacimiento,
      });

      navigate({ to: "/landing" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message ?? "Ocurrió un error. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <GlowBg />

      <header className="px-5 py-5 flex items-center justify-between">
        <Logo />
        <Link
          to="/registro"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-7">
            <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">
              BIENVENIDO DE VUELTA
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-extrabold">
              Inicia <span className="text-gradient-sunset">sesión 👋</span>
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Entra con tu correo y contraseña para continuar.
            </p>
          </div>

          <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 relative">
            <div className="absolute -inset-6 bg-[image:var(--gradient-glow)] blur-3xl -z-10 opacity-60" />

            <Field label="Correo electrónico" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com"
                className="cg-input"
                autoFocus
              />
            </Field>

            <Field label="Contraseña" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Tu contraseña"
                  className="cg-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5"
              >
                {error}{" "}
                {error.includes("registraste") && (
                  <Link to="/registro" className="underline font-medium">
                    Crear cuenta
                  </Link>
                )}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={!form.email.trim() || !form.password.trim() || loading}
              className="btn-sunset w-full rounded-2xl py-3.5 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  Entrar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <span className="text-xs text-muted-foreground">¿No tienes cuenta? </span>
              <Link
                to="/registro"
                className="text-xs text-[var(--sunset)] hover:underline font-medium"
              >
                Regístrate gratis
              </Link>
            </div>
          </form>
        </motion.div>
      </main>

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
        .cg-input:focus {
          outline: none;
          border-color: var(--sunset);
          box-shadow: 0 0 0 4px oklch(0.7 0.21 35 / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label} {required && <span className="text-[var(--sunset)]">*</span>}
      </span>
      {children}
    </label>
  );
}

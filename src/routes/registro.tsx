import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";
import { saveProfile, saveSession } from "@/lib/parche-store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Crea tu perfil — CaliMatch" }] }),
  component: Registro,
});

function Registro() {
  const navigate = useNavigate();
  const maxBirthdate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    birthdate: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => {
      setCooldown((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const phoneDigits = form.phone.replace(/\D/g, "");
  const birthdateOk = Boolean(form.birthdate) && new Date(form.birthdate) < new Date();
  const phoneOk = phoneDigits.length === 10;

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    phoneOk &&
    birthdateOk;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (cooldown > 0) {
      setError(`Espera ${cooldown} segundos antes de volver a intentar.`);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();
      const phoneDigits = form.phone.replace(/\D/g, "");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
         setError("Por favor ingresa un correo válido.");
         setLoading(false);
         return;
      }

      if (phoneDigits.length !== 10) {
        setError("El teléfono debe tener exactamente 10 dígitos.");
        setLoading(false);
        return;
      }

      if (!form.birthdate || new Date(form.birthdate) >= new Date()) {
        setError("La fecha de nacimiento debe ser anterior a hoy.");
        setLoading(false);
        return;
      }

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            nombre: form.name.trim(),
            celular: form.phone.trim(),
            fecha_nacimiento: form.birthdate,
          },
        },
      });

      if (authError) {
        if (authError.message?.includes("rate limit")) setCooldown(30);
        throw authError;
      }

      if (!authData?.user?.id) {
        setError("No se pudo crear la cuenta. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 2. Guardar el perfil en una tabla dedicada (profiles) para no mezclar
      //    el onboarding con los datos de cuenta del usuario.
      const { error: insertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            nombre: form.name.trim(),
            email,
            celular: form.phone.trim(),
            fecha_nacimiento: form.birthdate,
          },
          { onConflict: "id" }
        )
        .select("id")
        .single();

      if (insertError) {
        await supabase.auth.signOut();
        throw insertError;
      }

      // 3. Guardar sesión y perfil local para la UI
      saveSession(userId, email);
      saveProfile({
        name: form.name.trim(),
        email,
        password: form.password,
        phone: form.phone.trim(),
        birthdate: form.birthdate,
      });

      navigate({ to: "/onboarding" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.message?.includes("rate limit")) {
        setError("Demasiados intentos. Espera 30 segundos e intenta de nuevo.");
      } else {
        setError(err.message ?? "Ocurrió un error al crear tu cuenta. Intenta de nuevo.");
      }
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
          to="/"
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
              PASO 1 DE 3
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-extrabold">
              Primero, creemos <span className="text-gradient-sunset">tu perfil ✨</span>
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Solo toma unos segundos para personalizar tu experiencia.
            </p>
          </div>

          <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 relative">
            <div className="absolute -inset-6 bg-[image:var(--gradient-glow)] blur-3xl -z-10 opacity-60" />

            <Field label="Nombre" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="¿Cómo te llamas?"
                className="cg-input"
                autoFocus
              />
            </Field>

            <Field label="Correo electrónico" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com"
                className="cg-input"
              />
            </Field>

            <Field label="Contraseña" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Celular" required>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="300 000 0000"
                  className="cg-input"
                />
              </Field>
              <Field label="Fecha de nacimiento" required>
                <input
                  type="date"
                  value={form.birthdate}
                  max={maxBirthdate}
                  onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                  className="cg-input"
                />
              </Field>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5"
              >
                {error}{" "}
                {error.includes("iniciar sesión") && (
                  <Link to="/login" className="underline font-medium">
                    Ir al login
                  </Link>
                )}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading || cooldown > 0}
              className="btn-sunset w-full rounded-2xl py-3.5 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : cooldown > 0 ? (
                `Espera ${cooldown}s...`
              ) : (
                <>
                  Continuar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Tu info se guarda solo para personalizar tus planes.
            </p>

            <div className="text-center pt-1">
              <span className="text-xs text-muted-foreground">¿Ya tienes cuenta? </span>
              <Link
                to="/login"
                className="text-xs text-[var(--sunset)] hover:underline font-medium"
              >
                Inicia sesión
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

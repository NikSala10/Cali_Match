import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Send,
  Sparkles,
  Users,
  MessageCircle,
  Star,
  Heart,
  MapPin,
} from "lucide-react";
import { GlowBg } from "@/components/GlowBg";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaliMatch — Planes para tu parche en Cali" },
      {
        name: "description",
        content:
          "Arma tu parche y recibe planes personalizados de salsa, rooftops, brunch y rumba en Cali.",
      },
      { property: "og:title", content: "CaliMatch — Planes para tu parche en Cali" },
      {
        property: "og:description",
        content: "Crea tu parche y descubre planes hechos para ustedes.",
      },
    ],
  }),
  component: Landing,
});

const categorias = [
  "SALSA",
  "ROOFTOPS",
  "BRUNCH",
  "MIRADOR",
  "RUMBA",
  "CULTURA",
  "CAFÉ",
  "LIVE BAND",
];

function Landing() {
  return (
    <div className="min-h-screen">
      <GlowBg />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#como" className="hover:text-foreground transition">
              Cómo funciona
            </a>
            <a href="#recos" className="hover:text-foreground transition">
              Recomendaciones
            </a>
            <a href="#grupos" className="hover:text-foreground transition">
              Grupos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/landing"
              className="rounded-full glass px-4 py-2 text-sm inline-flex items-center gap-2 hover:bg-white/10 transition"
            >
              <Users className="h-4 w-4" /> Mis parches
            </Link>
            <Link
              to="/registro"
              className="btn-sunset rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Empezar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-5 pt-12 md:pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[var(--sunset)] animate-pulse" />
              Hecho en Cali · Para los parches caleños
            </div>
            <h1 className="mt-5 text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              Cali, para
              <br />
              <span className="text-gradient-sunset">tu parche.</span>
            </h1>
            <p className="mt-5 text-muted-foreground text-lg max-w-md">
              Planes y lugares personalizados para tu grupo — salsa, rooftops, brunch y rumba —
              recomendados por un asistente conversacional.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/registro"
                className="btn-sunset rounded-full px-6 py-3.5 inline-flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Crear mi parche
              </Link>
              <a
                href="#como"
                className="rounded-full px-6 py-3.5 glass hover:bg-white/10 transition inline-flex items-center gap-2"
              >
                Ver cómo funciona <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#f59e0b", "#ec4899", "#a78bfa", "#22d3ee"].map((c) => (
                  <span
                    key={c}
                    className="h-7 w-7 rounded-full border-2 border-background"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">+2.300 parches</span> ya
                descubrieron Cali con nosotros
              </p>
            </div>
          </motion.div>

          {/* Chat mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-10 bg-[image:var(--gradient-glow)] blur-2xl opacity-70 -z-10" />
            <div className="glass rounded-3xl p-4 shadow-[var(--shadow-card)] max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Send className="h-3.5 w-3.5 text-[var(--sunset)]" />
                CaliMatch Bot
              </div>
              <div className="space-y-2">
                <div className="glass rounded-2xl rounded-tl-sm px-3 py-2 text-sm w-fit">
                  ¿Plan para 4 personas este viernes? 🎉
                </div>
                <div className="bg-[image:var(--gradient-sunset)] rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-[oklch(0.16_0.02_280)] w-fit ml-auto font-medium">
                  Salsa + tragos en San Antonio
                </div>
              </div>
              <div
                className="mt-4 rounded-2xl overflow-hidden relative aspect-[4/3] bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900"
                style={{
                  backgroundImage: `url(${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/places/la-topa-tolondra.jpg)`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                  <div>
                    <div className="font-bold">La Topa Tolondra</div>
                    <div className="text-xs text-white/70">San Antonio · Live band</div>
                  </div>
                  <span className="text-xs font-bold rounded-full bg-[var(--sunset)] text-[oklch(0.16_0.02_280)] px-2 py-1">
                    93% match
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories marquee */}
      <section className="relative border-y border-white/10 bg-black/40 overflow-hidden">
        <div className="flex gap-10 py-5 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
          {[...categorias, ...categorias, ...categorias].map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-10 text-xl md:text-2xl font-bold tracking-wider"
            >
              {c}
              <span className="text-[var(--sunset)]">✦</span>
            </div>
          ))}
        </div>
        <style>{`@keyframes scroll { to { transform: translateX(-33.333%); } }`}</style>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="mx-auto max-w-7xl px-5 py-24">
        <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">CÓMO FUNCIONA</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-extrabold">
          Tres pasos. <span className="text-gradient-sunset">Cero fricción.</span>
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            {
              i: Users,
              t: "Crea tu parche",
              d: "Invita a tus amigos con un link y arma tu grupo en segundos.",
            },
            {
              i: MessageCircle,
              t: "Chatea con el bot",
              d: "Cuéntale al bot qué quieren: salsa, brunch, rooftop, presupuesto.",
            },
            {
              i: Sparkles,
              t: "Reciban su plan",
              d: "El bot combina los gustos del grupo y entrega los mejores planes.",
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-6 relative overflow-hidden group hover:border-[var(--sunset)]/40 transition"
            >
              <span className="absolute right-5 top-4 text-5xl font-black text-white/5 group-hover:text-white/10 transition">
                0{i + 1}
              </span>
              <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-sunset)] grid place-items-center glow-orange">
                <s.i className="h-5 w-5 text-[oklch(0.16_0.02_280)]" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recomendaciones */}
      <section id="recos" className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">
              RECOMENDACIONES
            </p>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold">
              Curado para tu <span className="text-gradient-rumba">vibra.</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cada plan combina las preferencias de todo tu grupo. Match exacto, ambiente real.
          </p>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {[
            {
              zone: "Granada",
              title: "Mirador Granada",
              tag: "ROOFTOP",
              desc: "Atardecer · Cócteles",
              match: 96,
              rating: 4.8,
              img: "places/mirador-granada.jpg",
              grad: "from-orange-600 via-pink-600 to-purple-700",
              emoji: "🌅",
            },
            {
              zone: "San Antonio",
              title: "La Topa Tolondra",
              tag: "SALSA",
              desc: "Pista · Live band",
              match: 93,
              rating: 4.9,
              img: "places/la-topa-tolondra.jpg",
              grad: "from-fuchsia-700 via-purple-700 to-indigo-900",
              emoji: "💃",
            },
            {
              zone: "San Fernando",
              title: "Macondo Café",
              tag: "BRUNCH",
              desc: "Tropical · Chill",
              match: 88,
              rating: 4.7,
              img: "places/macondo-cafe.jpg",
              grad: "from-amber-600 via-orange-600 to-rose-600",
              emoji: "🌿",
            },
          ].map((c, i) => {
            const imgUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${c.img}`;
            return (
              <motion.div
                key={i}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl overflow-hidden aspect-[3/4] cursor-pointer"
              >
                {/* Imagen desde Supabase Storage con fallback a degradado */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${c.grad}`}
                  style={{
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <span className="glass rounded-full px-3 py-1 text-xs inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {c.zone}
                  </span>
                  <span className="bg-[image:var(--gradient-sunset)] text-[oklch(0.16_0.02_280)] font-bold rounded-full px-3 py-1 text-xs">
                    {c.match}% match
                  </span>
                </div>
                <div className="absolute bottom-0 p-5 w-full">
                  <span className="text-xs font-bold tracking-widest text-white/80">
                    {c.emoji} {c.tag}
                  </span>
                  <h3 className="mt-1 text-2xl font-extrabold">{c.title}</h3>
                  <p className="text-sm text-white/70">{c.desc}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-[var(--amber-glow)] text-[var(--amber-glow)]" />{" "}
                      {c.rating} · Ideal para 3-6
                    </span>
                    <Heart className="h-4 w-4 text-white/60 hover:text-[var(--pink-glow)] transition" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Grupos */}
      <section
        id="grupos"
        className="mx-auto max-w-7xl px-5 py-24 grid md:grid-cols-2 gap-12 items-center"
      >
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">GRUPOS</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-extrabold">
            Decidir en grupo, <span className="text-gradient-rumba">sin drama.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            CaliMatch combina los gustos de cada integrante para proponer planes donde todos quieren
            ir. Sin chats interminables, sin "yo voy a donde sea".
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Crea tu parche con un link",
              "Cada quien define sus vibras favoritas",
              "Recomendaciones con compatibilidad grupal",
              "Vota, guarda y arranca",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-5 w-5 rounded-full bg-[image:var(--gradient-sunset)] grid place-items-center text-[10px] text-[oklch(0.16_0.02_280)] font-bold">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-3xl p-6 relative">
          <div className="absolute -inset-8 bg-[image:var(--gradient-glow)] blur-3xl -z-10 opacity-50" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Parche</p>
              <p className="text-xl font-bold">Los Salseros 💃</p>
            </div>
            <span className="text-xs rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 border border-emerald-400/30">
              Activo
            </span>
          </div>
          <div className="mt-4 flex -space-x-2">
            {["#f59e0b", "#06b6d4", "#a3e635", "#fb923c", "#a78bfa"].map((c, i) => (
              <span
                key={i}
                className="h-9 w-9 rounded-full border-2 border-background grid place-items-center text-xs font-bold"
                style={{ background: c, color: "#111" }}
              >
                {["M", "A", "S", "L", "+2"][i]}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Salsa", 95],
              ["Rooftop", 78],
              ["Brunch", 62],
            ].map(([n, v]) => (
              <div key={n as string}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{n}</span>
                  <span className="text-muted-foreground">{v}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-[image:var(--gradient-sunset)]"
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/registro"
            className="mt-6 btn-sunset rounded-2xl w-full py-3 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Generar nuevo plan
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="relative rounded-[2rem] overflow-hidden p-10 md:p-14 glass">
          <div className="absolute inset-0 bg-[image:var(--gradient-glow)] opacity-80 -z-10" />
          <p className="text-xs tracking-[0.2em] text-[var(--sunset)] font-semibold">EMPIEZA</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-extrabold">
            Empieza ya. <br />
            <span className="text-gradient-sunset">Sin instalar nada.</span>
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Crea tu perfil, arma tu parche y recibe tu primer plan en menos de 60 segundos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/registro"
              className="btn-sunset rounded-full px-6 py-3.5 inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Empezar experiencia
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-5 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo size="sm" /> · Hecho con{" "}
            <Heart className="h-3 w-3 inline text-[var(--pink-glow)]" /> en Cali
          </div>
          <div className="flex gap-5">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Contacto</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

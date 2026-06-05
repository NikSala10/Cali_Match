import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { getSessionId } from "@/lib/parche-store";

// ─── Rutas que NO requieren sesión ────────────────────────────────────────────
const PUBLIC_ROUTES = ["/", "/registro", "/login"];

// ─── Rutas que NO deben ser accesibles si YA hay sesión ───────────────────────
const GUEST_ONLY_ROUTES = ["/", "/registro", "/login"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no cargó
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo salió mal. Puedes intentar recargar o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Intentar de nuevo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CaliMatch" },
      {
        name: "description",
        content:
          "Cali Vibe Match helps friends discover and plan outings in Cali by matching group preferences.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "CaliMatch" },
      {
        property: "og:description",
        content:
          "Cali Vibe Match helps friends discover and plan outings in Cali by matching group preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "CaliMatch" },
      {
        name: "twitter:description",
        content:
          "Cali Vibe Match helps friends discover and plan outings in Cali by matching group preferences.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGuard() {
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    const currentPath = router.state.location.pathname;
    const hasSession = !!getSessionId();

    // Si tiene sesión e intenta acceder a rutas de invitado → redirigir a landing
    if (hasSession && GUEST_ONLY_ROUTES.includes(currentPath)) {
      navigate({ to: "/landing", replace: true });
      return;
    }

    // Si no tiene sesión e intenta acceder a rutas protegidas → redirigir a inicio
    const isPublic =
      PUBLIC_ROUTES.some((r) => currentPath.startsWith(r) && r !== "/") || currentPath === "/";

    if (!hasSession && !isPublic) {
      navigate({ to: "/", replace: true });
    }
  }, [router.state.location.pathname]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Outlet />
    </QueryClientProvider>
  );
}

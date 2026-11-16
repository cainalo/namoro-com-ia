import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import moradosFeedCss from "../styles/morados-feed.css?url";
import { Capacitor } from "@capacitor/core";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Esta página não existe.</p>
        <div className="mt-5">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Não foi possível abrir esta página.
        </h1>
        <details className="mt-4 text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer">Detalhes técnicos</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-left">
            {error instanceof Error ? `${error.name}: ${error.message}\\n${error.stack ?? ""}` : String(error)}
          </pre>
        </details>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-semibold text-foreground"
          >
            Início
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
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Morados" },
      { name: "description", content: "Morados — um espaço privado para duas pessoas." },
      { property: "og:title", content: "Morados" },
      { property: "og:description", content: "Morados — um espaço privado para duas pessoas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#555f36" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Morados" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700;800&family=Libre+Baskerville:wght@400;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: moradosFeedCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/morados-icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/morados-icon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Bloqueia pinça, duplo-toque de zoom e zoom via roda/atalhos de navegador.
    // Gestos de toque simples e a rolagem normal continuam funcionando.
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    const preventGesture = (event: Event) => event.preventDefault();
    const preventWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    const preventKeyboardZoom = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["+", "-", "=", "0"].includes(event.key)) {
        event.preventDefault();
      }
    };
    document.addEventListener("touchstart", preventMultiTouch, { capture: true, passive: false });
    document.addEventListener("touchmove", preventMultiTouch, { capture: true, passive: false });
    document.addEventListener("gesturestart", preventGesture, { capture: true, passive: false });
    document.addEventListener("gesturechange", preventGesture, { capture: true, passive: false });
    document.addEventListener("gestureend", preventGesture, { capture: true, passive: false });
    document.addEventListener("wheel", preventWheelZoom, { capture: true, passive: false });
    document.addEventListener("keydown", preventKeyboardZoom, true);
    return () => {
      document.removeEventListener("touchstart", preventMultiTouch, true);
      document.removeEventListener("touchmove", preventMultiTouch, true);
      document.removeEventListener("gesturestart", preventGesture, true);
      document.removeEventListener("gesturechange", preventGesture, true);
      document.removeEventListener("gestureend", preventGesture, true);
      document.removeEventListener("wheel", preventWheelZoom, true);
      document.removeEventListener("keydown", preventKeyboardZoom, true);
    };
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/morados-sw.js", { scope: "/" })
      .catch((error: unknown) => {
        console.error("Não foi possível registrar o modo instalável do Morados.", error);
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

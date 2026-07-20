import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "BhashaBridge — AI translation for every Indian student" },
      {
        name: "description",
        content:
          "Translate text, voice, documents and images across 17+ Indian and world languages. Free AI study assistant for learners across Bharat.",
      },
      { name: "author", content: "BhashaBridge" },
      { property: "og:title", content: "BhashaBridge — AI translation for every Indian student" },
      {
        property: "og:description",
        content:
          "Translate text, voice, documents and images across 17+ Indian and world languages. Free AI study assistant for learners across Bharat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "BhashaBridge — AI translation for every Indian student" },
      {
        name: "twitter:description",
        content:
          "Translate text, voice, documents and images across 17+ Indian and world languages. Free AI study assistant for learners across Bharat.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f6e9f038-0ac6-4a04-ab0f-98189051cfe4/id-preview-6f270811--27bf4bce-ea3a-4f37-90d2-a950af411325.lovable.app-1781933804233.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f6e9f038-0ac6-4a04-ab0f-98189051cfe4/id-preview-6f270811--27bf4bce-ea3a-4f37-90d2-a950af411325.lovable.app-1781933804233.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const chatLoaded = useRef(false);

  useEffect(() => {
    if (chatLoaded.current) return;
    chatLoaded.current = true;

    // Dynamically load n8n chat CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css";
    document.head.appendChild(link);

    // Dynamically import and initialize n8n chatbot
    import("https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js")
      .then((mod) => {
        const createChat = mod.createChat ?? mod.default?.createChat;
        if (typeof createChat === "function") {
          createChat({
            webhookUrl:
              "https://bashabridge-automation.app.n8n.cloud/webhook/ca92c38c-bfb0-413e-ac04-af1076ca3c3f/chat",
            mode: "window",
            showWelcomeScreen: true,
            initialMessages: ["Hi! 👋 How can I help you today?"],
            i18n: {
              en: {
                title: "BhashaBridge Assistant",
                subtitle: "Ask me anything about translation!",
                footer: "",
                getStarted: "Start Chat",
                inputPlaceholder: "Type your message…",
              },
            },
          });
        }
      })
      .catch((err) => console.warn("n8n chat failed to load:", err));
  }, []);

  return (
    <html lang="en" className="dark">
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
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
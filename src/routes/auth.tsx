import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BhashaBridge" },
      { name: "description", content: "Sign in to save your translation history and study notes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      // Direct Supabase OAuth bypass on localhost to avoid Lovable proxy port issues
      if (window.location.hostname === "localhost") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        return;
      }

      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) throw res.error;
      if (res.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Google sign-in failed");
    }
  }

  function handleDevBypass() {
    localStorage.setItem("sb-mock-login", "true");
    localStorage.setItem("sb-mock-name", "Developer Admin");
    localStorage.setItem("sb-mock-role", "Admin");
    localStorage.setItem("sb-mock-bio", "Developer bypass active");
    localStorage.setItem("sb-mock-loc", "Localhost");
    toast.success("Developer bypass active — logging in as Admin");
    navigate({ to: "/dashboard" });
    // Force a minor delay and reload to ensure local storage hooks sync cleanly
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center px-6 py-12">
        <div className="glass rounded-3xl p-8 w-full max-w-md">
          <div className="text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-[var(--gradient-saffron)] shadow-[var(--shadow-glow)]">
              <Languages className="w-6 h-6 text-[oklch(0.18_0.04_275)]" />
            </span>
            <h1 className="font-display text-3xl font-semibold mt-4">
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in to access your dashboard"
                : "Save your translations and study notes"}
            </p>
          </div>

          <Button
            onClick={google}
            variant="ghost"
            className="w-full mt-6 border border-white/10 hover:bg-white/5 h-11"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.5C16.7 3.85 14.55 3 12 3 6.96 3 2.9 7.04 2.9 12s4.06 9 9.1 9c5.25 0 8.73-3.68 8.73-8.87 0-.6-.07-1.05-.18-1.53Z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-white/10" /> or email{" "}
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] border-0 hover:opacity-90"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-[var(--saffron)] hover:underline"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-3">
            <Link to="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </p>
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <Button
              type="button"
              onClick={handleDevBypass}
              variant="outline"
              className="w-full text-xs font-semibold border-rose-500/30 hover:bg-rose-500/10 text-rose-400 h-9 rounded-xl gap-1.5"
            >
              🔧 Bypass Authentication (Dev Mode)
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

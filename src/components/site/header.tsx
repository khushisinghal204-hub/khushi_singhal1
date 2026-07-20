import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Languages, LogOut, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import ContactModal from "../ContactModal";

const navItems = [
  { to: "/translator", label: "Text" },
  { to: "/voice", label: "Voice" },
  { to: "/documents", label: "Documents" },
  { to: "/image", label: "Image" },
  { to: "/study", label: "Study" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const { theme } = useTheme();         // ensures dark/light class applies on mount
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl transition-all duration-300
        ${scrolled
          ? "bg-background/80 shadow-[0_4px_24px_oklch(0_0_0/20%)]"
          : "bg-background/60"
        }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-[var(--gradient-saffron)] shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform">
            <Languages className="w-5 h-5 text-[oklch(0.18_0.04_275)]" />
          </span>
          <span className="font-display text-xl font-semibold">
            Bhasha<span className="text-gradient-saffron">Bridge</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-white/5 transition-colors"
              activeProps={{ className: "text-foreground bg-white/5 font-medium" }}
            >
              {n.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="px-3 py-2 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Contact
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle — always visible */}
          <ThemeToggle />

          {user ? (
            <>
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  localStorage.removeItem("sb-mock-login");
                  localStorage.removeItem("sb-mock-name");
                  localStorage.removeItem("sb-mock-role");
                  localStorage.removeItem("sb-mock-bio");
                  localStorage.removeItem("sb-mock-loc");
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button
                size="sm"
                className="bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] hover:opacity-90 border-0"
              >
                Sign in
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-white/10
          ${mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2.5 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-white/5 transition-colors"
              activeProps={{ className: "text-foreground bg-white/5 font-medium" }}
              onClick={() => setMobileOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => { setIsContactOpen(true); setMobileOpen(false); }}
            className="px-3 py-2.5 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-white/5 transition-colors text-left"
          >
            Contact
          </button>
          {user && (
            <Link
              to="/dashboard"
              className="px-3 py-2.5 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>
          )}
        </nav>
      </div>

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </header>
  );
}
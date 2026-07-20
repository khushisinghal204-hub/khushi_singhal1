import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="relative w-9 h-9 grid place-items-center rounded-xl border border-white/10
                 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground
                 transition-all duration-200 overflow-hidden group"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Dark icon */}
      <span
        className={`absolute inset-0 grid place-items-center transition-all duration-300
          ${theme === "dark" ? "opacity-100 scale-100" : "opacity-0 scale-75 rotate-90"}`}
      >
        <Moon className="w-4 h-4" />
      </span>

      {/* Light icon */}
      <span
        className={`absolute inset-0 grid place-items-center transition-all duration-300
          ${theme === "light" ? "opacity-100 scale-100" : "opacity-0 scale-75 -rotate-90"}`}
      >
        <Sun className="w-4 h-4 text-amber-500" />
      </span>

      {/* Glow ring on hover */}
      <span className="absolute inset-0 rounded-xl ring-0 group-hover:ring-2 ring-primary/30 transition-all duration-200 pointer-events-none" />
    </button>
  );
}

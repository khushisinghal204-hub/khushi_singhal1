import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} BhashaBridge — built for students of Bharat.</p>
        <div className="flex gap-5">
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/translator" className="hover:text-foreground">
            Translator
          </Link>
          <Link to="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}

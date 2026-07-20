import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Mic,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Type,
  BookOpen,
} from "lucide-react";
import hero from "@/assets/hero-bhasha.jpg";
import { LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BhashaBridge — Translate any language for students" },
      {
        name: "description",
        content:
          "Free AI translator for Indian students. Translate text, voice, PDFs and images across Hindi, Tamil, Bengali, English and 13 more languages.",
      },
      { property: "og:title", content: "BhashaBridge — Translate any language for students" },
      {
        property: "og:description",
        content:
          "AI translation across 17+ Indian and world languages. Built for learners across Bharat.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Type,
    title: "Text Translation",
    desc: "Instant, accurate translation across 17 languages.",
    to: "/translator",
  },
  {
    icon: Mic,
    title: "Voice Translator",
    desc: "Speak your question — get it back in any language.",
    to: "/voice",
  },
  {
    icon: FileText,
    title: "Document Translator",
    desc: "Upload a PDF or notes and get a translated copy.",
    to: "/documents",
  },
  {
    icon: ImageIcon,
    title: "Image Translator",
    desc: "Snap a photo of a textbook — read it in your language.",
    to: "/image",
  },
  {
    icon: BookOpen,
    title: "AI Study Assistant",
    desc: "Simplify, summarize, and pull out the key points.",
    to: "/study",
  },
  {
    icon: Sparkles,
    title: "Save & Revisit",
    desc: "Sign in to keep a history of every translation.",
    to: "/dashboard",
  },
] as const;

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage: `url(${hero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(180deg, black 30%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, black 30%, transparent 100%)",
          }}
        />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <span
              className="w-1.5 h-1.5 rounded-full bg-saffron animate-pulse"
              style={{ background: "var(--saffron)" }}
            />
            AI-powered · Built for Indian students
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold leading-[1.05] max-w-4xl mx-auto">
            A bridge between every <span className="text-gradient-saffron">bhasha</span> and every
            learner.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Translate notes, lectures, textbooks and PDFs across 17 Indian and world languages —
            instantly, accurately, and free for students.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/translator">
              <Button
                size="lg"
                className="h-12 px-6 bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] hover:opacity-90 border-0 shadow-[var(--shadow-glow)]"
              >
                Start translating <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/about">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-6 text-foreground hover:bg-white/5"
              >
                How it works
              </Button>
            </Link>
          </div>

          {/* Language pills */}
          <div className="mt-14 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {LANGUAGES.filter((l) => l.code !== "auto").map((l, i) => (
              <span
                key={l.code}
                className="px-3 py-1.5 text-sm rounded-full glass hover:border-white/20 transition-colors"
                style={{
                  animation: `float-slow ${6 + (i % 4)}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <span className="font-display">{l.native}</span>
                <span className="text-muted-foreground ml-2 text-xs">{l.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="ornament-divider max-w-3xl mx-auto" />

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl md:text-5xl font-semibold">
            Six tools. One bridge.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Everything a student needs to learn comfortably in their own language.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <Link key={f.title} to={f.to} className="group">
              <div className="h-full glass rounded-2xl p-6 transition-all hover:translate-y-[-2px] hover:shadow-[var(--shadow-card)] hover:border-white/20">
                <div className="w-11 h-11 rounded-xl grid place-items-center bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] shadow-[var(--shadow-glow)]">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                <div className="mt-5 inline-flex items-center text-sm text-foreground opacity-70 group-hover:opacity-100">
                  Open{" "}
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="glass rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{ background: "var(--gradient-aurora)" }}
          />
          <h2 className="font-display text-3xl md:text-5xl font-semibold">
            Built so no student is left behind.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Whether your textbook is in Tamil, your notes in English, or your teacher speaks in
            Bengali — BhashaBridge brings it together.
          </p>
          <Link to="/translator" className="inline-block mt-8">
            <Button
              size="lg"
              className="h-12 px-8 bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] hover:opacity-90 border-0"
            >
              Try the translator
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

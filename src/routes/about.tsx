import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Heart, Globe, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About BhashaBridge" },
      {
        name: "description",
        content:
          "BhashaBridge is built so no Indian student is left behind by the language of their study material.",
      },
      { property: "og:title", content: "About BhashaBridge" },
      {
        property: "og:description",
        content: "Our mission: bridge every Indian bhasha to every learner.",
      },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  {
    icon: Heart,
    title: "Built for Bharat",
    desc: "From Kashmir to Kanyakumari — every bhasha deserves first-class support.",
  },
  {
    icon: Globe,
    title: "17+ Languages",
    desc: "All major Indian languages plus English, French, German, Spanish, Chinese, Japanese.",
  },
  {
    icon: Zap,
    title: "Instant & Accurate",
    desc: "Powered by frontier AI models tuned for educational content.",
  },
  {
    icon: ShieldCheck,
    title: "Free for Students",
    desc: "No paywall, no ads. Sign in to save your study history.",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-16">
        <h1 className="font-display text-5xl md:text-6xl font-semibold">Our mission</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          India speaks in many tongues — but most educational content still lives in just a few.
          BhashaBridge is a free, AI-powered translation platform built so a Tamil-medium student
          can read an English paper, a Hindi-speaking learner can study a Bengali handout, and no
          one ever has to give up on understanding because of the language.
        </p>

        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          {pillars.map((p) => (
            <div key={p.title} className="glass rounded-2xl p-6">
              <p.icon className="w-6 h-6 text-[var(--saffron)]" />
              <h3 className="mt-4 font-display text-xl">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="ornament-divider my-16" />

        <h2 className="font-display text-3xl font-semibold">Who it's for</h2>
        <ul className="mt-4 space-y-2 text-muted-foreground">
          <li>· School and college students</li>
          <li>· Teachers preparing multilingual material</li>
          <li>· Researchers reading regional sources</li>
          <li>· Competitive exam aspirants studying across languages</li>
        </ul>

        <div className="mt-16">
          <h2 className="font-display text-3xl font-semibold">Contact</h2>
          <p className="mt-3 text-muted-foreground">
            We'd love to hear from teachers, students and developers building on top of
            BhashaBridge. Reach out at{" "}
            <a
              className="text-[var(--saffron)] hover:underline"
              href="mailto:hello@bhashabridge.app"
            >
              hello@bhashabridge.app
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

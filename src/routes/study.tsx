import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { LanguagePicker } from "@/components/site/language-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { studyAssist } from "@/lib/ai.functions";
import { saveTranslation } from "@/lib/history.functions";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Loader2, Wand2, ListChecks, BookText } from "lucide-react";
import { toast } from "sonner";
import { languageName } from "@/lib/languages";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "AI Study Assistant — BhashaBridge" },
      {
        name: "description",
        content:
          "Simplify long passages, summarize chapters, and pull out key points in any language.",
      },
      { property: "og:title", content: "AI Study Assistant — BhashaBridge" },
      {
        property: "og:description",
        content: "Simplify, summarize and extract key points from any text.",
      },
    ],
  }),
  component: StudyPage,
});

const modes = [
  { id: "simplify" as const, label: "Simplify", icon: Wand2, desc: "Explain like I'm 14" },
  { id: "summarize" as const, label: "Summarize", icon: BookText, desc: "Concise paragraph" },
  { id: "keypoints" as const, label: "Key Points", icon: ListChecks, desc: "Numbered list" },
];

function StudyPage() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("simplify");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const assist = useServerFn(studyAssist);
  const save = useServerFn(saveTranslation);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    setOut("");
    try {
      const { result } = await assist({ data: { text, mode, language: languageName(language) } });
      setOut(result);
      if (user)
        save({
          data: {
            kind: "study",
            sourceLang: mode,
            targetLang: language,
            sourceText: text,
            translatedText: result,
            saved: false,
          },
        }).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">AI Study Assistant</h1>
        <p className="mt-2 text-muted-foreground">
          Paste anything you're studying. Pick a mode. Learn faster.
        </p>

        <div className="mt-8 grid md:grid-cols-3 gap-3">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`glass rounded-2xl p-5 text-left transition-all ${mode === m.id ? "border-white/30 shadow-[var(--shadow-glow)]" : "hover:border-white/20"}`}
            >
              <m.icon
                className={`w-5 h-5 ${mode === m.id ? "text-[var(--saffron)]" : "text-muted-foreground"}`}
              />
              <div className="font-display text-lg mt-3">{m.label}</div>
              <div className="text-sm text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 grid md:grid-cols-[1fr_220px] gap-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text you want help with…"
            className="glass min-h-[260px] resize-none text-base"
            maxLength={20000}
          />
          <div className="flex flex-col gap-3">
            <LanguagePicker value={language} onChange={setLanguage} label="Response language" />
            <Button
              onClick={run}
              disabled={busy || !text.trim()}
              className="bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] border-0 hover:opacity-90 h-11"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Help me study
            </Button>
          </div>
        </div>

        {out && (
          <div className="glass rounded-2xl p-6 mt-8 whitespace-pre-wrap text-base">{out}</div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

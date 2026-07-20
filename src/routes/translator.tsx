import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { LanguagePicker } from "@/components/site/language-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { translateText, detectLanguage } from "@/lib/ai.functions";
import { saveTranslation } from "@/lib/history.functions";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRightLeft, Copy, Loader2, Volume2, Save, Sparkles, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { languageName, LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/translator")({
  head: () => ({
    meta: [
      { title: "Text Translator — BhashaBridge" },
      {
        name: "description",
        content: "Translate text instantly across 17 Indian and world languages.",
      },
      { property: "og:title", content: "Text Translator — BhashaBridge" },
      {
        property: "og:description",
        content: "Translate text instantly across 17 Indian and world languages.",
      },
    ],
  }),
  component: TranslatorPage,
});

function TranslatorPage() {
  const { user } = useAuth();
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("hi");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const translate = useServerFn(translateText);
  const save = useServerFn(saveTranslation);
  const detect = useServerFn(detectLanguage);
  const [detecting, setDetecting] = useState(false);

  async function run() {
    if (!text.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const { translation } = await translate({
        data: { text, sourceLang: languageName(source), targetLang: languageName(target) },
      });
      setOutput(translation);
      if (user) {
        save({
          data: {
            kind: "text",
            sourceLang: source,
            targetLang: target,
            sourceText: text,
            translatedText: translation,
            saved: false,
          },
        }).catch(() => {});
      }
    } catch (e: any) {
      toast.error(e.message ?? "Translation failed");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    if (source === "auto") return;
    setSource(target);
    setTarget(source);
    setText(output);
    setOutput(text);
  }

  function copyOut() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  }

  async function runDetect() {
    if (!text.trim()) return toast.message("Type some text first");
    setDetecting(true);
    try {
      const { code, name } = await detect({ data: { text } });
      const known = LANGUAGES.find((l) => l.code === code);
      if (known) {
        setSource(known.code);
        toast.success(`Detected: ${known.native} (${known.name})`);
      } else {
        toast.success(`Detected: ${name || code || "unknown"}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Detection failed");
    } finally {
      setDetecting(false);
    }
  }

  function speak() {
    if (!output) return;
    const u = new SpeechSynthesisUtterance(output);
    window.speechSynthesis.speak(u);
  }

  async function saveOne() {
    if (!user) return toast.message("Sign in to save translations");
    if (!output) return;
    try {
      await save({
        data: {
          kind: "text",
          sourceLang: source,
          targetLang: target,
          sourceText: text,
          translatedText: output,
          saved: true,
        },
      });
      toast.success("Saved to your dashboard");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
        <header className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Text Translator</h1>
          <p className="mt-2 text-muted-foreground">
            Paste or type any text. Choose a target language. Done.
          </p>
        </header>

        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
          <LanguagePicker value={source} onChange={setSource} includeAuto label="From" />
          <Button
            variant="ghost"
            size="icon"
            onClick={swap}
            className="self-end h-11 w-11 rounded-xl hover:bg-white/5"
            aria-label="Swap languages"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
          <LanguagePicker value={target} onChange={setTarget} label="To" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste your text here…"
              className="min-h-[280px] bg-transparent border-0 resize-none text-base focus-visible:ring-0"
              maxLength={20000}
            />
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>{text.length}/20000</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={runDetect}
                  disabled={detecting || !text.trim()}
                >
                  {detecting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <ScanSearch className="w-4 h-4 mr-1.5" />
                  )}
                  Detect
                </Button>
                <Button
                  onClick={run}
                  disabled={loading || !text.trim()}
                  className="bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] border-0 hover:opacity-90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Translate
                </Button>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 min-h-[280px] relative">
            {loading && (
              <div className="absolute inset-x-4 top-4 h-1 rounded-full animate-shimmer" />
            )}
            <div className="whitespace-pre-wrap min-h-[240px] text-base">
              {output || (
                <span className="text-muted-foreground">Your translation will appear here…</span>
              )}
            </div>
            {output && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={copyOut}>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={speak}>
                  <Volume2 className="w-4 h-4 mr-1.5" />
                  Listen
                </Button>
                <Button size="sm" variant="ghost" onClick={saveOne}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

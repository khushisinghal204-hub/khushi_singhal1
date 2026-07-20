import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { LanguagePicker } from "@/components/site/language-picker";
import { Button } from "@/components/ui/button";
import { translateImage } from "@/lib/ai.functions";
import { saveTranslation } from "@/lib/history.functions";
import { useAuth } from "@/hooks/use-auth";
import { Image as ImageIcon, Loader2, ScanText } from "lucide-react";
import { toast } from "sonner";
import { languageName } from "@/lib/languages";

export const Route = createFileRoute("/image")({
  head: () => ({
    meta: [
      { title: "Image Translator — BhashaBridge" },
      {
        name: "description",
        content: "Upload an image of text and instantly read it in your language with AI OCR.",
      },
      { property: "og:title", content: "Image Translator — BhashaBridge" },
      { property: "og:description", content: "AI OCR + translation for any image with text." },
    ],
  }),
  component: ImagePage,
});

function ImagePage() {
  const { user } = useAuth();
  const [target, setTarget] = useState("en");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState("");
  const [translation, setTranslation] = useState("");
  const translate = useServerFn(translateImage);
  const save = useServerFn(saveTranslation);

  function onFile(f: File | null) {
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return toast.error("Image too large (max 6MB)");
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(f);
    setExtracted("");
    setTranslation("");
  }

  async function run() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await translate({
        data: { imageDataUrl: preview, targetLang: languageName(target) },
      });
      setExtracted(res.extracted);
      setTranslation(res.translated);
      if (user)
        save({
          data: {
            kind: "image",
            sourceLang: "auto",
            targetLang: target,
            sourceText: res.extracted || "(image)",
            translatedText: res.translated,
            saved: false,
          },
        }).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? "Translation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">Image Translator</h1>
        <p className="mt-2 text-muted-foreground">
          Take a photo of a textbook or notice board — we'll read and translate it.
        </p>

        <div className="mt-8 grid sm:grid-cols-[1fr_auto] gap-4">
          <LanguagePicker value={target} onChange={setTarget} label="Translate to" />
        </div>

        <label className="mt-6 block">
          <div className="glass rounded-2xl p-10 border-dashed border-2 border-white/10 text-center cursor-pointer hover:border-white/20 transition-colors">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium">
              {preview ? "Change image" : "Click to upload an image"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 6MB</div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </label>

        {preview && (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-3 overflow-hidden">
              <img
                src={preview}
                alt="Uploaded"
                className="rounded-xl w-full h-auto max-h-[400px] object-contain"
              />
            </div>
            <div className="flex flex-col gap-4">
              <Button
                onClick={run}
                disabled={busy}
                className="self-start bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] border-0 hover:opacity-90"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ScanText className="w-4 h-4 mr-2" />
                )}
                Extract & translate
              </Button>
              {extracted && (
                <div className="glass rounded-2xl p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Extracted
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{extracted}</p>
                </div>
              )}
              {translation && (
                <div className="glass rounded-2xl p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Translation
                  </div>
                  <p className="whitespace-pre-wrap">{translation}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

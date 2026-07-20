import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { LanguagePicker } from "@/components/site/language-picker";
import { Button } from "@/components/ui/button";
import { Mic, Square, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transcribeAudio, translateText } from "@/lib/ai.functions";
import { saveTranslation } from "@/lib/history.functions";
import { useAuth } from "@/hooks/use-auth";
import { languageName } from "@/lib/languages";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Translator — BhashaBridge" },
      {
        name: "description",
        content:
          "Speak in one language, hear it in another. Real-time voice translation for students.",
      },
      { property: "og:title", content: "Voice Translator — BhashaBridge" },
      { property: "og:description", content: "Speak in one language, hear it in another." },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const { user } = useAuth();
  const [target, setTarget] = useState("hi");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = useServerFn(transcribeAudio);
  const translate = useServerFn(translateText);
  const save = useServerFn(saveTranslation);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) {
        toast.error("Browser cannot record supported audio");
        return;
      }
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1024) {
          toast.error("Recording too short — try again");
          return;
        }
        await processBlob(blob, mime);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  async function processBlob(blob: Blob, mime: string) {
    setBusy(true);
    setTranscript("");
    setTranslation("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64data = res.split(",")[1] ?? "";
          resolve(base64data);
        };
        reader.onerror = () => reject(new Error("Failed to read audio recording"));
        reader.readAsDataURL(blob);
      });
      const format = mime.includes("mp4") ? "mp4" : "webm";
      const { text } = await transcribe({ data: { audioBase64: base64, format } });
      setTranscript(text);
      if (!text) return;
      const { translation: tr } = await translate({
        data: { text, sourceLang: "auto", targetLang: languageName(target) },
      });
      setTranslation(tr);
      if (user)
        save({
          data: {
            kind: "voice",
            sourceLang: "auto",
            targetLang: target,
            sourceText: text,
            translatedText: tr,
            saved: false,
          },
        }).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function speak() {
    if (!translation) return;
    const u = new SpeechSynthesisUtterance(translation);
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">Voice Translator</h1>
        <p className="mt-2 text-muted-foreground">
          Press the mic, speak in any language, get an instant translation.
        </p>

        <div className="mt-8 grid sm:grid-cols-[1fr_auto] gap-4 items-end">
          <LanguagePicker value={target} onChange={setTarget} label="Translate to" />
        </div>

        <div className="mt-10 glass rounded-3xl p-10 text-center">
          <button
            onClick={recording ? stop : start}
            disabled={busy}
            className={`mx-auto w-28 h-28 rounded-full grid place-items-center transition-all ${
              recording
                ? "bg-destructive/80 shadow-[0_0_60px_-10px_oklch(0.62_0.22_25)] animate-pulse"
                : "bg-[var(--gradient-saffron)] shadow-[var(--shadow-glow)] hover:scale-105"
            }`}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {busy ? (
              <Loader2 className="w-10 h-10 text-[oklch(0.18_0.04_275)] animate-spin" />
            ) : recording ? (
              <Square className="w-10 h-10 text-foreground" />
            ) : (
              <Mic className="w-10 h-10 text-[oklch(0.18_0.04_275)]" />
            )}
          </button>
          <p className="mt-5 text-sm text-muted-foreground">
            {busy
              ? "Transcribing & translating…"
              : recording
                ? "Listening — tap to stop"
                : "Tap to record"}
          </p>
        </div>

        {(transcript || translation) && (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                You said
              </div>
              <p className="whitespace-pre-wrap">{transcript || "—"}</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Translation
              </div>
              <p className="whitespace-pre-wrap">{translation || "—"}</p>
              {translation && (
                <Button size="sm" variant="ghost" onClick={speak} className="mt-3">
                  <Volume2 className="w-4 h-4 mr-1.5" /> Listen
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

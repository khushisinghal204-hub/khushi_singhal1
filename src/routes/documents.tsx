import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { LanguagePicker } from "@/components/site/language-picker";
import { Button } from "@/components/ui/button";
import { translateDocument } from "@/lib/ai.functions";
import { saveTranslation } from "@/lib/history.functions";
import { useAuth } from "@/hooks/use-auth";
import { FileUp, Download, Loader2, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { languageName } from "@/lib/languages";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Document Translator — BhashaBridge" },
      {
        name: "description",
        content:
          "Upload a PDF or text file and translate the entire document into another language.",
      },
      { property: "og:title", content: "Document Translator — BhashaBridge" },
      { property: "og:description", content: "Translate full PDF and text documents instantly." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const { user } = useAuth();
  const [target, setTarget] = useState("hi");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [translation, setTranslation] = useState("");
  const translate = useServerFn(translateDocument);
  const save = useServerFn(saveTranslation);

  async function run() {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("File too large (max 8MB)");
    setBusy(true);
    setTranslation("");
    try {
      // 1. Upload to Supabase Storage bucket 'documents'
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${user?.id || "anonymous"}/${fileName}`;

        const isDummySupabase = import.meta.env.VITE_SUPABASE_URL?.includes("your-project-id");
        if (!isDummySupabase) {
          const { error: uploadErr } = await supabase.storage
            .from("documents")
            .upload(filePath, file);

          if (uploadErr) {
            if (uploadErr.message.includes("does not exist") || uploadErr.message.includes("Bucket not found")) {
              await supabase.storage.createBucket("documents", { public: true });
              const { error: retryErr } = await supabase.storage
                .from("documents")
                .upload(filePath, file);
              if (retryErr) throw retryErr;
            } else {
              throw uploadErr;
            }
          }
          toast.success("Document uploaded to Supabase Storage ('documents' bucket)!");
        }
      } catch (storageErr: any) {
        console.error("Storage upload failed:", storageErr);
        toast.warning("Supabase Storage warning: " + (storageErr.message || "Failed to save file copy."));
      }

      const isDocx =
        file.name.toLowerCase().endsWith(".docx") ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      let dataUrl: string;
      let mimeType = file.type || "text/plain";
      if (isDocx) {
        const mammoth = await import("mammoth/mammoth.browser");
        const buf = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
        const b64 = btoa(unescape(encodeURIComponent(value)));
        dataUrl = `data:text/plain;base64,${b64}`;
        mimeType = "text/plain";
      } else {
        dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = () => rej(r.error);
          r.readAsDataURL(file);
        });
      }
      const { translation: tr } = await translate({
        data: {
          fileDataUrl: dataUrl,
          mimeType,
          filename: file.name,
          targetLang: languageName(target),
        },
      });
      setTranslation(tr);
      if (user)
        save({
          data: {
            kind: "document",
            sourceLang: "auto",
            targetLang: target,
            sourceText: file.name,
            translatedText: tr,
            saved: false,
          },
        }).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? "Translation failed");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!translation) return;
    const blob = new Blob([translation], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(file?.name ?? "document").replace(/\.[^.]+$/, "")}-${target}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyOut() {
    if (!translation) return;
    navigator.clipboard.writeText(translation);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">Document Translator</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a PDF, DOCX, or .txt file — we'll translate the whole thing.
        </p>

        <div className="mt-8 grid sm:grid-cols-[1fr_auto] gap-4">
          <LanguagePicker value={target} onChange={setTarget} label="Translate to" />
        </div>

        <label className="mt-6 block">
          <div className="glass rounded-2xl p-10 border-dashed border-2 border-white/10 text-center cursor-pointer hover:border-white/20 transition-colors">
            <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium">
              {file ? file.name : "Click to choose a PDF, DOCX, or .txt file"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Max 8MB</div>
            <input
              type="file"
              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </label>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={run}
            disabled={!file || busy}
            className="bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] border-0 hover:opacity-90"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Translate document
          </Button>
          {translation && (
            <>
              <Button variant="ghost" onClick={copyOut}>
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <Button variant="ghost" onClick={download}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </>
          )}
        </div>

        {translation && (
          <div className="glass rounded-2xl p-6 mt-8 whitespace-pre-wrap text-base max-h-[600px] overflow-auto">
            {translation}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

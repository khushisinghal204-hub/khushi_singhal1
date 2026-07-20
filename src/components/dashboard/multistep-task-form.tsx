import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/languages";
import {
  Languages as LangIcon, Mic, FileText, Image as ImageIcon,
  BookOpen, Send, ChevronRight, ChevronLeft, Check, Loader2, Search
} from "lucide-react";

const CATEGORIES = [
  { id: "text",     label: "Text Translation",   icon: LangIcon,   desc: "Translate written text" },
  { id: "voice",    label: "Voice Transcription", icon: Mic,        desc: "Transcribe & translate speech" },
  { id: "document", label: "Document",            icon: FileText,   desc: "Translate a full document" },
  { id: "image",    label: "Image OCR",           icon: ImageIcon,  desc: "Extract & translate text from image" },
  { id: "study",    label: "Study Assistant",     icon: BookOpen,   desc: "Summarize and explain content" },
  { id: "post",     label: "Social Post",         icon: Send,       desc: "Translate social media content" },
] as const;

type Category = typeof CATEGORIES[number]["id"];

interface Props {
  onSubmit: (payload: { text: string; category: string; targetLang: string }) => Promise<void>;
  submitting: boolean;
}

export function MultistepTaskForm({ onSubmit, submitting }: Props) {
  const [step, setStep]         = useState(1);
  const [text, setText]         = useState("");
  const [category, setCategory] = useState<Category>("text");
  const [targetLang, setTarget] = useState("hi");
  const [langSearch, setLangSearch] = useState("");

  const totalSteps = 3;
  const progressPct = ((step - 1) / (totalSteps - 1)) * 100;

  // Filter by code or name (l is a Language object)
  const filteredLangs = LANGUAGES.filter((l) =>
    l.code !== "auto" &&
    (l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
     l.native.toLowerCase().includes(langSearch.toLowerCase()))
  );

  const catObj = CATEGORIES.find((c) => c.id === category)!;
  const targetLangObj = LANGUAGES.find((l) => l.code === targetLang);

  async function handleSubmit() {
    await onSubmit({ text, category, targetLang });
    setStep(1);
    setText("");
    setCategory("text");
    setTarget("hi");
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      {/* Header + Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {["Input", "Language", "Confirm"].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold border transition-all duration-300
                  ${step > i + 1
                    ? "bg-primary border-primary text-primary-foreground"
                    : step === i + 1
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-white/20 text-muted-foreground"
                  }`}
              >
                {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className={step === i + 1 ? "text-foreground font-medium" : ""}>{label}</span>
              {i < 2 && <ChevronRight className="w-3 h-3 opacity-40 hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step 1: Text + Category */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Text to translate
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to translate…"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
                         resize-none focus:outline-none focus:ring-2 focus:ring-primary/40
                         placeholder:text-muted-foreground/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs transition-all duration-200
                      ${category === cat.id
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${category === cat.id ? "text-primary" : ""}`} />
                    <div>
                      <div className="font-medium">{cat.label}</div>
                      <div className="opacity-70 mt-0.5">{cat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={text.trim().length < 2}
            onClick={() => setStep(2)}
          >
            Next — Choose Language <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2: Target language */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Target language
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search language…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredLangs.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setTarget(lang.code)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-all duration-150
                    ${targetLang === lang.code
                      ? "bg-primary/20 border border-primary/50 text-foreground font-medium"
                      : "bg-white/5 border border-transparent hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <span className="font-medium">{lang.native}</span>
                  <span className="text-xs opacity-60 ml-1">({lang.name})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep(3)}
            >
              Next — Preview <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Review before submitting
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Category</div>
                <div className="font-medium flex items-center gap-1.5">
                  <catObj.icon className="w-3.5 h-3.5 text-primary" />
                  {catObj.label}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Target Language</div>
                <div className="font-medium">
                  {targetLangObj ? `${targetLangObj.native} (${targetLangObj.name})` : targetLang}
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Text</div>
              <p className="text-foreground leading-relaxed line-clamp-4">{text}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(2)} disabled={submitting}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Translating…</>
              ) : (
                <><Check className="w-4 h-4 mr-1" /> Create Task</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

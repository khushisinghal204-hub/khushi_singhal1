import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

function getLanguageCode(langName: string): string {
  const name = langName.toLowerCase().trim();
  if (name.includes("detect") || name === "auto") return "auto";

  const codes = ["en", "hi", "pa", "bn", "ta", "te", "mr", "gu", "kn", "ml", "ur", "sa", "fr", "de", "es", "zh", "ja"];
  if (codes.includes(name)) return name;

  const mapping: Record<string, string> = {
    english: "en", hindi: "hi", punjabi: "pa", bengali: "bn", tamil: "ta",
    telugu: "te", marathi: "mr", gujarati: "gu", kannada: "kn", malayalam: "ml",
    urdu: "ur", sanskrit: "sa", french: "fr", german: "de", spanish: "es",
    chinese: "zh", japanese: "ja",
  };
  return mapping[name] ?? "en";
}

async function callGemini(messages: any[], opts?: { json?: boolean }) {
  const key = process.env.LOVABLE_API_KEY;
  const directKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  const isLovableConfigured = key && key.trim() !== "" && key.startsWith("sk_");
  const isDirectConfigured = directKey && directKey.trim() !== "" && directKey !== "your-gemini-api-key-here";

  if (!isLovableConfigured && isDirectConfigured) {
    const gateway = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${directKey}`;

    const contents = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        const parts = m.content.map((part: any) => {
          if (part.type === "image_url") {
            const base64Data = part.image_url?.url?.split(",")?.[1] || part.image_url?.url || "";
            const mimeType = part.image_url?.url?.split(";")?.[0]?.split(":")?.[1] || "image/jpeg";
            return {
              inlineData: { mimeType, data: base64Data }
            };
          }
          return { text: part.text || "" };
        });
        return { parts };
      }
      return { parts: [{ text: `${m.role === "system" ? "INSTRUCTION" : String(m.role).toUpperCase()}: ${m.content}` }] };
    });

    const res = await fetch(gateway, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(opts?.json ? { generationConfig: { responseMimeType: "application/json" } } : {})
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Direct Gemini API failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  if (isLovableConfigured) {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  throw new Error("API_KEY_NOT_CONFIGURED");
}

/* ---------------- Translate text ---------------- */
const TranslateInput = z.object({
  text: z.string().trim().min(1).max(20000),
  sourceLang: z.string().min(1).max(20),
  targetLang: z.string().min(1).max(20),
});

export const translateText = createServerFn({ method: "POST" })
  .validator(TranslateInput)
  .handler(async ({ data }) => {
    try {
      const system =
        "You are an expert translator for students. Translate the user's text into the requested target language. " +
        "Preserve meaning, tone, formatting and line breaks. " +
        "Return ONLY the translated text — no explanations, no quotes, no preamble.";
      const isAuto =
        data.sourceLang === "auto" || data.sourceLang.toLowerCase().includes("detect");
      const user = `Source language: ${isAuto ? "auto-detect" : data.sourceLang}\nTarget language: ${data.targetLang}\n\nText:\n${data.text}`;
      const out = await callGemini([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      return { translation: String(out).trim() };
    } catch (e: any) {
      console.warn("AI translation failed, using free translation API fallback:", e.message);
      let sourceCode = getLanguageCode(data.sourceLang);
      if (sourceCode === "auto") {
        const text = data.text;
        if (/[\u0900-\u097F]/.test(text)) sourceCode = "hi";
        else if (/[\u0B80-\u0BFF]/.test(text)) sourceCode = "ta";
        else if (/[\u0C00-\u0C7F]/.test(text)) sourceCode = "te";
        else if (/[\u0980-\u09FF]/.test(text)) sourceCode = "bn";
        else if (/[\u0A00-\u0A7F]/.test(text)) sourceCode = "pa";
        else if (/[\u0A80-\u0AFF]/.test(text)) sourceCode = "gu";
        else if (/[\u0C80-\u0CFF]/.test(text)) sourceCode = "kn";
        else if (/[\u0D00-\u0D7F]/.test(text)) sourceCode = "ml";
        else sourceCode = "en";
      }
      const targetCode = getLanguageCode(data.targetLang);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(data.text)}`;

      try {
        const res = await fetch(url);
        if (res.ok) {
          const arr = await res.json();
          const translation = arr?.[0]?.map((x: any) => x[0]).join("") || "";
          if (translation) {
            return { translation: String(translation).trim() };
          }
        }
      } catch (fallbackErr) {
        console.error("Fallback translation failed:", fallbackErr);
      }
      return { translation: `[Translation Fallback] ${data.text}` };
    }
  });

/* ---------------- Detect language ---------------- */
const DetectInput = z.object({ text: z.string().trim().min(1).max(5000) });

export const detectLanguage = createServerFn({ method: "POST" })
  .validator(DetectInput)
  .handler(async ({ data }) => {
    try {
      const system =
        "You are a language detector. Identify the language of the given text. " +
        'Reply with a JSON object exactly: {"code":"<iso-639-1 code>","name":"<English language name>"}. No prose.';
      const out = await callGemini(
        [
          { role: "system", content: system },
          { role: "user", content: data.text.slice(0, 2000) },
        ],
        { json: true },
      );
      try {
        const parsed = JSON.parse(out);
        return { code: String(parsed.code ?? "").toLowerCase(), name: String(parsed.name ?? "") };
      } catch {
        return { code: "", name: String(out).trim() };
      }
    } catch (e: any) {
      if (e.message === "API_KEY_NOT_CONFIGURED") {
        const text = data.text;
        if (/[\u0900-\u097F]/.test(text)) return { code: "hi", name: "Hindi" };
        if (/[\u0B80-\u0BFF]/.test(text)) return { code: "ta", name: "Tamil" };
        if (/[\u0C00-\u0C7F]/.test(text)) return { code: "te", name: "Telugu" };
        if (/[\u0980-\u09FF]/.test(text)) return { code: "bn", name: "Bengali" };
        if (/[\u0A00-\u0A7F]/.test(text)) return { code: "pa", name: "Punjabi" };
        if (/[\u0A80-\u0AFF]/.test(text)) return { code: "gu", name: "Gujarati" };
        if (/[\u0C80-\u0CFF]/.test(text)) return { code: "kn", name: "Kannada" };
        if (/[\u0D00-\u0D7F]/.test(text)) return { code: "ml", name: "Malayalam" };
        return { code: "en", name: "English" };
      }
      return { code: "", name: String(e.message).trim() };
    }
  });

/* ---------------- Study Assistant ---------------- */
const StudyInput = z.object({
  text: z.string().trim().min(1).max(20000),
  mode: z.enum(["simplify", "summarize", "keypoints"]),
  language: z.string().min(1).max(20).default("English"),
});

export const studyAssist = createServerFn({ method: "POST" })
  .validator(StudyInput)
  .handler(async ({ data }) => {
    try {
      const promptByMode: Record<string, string> = {
        simplify:
          "Explain the following text in very simple language a 14-year-old student would easily understand. Use short sentences and friendly tone.",
        summarize:
          "Summarize the following text in a clear, concise paragraph that captures all the main ideas. Avoid filler.",
        keypoints:
          "Extract the key points from the following text as a numbered list. Each point should be short, factual and standalone.",
      };
      const system = `You are a friendly study tutor for Indian students. Respond in ${data.language}. ${promptByMode[data.mode]}`;
      const out = await callGemini([
        { role: "system", content: system },
        { role: "user", content: data.text },
      ]);
      return { result: String(out).trim() };
    } catch (e: any) {
      if (e.message === "API_KEY_NOT_CONFIGURED") {
        if (data.mode === "simplify") {
          return {
            result: `[Demo Mode - Simplified Explanation]\n\nHere is a simple explanation of your text:\n"${data.text.slice(0, 150)}${data.text.length > 150 ? "..." : ""}"\n\nIt is like explaining it to a friend: this concept describes how different parts work together to achieve a goal in simple terms.`,
          };
        } else if (data.mode === "summarize") {
          return {
            result: `[Demo Mode - Summary]\n\nSummary of the text:\nThis text discusses the key elements of "${data.text.slice(0, 50)}...". It focuses on making learning accessible and bridging the gap for students.`,
          };
        } else {
          return {
            result: `[Demo Mode - Key Points]\n\n1. Overview: The text introduces the topic of "${data.text.slice(0, 40)}...".\n2. Key Takeaway: Designed specifically for student learning.\n3. Application: Easy to understand and apply.`,
          };
        }
      }
      throw e;
    }
  });

/* ---------------- Image OCR + translate ---------------- */
const ImageInput = z.object({
  imageDataUrl: z.string().min(20),
  targetLang: z.string().min(1).max(20),
});

export const translateImage = createServerFn({ method: "POST" })
  .validator(ImageInput)
  .handler(async ({ data }) => {
    try {
      const system =
        "You are an OCR + translation assistant. Read all text visible in the image, then translate it into the target language. " +
        "Return a JSON object with two keys exactly: extracted (the original text exactly as written) and translated (the translation into the target language).";
      const out = await callGemini(
        [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Target language: ${data.targetLang}. Extract and translate all text in this image.`,
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        { json: true },
      );
      try {
        const parsed = JSON.parse(out);
        return {
          extracted: String(parsed.extracted ?? "").trim(),
          translated: String(parsed.translated ?? "").trim(),
        };
      } catch {
        return { extracted: "", translated: String(out).trim() };
      }
    } catch (e: any) {
      if (e.message === "API_KEY_NOT_CONFIGURED") {
        return {
          extracted: "BhashaBridge study helper text detected in image",
          translated: `[Demo Mode OCR & Translation to ${data.targetLang}]: नमस्ते! भाशाब्रिज में आपका स्वागत है।`,
        };
      }
      throw e;
    }
  });

/* ---------------- Document (PDF/text) ---------------- */
const DocInput = z.object({
  fileDataUrl: z.string().min(20),
  mimeType: z.string().min(1).max(120),
  filename: z.string().min(1).max(200),
  targetLang: z.string().min(1).max(20),
});

export const translateDocument = createServerFn({ method: "POST" })
  .validator(DocInput)
  .handler(async ({ data }) => {
    try {
      const system =
        "You are a document translation assistant for students. Translate the document's full text into the target language. " +
        "Preserve headings, lists and paragraph structure. Return ONLY the translated document text.";
      const content: any[] = [
        { type: "text", text: `Target language: ${data.targetLang}. Translate this document fully.` },
      ];
      if (data.mimeType === "application/pdf") {
        content.push({
          type: "file",
          file: { filename: data.filename, file_data: data.fileDataUrl },
        });
      } else {
        const base64 = data.fileDataUrl.split(",")[1] ?? "";
        const text =
          typeof atob !== "undefined"
            ? atob(base64)
            : Buffer.from(base64, "base64").toString("utf-8");
        content.push({ type: "text", text: `Document content:\n\n${text.slice(0, 18000)}` });
      }
      const out = await callGemini([
        { role: "system", content: system },
        { role: "user", content },
      ]);
      return { translation: String(out).trim() };
    } catch (e: any) {
      if (e.message === "API_KEY_NOT_CONFIGURED") {
        return {
          translation: `[Demo Mode - Document Translation to ${data.targetLang}]\n\nThis is a simulated translation of the document "${data.filename}". To translate real files using AI, configure your GEMINI_API_KEY in the .env file.`,
        };
      }
      throw e;
    }
  });

/* ---------------- Speech to text ---------------- */
const TranscribeInput = z.object({
  audioBase64: z.string().min(20),
  format: z.enum(["webm", "mp4", "wav", "mp3", "m4a", "ogg"]).default("webm"),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator(TranscribeInput)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    const directKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    const isLovableConfigured = key && key.trim() !== "" && key.startsWith("sk_");
    const isDirectConfigured = directKey && directKey.trim() !== "" && directKey !== "your-gemini-api-key-here";

    if (!isLovableConfigured && isDirectConfigured) {
      try {
        const mimeType = data.format === "mp4" ? "audio/mp4" : "audio/webm";
        const gateway = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${directKey}`;

        const res = await fetch(gateway, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: data.audioBase64,
                    },
                  },
                  {
                    text: "Please transcribe this audio recording. Output ONLY the plain transcription text, with no extra commentary or intro.",
                  },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Gemini transcription failed (${res.status}): ${text.slice(0, 200)}`);
        }

        const resData = await res.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return { text: text.trim() };
      } catch (err: any) {
        console.error("Gemini transcription failed:", err);
        return {
          text: `[Transcription Error] ${err.message}`
        };
      }
    }

    if (!isLovableConfigured) {
      return {
        text: "Hello! This is a demo voice transcription. (Please configure a real API key in .env to transcribe your actual speech)."
      };
    }

    const binary = Buffer.from(data.audioBase64, "base64");
    const form = new FormData();
    const blob = new Blob([new Uint8Array(binary)], { type: `audio/${data.format}` });
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `recording.${data.format}`);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Transcription failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    return { text: String(json.text ?? "").trim() };
  });
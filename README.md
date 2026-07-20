# 🌐 BhashaBridge — AI Translation Platform

> **Live Demo:** 🚀 [https://khushi-singhal1.vercel.app](https://khushi-singhal1.vercel.app)

A full-stack AI-powered translation web app built with TanStack Start, Supabase, and Google Gemini AI. Supports text, voice, image OCR, document, and study assistant translations across 17 Indian and world languages.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌍 **Text Translator** | Real-time translation across 17 languages |
| 🎤 **Voice Transcription** | Speak and get instant translation |
| 🖼️ **Image OCR** | Upload images — extract and translate text |
| 📄 **Document Translator** | Upload PDF/DOCX — translate full documents |
| 📚 **AI Study Assistant** | Simplify, summarize, and explain content |
| 📊 **User Dashboard** | Full analytics, task board, activity log |
| 🌗 **Dark / Light Mode** | Seamless theme switching |
| ⚡ **Optimistic UI** | Instant feedback before server response |
| ↩️ **Undo Delete** | 5-second undo snackbar on task deletion |
| 📥 **Export CSV / JSON** | Download your full translation history |
| 🟢 **Live Sync** | Auto-refresh every 30 seconds |
| 🔐 **Advanced Role System** | Student / Admin role-based access |
| 📝 **Multistep Task Form** | 3-step guided task creation wizard |

---

## 🔗 All Pages

| Page | URL |
|---|---|
| 🏠 Home | [/](https://khushi-singhal1.vercel.app/) |
| 🔐 Sign In | [/auth](https://khushi-singhal1.vercel.app/auth) |
| 🌍 Text Translator | [/translator](https://khushi-singhal1.vercel.app/translator) |
| 🎤 Voice | [/voice](https://khushi-singhal1.vercel.app/voice) |
| 📄 Documents | [/documents](https://khushi-singhal1.vercel.app/documents) |
| 🖼️ Image OCR | [/image](https://khushi-singhal1.vercel.app/image) |
| 📚 Study AI | [/study](https://khushi-singhal1.vercel.app/study) |
| 📊 Dashboard | [/dashboard](https://khushi-singhal1.vercel.app/dashboard) |
| ℹ️ About | [/about](https://khushi-singhal1.vercel.app/about) |

---

## 🛠️ Tech Stack

- **Framework:** TanStack Start (React + SSR)
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini 1.5 Flash (via Lovable Gateway or direct API)
- **Styling:** Tailwind CSS v4 + OKLCH Design Tokens
- **Charts:** Recharts
- **Deployment:** Vercel (Nitro preset)

---

## 🚀 Local Development

```bash
# Clone the repo
git clone https://github.com/khushisinghal204-hub/khushi_singhal1.git
cd khushi_singhal1

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase and Gemini API keys in .env

# Start development server
npm run dev
# → http://localhost:8080
```

---

## ⚙️ Environment Variables

Set these in your Vercel Dashboard under **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_URL` | Same as above (client-side) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon public key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as above (client-side) |
| `SUPABASE_PROJECT_ID` | Supabase project identifier |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for admin ops) |
| `GEMINI_API_KEY` | Google AI Studio API key (optional) |
| `LOVABLE_API_KEY` | Lovable API key starting with `sk_` (optional) |

> **Note:** Translation works without an API key using the free MyMemory fallback API. For best results, add a `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com).

---

## 📁 Project Structure

```
src/
├── routes/
│   ├── index.tsx          # Home page
│   ├── auth.tsx           # Authentication
│   ├── translator.tsx     # Text translator
│   ├── voice.tsx          # Voice transcription
│   ├── image.tsx          # Image OCR
│   ├── documents.tsx      # Document translator
│   ├── study.tsx          # AI Study Assistant
│   └── _authenticated/
│       └── dashboard.tsx  # Full dashboard (protected)
├── components/
│   ├── site/              # Header, Footer, ThemeToggle
│   ├── dashboard/         # MultistepTaskForm
│   └── ui/                # shadcn/ui components
└── lib/
    ├── ai.functions.ts    # AI server functions
    ├── history.functions.ts # Translation CRUD
    └── languages.ts       # Language definitions
```

---

## 👩‍💻 Author

**Khushi Singhal** — [@khushisinghal204-hub](https://github.com/khushisinghal204-hub)

Built as part of the **Scalezix Full-Stack Development** course.

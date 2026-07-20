import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { listTranslations, toggleSaved, deleteTranslation, saveTranslation, deleteUserAccount, softDeleteTranslation, restoreTranslation } from "@/lib/history.functions";
import { languageName, LANGUAGES } from "@/lib/languages";
import { translateText } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MultistepTaskForm } from "@/components/dashboard/multistep-task-form";
import {
  Star,
  StarOff,
  Trash2,
  Copy,
  Loader2,
  Languages as LangIcon,
  Mic,
  FileText,
  Image as ImageIcon,
  BookOpen,
  MapPin,
  FileEdit,
  Sparkles,
  MessageSquare,
  Bell,
  CheckCircle2,
  Database,
  ChevronRight,
  BookOpenCheck,
  Send,
  Sparkle,
  Layers,
  Award,
  Compass,
  Users,
  Settings,
  Activity,
  RefreshCw,
  RotateCcw,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, AreaChart, Area, PieChart, Pie, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Day 13 — User Dashboard | Scalezix" }] }),
  component: Dashboard,
});

const iconFor: Record<string, any> = {
  text: LangIcon,
  voice: Mic,
  document: FileText,
  image: ImageIcon,
  study: BookOpen,
  post: Send,
  text_trash: LangIcon,
  voice_trash: Mic,
  document_trash: FileText,
  image_trash: ImageIcon,
  study_trash: BookOpen,
  post_trash: Send,
};

// Simulated data for slides
const SLIDES = [
  {
    day: 13,
    title: "User Dashboard",
    subtitle: "Overview of dashboards, profiles, and data flows",
    desc: "A single page where users see important info quickly. Group related items into rounded cards with soft teal backgrounds.",
    concepts: ["Left Nav Panel", "Dynamic Summary Cards", "Main Chart Area", "Supabase CRUD queries"]
  },
  {
    day: 13,
    title: "User Profile Panel",
    subtitle: "Saves to Supabase 'users' table",
    desc: "Contains avatar, name, bio, location, email, and roles. Under the hood, edits write back to profiles table via upsert queries.",
    concepts: ["Auth user metadata update", "Supabase Profile upsert", "Avatar initials calculation"]
  },
  {
    day: 13,
    title: "Data Management & CRUD",
    subtitle: "Read (GET), Write (POST), Update (PATCH)",
    desc: "Using structured tables, indexing queries, and wrapping database triggers for smooth real-time reactivity.",
    concepts: ["GET: fetch translations/profiles", "POST: log translation activity", "PATCH: modify records safely"]
  }
];

function Dashboard() {
  const { user } = useAuth();
  const list = useServerFn(listTranslations);
  const toggle = useServerFn(toggleSaved);
  const remove = useServerFn(deleteTranslation);
  const save = useServerFn(saveTranslation);
  const deleteUser = useServerFn(deleteUserAccount);
  const translate = useServerFn(translateText);
  const softDelete = useServerFn(softDeleteTranslation);
  const restore = useServerFn(restoreTranslation);

  // Layout View Mode: 'scalezix' (teal theme, slide action items) vs 'classic' (original saffron theme)
  const [viewMode, setViewMode] = useState<"scalezix" | "classic">("scalezix");
  
  // Tab within scalezix layout: 'dashboard' | 'profile' | 'slides' | 'playground' | 'history' | 'admin' | 'trash' | 'activity' | 'analytics'
  const [activeTab, setActiveTab] = useState<"dashboard" | "profile" | "slides" | "playground" | "history" | "admin" | "trash" | "activity" | "analytics">("dashboard");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "saved">("all");

  // Profile states (initialized to Slide 3 defaults)
  const [profileName, setProfileName] = useState("Alex Student");
  const [bio, setBio] = useState("Full-stack learner · Day 13");
  const [location, setLocation] = useState("Online Campus");
  const [role, setRole] = useState("Student");
  const [profileLoading, setProfileLoading] = useState(false);

  // Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editRole, setEditRole] = useState("Student");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Summary counts
  const [msgCount, setMsgCount] = useState(12);
  const [postInput, setPostInput] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);

  // Console query logs for playground
  const [logs, setLogs] = useState<Array<{ type: string; query: string; sql: string; response: any; time: string }>>([]);

  // Admin states
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Task creator states
  const [taskText, setTaskText] = useState("");
  const [taskCategory, setTaskCategory] = useState<"text" | "voice" | "document" | "image" | "study">("text");
  const [taskTargetLang, setTaskTargetLang] = useState("hi");
  const [creatingTask, setCreatingTask] = useState(false);

  // ── NEW: Optimistic delete + Undo Snackbar ────────────────────────────────
  const [deletingIds, setDeletingIds]     = useState<Set<string>>(new Set());
  const [undoQueue, setUndoQueue]         = useState<Array<{ id: string; item: any; timer: ReturnType<typeof setTimeout> }>>([]);
  const undoQueueRef = useRef(undoQueue);
  undoQueueRef.current = undoQueue;

  // ── NEW: Live-update polling (every 30 s) ────────────────────────────────
  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const isAdmin = role === "Admin" || user?.user_metadata?.role === "Admin";

  // Messages List
  const [messages, setMessages] = useState<Array<{ id: number; from: string; body: string; read: boolean }>>([
    { id: 1, from: "Scalezix Coach", body: "Welcome to Day 13! Let's master dashboard data flows.", read: false },
    { id: 2, from: "Supabase Bot", body: "New database migration successfully applied to 'profiles' table.", read: false },
    { id: 3, from: "Antigravity AI", body: "I am ready to help you implement your summary cards challenge.", read: false },
    { id: 4, from: "System", body: "Daily streak active: 13 Days of Full Stack Development!", read: false },
    { id: 5, from: "Admin", body: "Remember to complete all action items before moving to Day 14.", read: false },
  ]);

  // Alerts and popups states
  const [activePopups, setActivePopups] = useState<Array<{ id: string; title: string; type: "info" | "warning" | "success" }>>([]);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ id: string; title: string; type: "info" | "warning" | "success"; read: boolean }>>([
    { id: "1", title: "Database connection status: Connected", type: "success", read: false },
    { id: "2", title: "Auth token refreshed successfully", type: "info", read: false },
    { id: "3", title: "Action item pending: Connect a simple query from Supabase", type: "warning", read: false },
    { id: "4", title: "Try This challenge active: Add a posts summary card", type: "info", read: false },
  ]);
  const [alertCount, setAlertCount] = useState(4);

  // Activity Log States
  const [activities, setActivities] = useState<Array<{ id: string; event: string; detail: string; time: string; type: "create" | "delete" | "update" | "system" }>>([
    { id: "1", event: "User Sign In", detail: "Developer authentication bypass active with mock ID", time: "12:00 AM", type: "system" },
    { id: "2", event: "DB Connection Check", detail: "Supabase connection active and ready", time: "12:01 AM", type: "system" }
  ]);
  const [activitySearch, setActivitySearch] = useState("");
  
  // Task Manager Search & Filter States
  const [taskSearch, setTaskSearch] = useState("");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>("all");

  function logActivity(event: string, detail: string, type: "create" | "delete" | "update" | "system") {
    const id = Math.random().toString();
    const newAct = {
      id,
      event,
      detail,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type
    };
    setActivities(prev => [newAct, ...prev]);
  }

  function showPopup(title: string, type: "info" | "warning" | "success") {
    const id = Math.random().toString();
    const newPopup = { id, title, type };
    
    // Add to active visible stack
    setActivePopups(prev => [...prev, newPopup]);
    
    // Log to alerts inbox history
    setAlerts(prev => [
      { id, title, type, read: false },
      ...prev
    ]);
    setAlertCount(c => c + 1);

    // Auto dismiss popup card from stack after 5 seconds
    setTimeout(() => {
      setActivePopups(prev => prev.filter(p => p.id !== id));
    }, 5000);
  }

  // Mounted check to prevent SSR hydration errors with Recharts
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    logActivity("Dashboard Loaded", "Fetched profile data and translation history from Supabase.", "system");
  }, []);

  // Live update polling
  useEffect(() => {
    liveRef.current = setInterval(async () => {
      try {
        const r = await list({});
        setItems(r.items);
        setLastUpdated(new Date());
      } catch { /* silent */ }
    }, 30_000);
    return () => { if (liveRef.current) clearInterval(liveRef.current); };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const r = await list({});
      setItems(r.items);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      // Silently ignore auth/API key errors on initial load — these happen when
      // Supabase credentials are not yet configured or the session token is missing.
      const isAuthError =
        msg.includes("Invalid API key") ||
        msg.includes("Unauthorized") ||
        msg.includes("JWT") ||
        msg.includes("No authorization");
      if (!isAuthError) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    if (!user) return;
    setProfileLoading(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (prof?.full_name) {
        setProfileName(prof.full_name);
      } else {
        setProfileName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Alex Student");
      }

      setBio(user.user_metadata?.bio || "Full-stack learner · Day 13");
      setLocation(user.user_metadata?.location || "Online Campus");
      setRole(user.user_metadata?.role || "Student");
    } catch (e) {
      console.error("Error loading profile:", e);
    } finally {
      setProfileLoading(false);
    }
  }

  // Load profiles table for Admin view
  async function loadAdminData() {
    setLoadingAdmin(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProfilesList(data ?? []);
    } catch (e: any) {
      toast.error("Failed to load user profiles: " + e.message);
    } finally {
      setLoadingAdmin(false);
    }
  }

  useEffect(() => {
    refresh();
    if (user) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setUpdatingProfile(true);
    
    // Log API call to playground console
    const startTime = new Date().toLocaleTimeString();
    const query = `supabase.from('profiles').upsert({ id: '${user.id}', full_name: '${editName}' })`;
    const sql = `INSERT INTO public.profiles (id, full_name) VALUES ('${user.id}', '${editName}') ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;`;

    try {
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: editName });

      if (dbErr) throw dbErr;

      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: editName,
          bio: editBio,
          location: editLocation,
          role: editRole,
        },
      });

      if (authErr) throw authErr;

      // Calculate Audit Trail changes
      const changes: string[] = [];
      if (profileName !== editName) changes.push(`Name: "${profileName}" ➔ "${editName}"`);
      if (bio !== editBio) changes.push(`Bio: "${bio}" ➔ "${editBio}"`);
      if (location !== editLocation) changes.push(`Location: "${location}" ➔ "${editLocation}"`);
      if (role !== editRole) changes.push(`Role: "${role}" ➔ "${editRole}"`);

      const auditDetail = changes.length > 0 
        ? `Audit Trail: ${changes.join(" | ")}` 
        : "Profile saved (no field values changed).";

      setProfileName(editName);
      setBio(editBio);
      setLocation(editLocation);
      setRole(editRole);
      setIsEditingProfile(false);
      toast.success("Profile and role updated successfully!");
      showPopup("Profile and role updated successfully!", "success");
      logActivity("Profile Audit Trail", auditDetail, "update");

      // Log success
      setLogs((prev) => [
        {
          type: "PATCH (Update Profile)",
          query,
          sql,
          response: { status: 200, statusText: "OK", data: { id: user.id, full_name: editName, bio: editBio, location: editLocation, role: editRole } },
          time: startTime,
        },
        ...prev,
      ]);
      
      if (editRole === "Admin") {
        loadAdminData();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
      setLogs((prev) => [
        {
          type: "PATCH (Update Profile) - Error",
          query,
          sql,
          response: { error: e.message || "Failed to update profile" },
          time: startTime,
        },
        ...prev,
      ]);
    } finally {
      setUpdatingProfile(false);
    }
  }

  // ── Multistep form handler ────────────────────────────────────────────────
  async function handleCreateTask(payload: { text: string; category: string; targetLang: string }) {
    if (!payload.text.trim() || !user) return;
    setCreatingTask(true);
    const startTime = new Date().toLocaleTimeString();
    const query = `translateText({ text: '${payload.text.slice(0, 15)}...', targetLang: '${payload.targetLang}' })`;
    const sql = `INSERT INTO public.translations ... VALUES ('${payload.category}', 'auto', '${payload.targetLang}', ...)`;
    try {
      const { translation } = await translate({
        data: { text: payload.text, sourceLang: "auto", targetLang: languageName(payload.targetLang) }
      });
      // Optimistic add
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = {
        id: tempId, kind: payload.category, source_lang: "auto",
        target_lang: payload.targetLang, source_text: payload.text,
        translated_text: translation, saved: false, created_at: new Date().toISOString()
      };
      setItems(prev => [optimisticItem, ...prev]);

      await save({
        data: {
          kind: payload.category as any, sourceLang: "auto", targetLang: payload.targetLang,
          sourceText: payload.text, translatedText: translation, saved: false
        }
      });
      toast.success("Task created and translated!");
      showPopup("Translation task created and logged!", "success");
      logActivity("Task Created", `New ${payload.category} task: "${payload.text.slice(0, 30)}…"`, "create");
      setLogs(prev => [{ type: "POST (Create Task & Translate)", query, sql, response: { status: 201, translation }, time: startTime }, ...prev]);
      refresh(); // sync real IDs
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
      showPopup(`Failed to create task: ${err.message}`, "warning");
      logActivity("Task Creation Failed", `Error: ${err.message}`, "system");
      setLogs(prev => [{ type: "POST (Create Task) - Error", query, sql, response: { error: err.message }, time: startTime }, ...prev]);
    } finally {
      setCreatingTask(false);
    }
  }

  // ── Optimistic toggle saved ───────────────────────────────────────────────
  async function handleToggleSaved(id: string, saved: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, saved: !saved } : i));
    try { await toggle({ data: { id, saved: !saved } }); }
    catch { setItems(prev => prev.map(i => i.id === id ? { ...i, saved } : i)); toast.error("Failed to update"); }
  }

  // ── Optimistic delete with 5-sec Undo ───────────────────────────────────
  function handleDeleteWithUndo(id: string) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // Optimistic remove
    setDeletingIds(prev => new Set([...prev, id]));
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 350);

    const timer = setTimeout(async () => {
      setUndoQueue(prev => prev.filter(u => u.id !== id));
      try { await softDelete({ data: { id } }); logActivity("Task Deleted", `Deleted task ${id.slice(0, 8)}`, "delete"); }
      catch { toast.error("Delete failed"); refresh(); }
      finally { setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
    }, 5000);

    setUndoQueue(prev => [...prev, { id, item, timer }]);
    toast(`Task deleted`, {
      description: "Click Undo to restore it within 5 seconds.",
      action: { label: "Undo", onClick: () => undoDelete(id) },
      duration: 5000,
    });
  }

  function undoDelete(id: string) {
    const entry = undoQueueRef.current.find(u => u.id === id);
    if (!entry) return;
    clearTimeout(entry.timer);
    setUndoQueue(prev => prev.filter(u => u.id !== id));
    setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setItems(prev => {
      const exists = prev.find(i => i.id === id);
      return exists ? prev : [entry.item, ...prev];
    });
    toast.success("Task restored!");
    logActivity("Task Restored", `Undo deletion of task ${id.slice(0, 8)}`, "update");
  }

  // ── Export helpers ───────────────────────────────────────────────────────
  function exportCSV() {
    const visible = items.filter(i => !i.kind.endsWith("_trash"));
    const header = ["ID","Kind","Source Lang","Target Lang","Source Text","Translated Text","Saved","Created At"];
    const rows = visible.map(i => [
      i.id, i.kind, i.source_lang, i.target_lang,
      `"${(i.source_text ?? "").replace(/"/g, '""')}"`,
      `"${(i.translated_text ?? "").replace(/"/g, '""')}"`,
      i.saved, i.created_at
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `bhasha-history-${Date.now()}.csv` });
    a.click(); URL.revokeObjectURL(url);
    toast.success("History exported as CSV!");
    logActivity("Export CSV", `Exported ${visible.length} records`, "system");
  }

  function exportJSON() {
    const visible = items.filter(i => !i.kind.endsWith("_trash"));
    const blob = new Blob([JSON.stringify(visible, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `bhasha-history-${Date.now()}.json` });
    a.click(); URL.revokeObjectURL(url);
    toast.success("History exported as JSON!");
    logActivity("Export JSON", `Exported ${visible.length} records`, "system");
  }

  // Handle publishing a new post to satisfy the Try This Challenge
  async function handlePublishPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !postInput.trim()) return;
    setSubmittingPost(true);

    const postContent = postInput.trim();
    const startTime = new Date().toLocaleTimeString();
    const query = `supabase.from('translations').insert({ kind: 'post', source_text: '${postContent.slice(0, 20)}...' })`;
    const sql = `INSERT INTO public.translations (user_id, kind, source_lang, target_lang, source_text, translated_text) VALUES ('${user.id}', 'post', 'en', 'en', '${postContent}', '${postContent}');`;

    try {
      await save({
        data: {
          kind: "post",
          sourceLang: "en",
          targetLang: "en",
          sourceText: postContent,
          translatedText: postContent,
          saved: false,
        },
      });

      setPostInput("");
      toast.success("Post published to database!");
      refresh();
      showPopup("Post published to Supabase successfully!", "success");
      logActivity("Challenge Post Published", `Published a post: "${postContent.slice(0, 30)}..."`, "create");

      setLogs((prev) => [
        {
          type: "POST (Create Post)",
          query,
          sql,
          response: { status: 201, statusText: "Created", content: postContent },
          time: startTime,
        },
        ...prev,
      ]);
    } catch (e: any) {
      toast.error(e.message || "Failed to publish post");
      setLogs((prev) => [
        {
          type: "POST (Create Post) - Error",
          query,
          sql,
          response: { error: e.message },
          time: startTime,
        },
        ...prev,
      ]);
    } finally {
      setSubmittingPost(false);
    }
  }

  // Live GET trigger for playground
  async function handlePlaygroundGET() {
    const startTime = new Date().toLocaleTimeString();
    const query = "supabase.from('translations').select('*').limit(10)";
    const sql = "SELECT * FROM public.translations WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 10;";
    try {
      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setLogs((prev) => [
        {
          type: "GET (Fetch Translations)",
          query,
          sql,
          response: data,
          time: startTime,
        },
        ...prev,
      ]);
      toast.success("GET query executed! Check console below.");
      logActivity("Playground GET", "Executed SELECT query on translations table in Playground console.", "system");
    } catch (e: any) {
      toast.error(e.message);
      setLogs((prev) => [
        {
          type: "GET (Fetch Translations) - Error",
          query,
          sql,
          response: { error: e.message },
          time: startTime,
        },
        ...prev,
      ]);
    }
  }

  // Filter items (separate posts from other task categories, exclude trash kinds)
  const kinds = ["text", "voice", "document", "image", "study", "post"];
  const posts = items.filter((i) => i.kind === "post");
  const tasks = items.filter((i) => !i.kind.endsWith("_trash"));
  const trashTasks = items.filter((i) => i.kind.endsWith("_trash"));

  // Calculate filteredTasks with search text and category dropdown filters
  let filteredTasks = filter === "saved" ? tasks.filter((i) => i.saved) : tasks;
  
  if (taskCategoryFilter !== "all") {
    filteredTasks = filteredTasks.filter((i) => i.kind === taskCategoryFilter);
  }
  
  if (taskSearch.trim() !== "") {
    const query = taskSearch.toLowerCase();
    filteredTasks = filteredTasks.filter(
      (i) =>
        (i.source_text && i.source_text.toLowerCase().includes(query)) ||
        (i.translated_text && i.translated_text.toLowerCase().includes(query))
    );
  }

  // Calculate advanced analytics metrics
  const totalCharacters = tasks.reduce((sum, item) => sum + (item.source_text?.length || 0), 0);
  const uniqueLanguages = new Set(tasks.map(t => t.target_lang)).size;
  
  const pieData = kinds.filter(k => k !== "post").map((k) => {
    const count = tasks.filter((i) => i.kind === k).length;
    let label = k.charAt(0).toUpperCase() + k.slice(1);
    if (k === "study") label = "Study AI";
    return { name: label, value: count };
  }).filter(d => d.value > 0);

  const dailyMap: Record<string, number> = {};
  tasks.forEach(t => {
    const dateStr = new Date(t.created_at).toLocaleDateString([], { month: "short", day: "numeric" });
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
  });
  
  const trendData = Object.keys(dailyMap).length > 0
    ? Object.keys(dailyMap).map(date => ({ date, count: dailyMap[date] })).reverse().slice(-7)
    : [
        { date: "Mon", count: 0 },
        { date: "Tue", count: 0 },
        { date: "Wed", count: 0 },
        { date: "Thu", count: 0 },
        { date: "Fri", count: 0 }
      ];

  const langMap: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.target_lang) {
      langMap[t.target_lang] = (langMap[t.target_lang] || 0) + 1;
    }
  });
  
  const popularLanguages = Object.keys(langMap).map(lang => {
    return {
      code: lang,
      name: languageName(lang),
      count: langMap[lang]
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  // Chart data calculations including posts (mapping trashed ones too for chart data)
  const chartData = kinds.map((k) => {
    const count = items.filter((i) => i.kind === k || i.kind === `${k}_trash`).length;
    let label = k.charAt(0).toUpperCase() + k.slice(1);
    if (k === "study") label = "Study AI";
    return { name: label, count, key: k };
  });

  const totalTasks = tasks.length;
  const savedCount = tasks.filter((i) => i.saved).length;
  const postsCount = posts.length;
  
  // Slide Action Items checklist states
  const actionItems = [
    { id: 1, text: "Build a profile panel with avatar and name", completed: true },
    { id: 2, text: "Create one summary card (e.g., task count)", completed: totalTasks > 0 },
    { id: 3, text: "Connect a simple query from Supabase", completed: items.length > 0 },
    { id: 4, text: "Challenge: Add a posts summary card", completed: postsCount > 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <SiteHeader />
      
      {/* Green layout stripe matching slide header */}
      {viewMode === "scalezix" && (
        <div className="h-1.5 w-full bg-[oklch(0.62_0.14_170)] animate-pulse" />
      )}

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8">
        
        {/* Toggle switches & Brand Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              {viewMode === "scalezix" && (
                <span className="bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border border-[oklch(0.62_0.14_170)]/20 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Day 13
                </span>
              )}
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {viewMode === "scalezix" ? "User Dashboard" : "My Translation Dashboard"}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === "scalezix" 
                ? "Overview of dashboards, profiles, and data flows — Scalezix Workspace" 
                : "Manage your saved translations, history, and study progress."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold">LAYOUT THEME:</span>
            <div className="bg-slate-900/80 border border-white/10 p-1 rounded-xl flex gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode("scalezix")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "scalezix"
                    ? "bg-[oklch(0.62_0.14_170)] text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                Scalezix Teal
              </button>
              <button
                type="button"
                onClick={() => setViewMode("classic")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "classic"
                    ? "bg-[var(--saffron)] text-[oklch(0.18_0.04_275)] shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                BhashaBridge Classic
              </button>
            </div>
          </div>
        </div>

        {/* SCALEZIX INTERACTIVE DAY 13 LAYOUT */}
        {viewMode === "scalezix" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            
            {/* LEFT NAV PANEL (Slide 1 & 2 layout requirement) */}
            <aside className="space-y-6">
              <div className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-5 border border-[oklch(0.62_0.14_170)]/30 shadow-[0_8px_30px_rgb(0_128_128_/_4%)]">
                <div className="mb-6 px-3 flex justify-between items-center">
                  <span className="font-display font-bold tracking-tight text-white flex items-center gap-1.5">
                    Scalezix<span className="text-[oklch(0.62_0.14_170)] font-semibold">↗</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[oklch(0.62_0.14_170)] animate-pulse" />
                </div>

                <nav className="space-y-1.5">
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "dashboard"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4" /> Dashboard Home
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "profile"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Award className="w-4 h-4" /> User Profile (Slide 3)
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {role === "Admin" && (
                    <button
                      onClick={() => {
                        setActiveTab("admin");
                        loadAdminData();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === "admin"
                          ? "bg-rose-500/15 text-rose-400 border-l-4 border-rose-500"
                          : "text-slate-400 hover:text-rose-200 hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Compass className="w-4 h-4" /> Admin Panel
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("playground")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "playground"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Database className="w-4 h-4" /> CRUD Playground
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => setActiveTab("slides")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "slides"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <BookOpenCheck className="w-4 h-4" /> Course Slide Guide
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => setActiveTab("history")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "history"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <LangIcon className="w-4 h-4" /> Task Manager
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => setActiveTab("trash")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "trash"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4" /> Trash Bin
                      {trashTasks.length > 0 && (
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                          {trashTasks.length}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "activity"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4" /> Activity Log
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "analytics"
                        ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] border-l-4 border-[oklch(0.62_0.14_170)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4" /> Analytics Board
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </nav>

                <div className="mt-8 pt-6 border-t border-white/5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3">
                    Quick Shortcuts
                  </span>
                  {[
                    { to: "/translator", label: "Text Translator" },
                    { to: "/voice", label: "Voice Translator" },
                    { to: "/documents", label: "Document Translator" },
                    { to: "/image", label: "Image Translator" },
                    { to: "/study", label: "Study Assistant" },
                  ].map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="block px-3 py-1.5 text-xs text-slate-400 rounded-lg hover:text-[oklch(0.62_0.14_170)] hover:bg-white/5 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Action Items status summary */}
              <div className="bg-slate-950/40 rounded-3xl p-5 border border-white/5 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Slide 7 Action Items
                </span>
                <div className="space-y-2.5">
                  {actionItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-xs">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20 shrink-0 mt-0.5" />
                      )}
                      <span className={item.completed ? "text-slate-400 line-through" : "text-slate-200"}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* MAIN PORTION */}
            <div className="space-y-6">

              {/* TAB 1: DASHBOARD HOME */}
              {activeTab === "dashboard" && (
                <>
                  {/* Summary Cards Row (Slide 1 Tasks 12, Msgs 12, Alerts 12 layout) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    
                    {/* Card 1: Tasks */}
                    <div className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-6 border border-[oklch(0.62_0.14_170)]/30 flex flex-col justify-between shadow-[0_8px_30px_rgb(0_128_128_/_4%)] group hover:scale-[1.02] transition-transform">
                      <div className="flex justify-between items-start">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tasks</span>
                        <div className="w-8 h-8 rounded-lg bg-[oklch(0.62_0.14_170)]/15 grid place-items-center text-[oklch(0.62_0.14_170)]">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-extrabold tracking-tight text-white">{totalTasks}</span>
                        <span className="text-xs text-muted-foreground block mt-1">Logged translations in DB</span>
                      </div>
                    </div>

                    {/* Card 2: Messages (Interactive) */}
                    <div 
                      onClick={() => setActiveTab("slides")}
                      className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-6 border border-[oklch(0.62_0.14_170)]/30 flex flex-col justify-between shadow-[0_8px_30px_rgb(0_128_128_/_4%)] group hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Msgs</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 grid place-items-center text-indigo-400">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-extrabold tracking-tight text-white">{msgCount}</span>
                        <span className="text-xs text-muted-foreground block mt-1 hover:text-[oklch(0.62_0.14_170)] transition-colors">
                          Click to view course inbox
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Alerts (Interactive) */}
                    <div 
                      onClick={() => setIsAlertsModalOpen(true)}
                      className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-6 border border-[oklch(0.62_0.14_170)]/30 flex flex-col justify-between shadow-[0_8px_30px_rgb(0_128_128_/_4%)] group hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Alerts</span>
                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 grid place-items-center text-rose-400">
                          <Bell className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-extrabold tracking-tight text-white">{alertCount}</span>
                        <span className="text-xs text-muted-foreground block mt-1 hover:text-rose-400 transition-colors">
                          Click to view notification center
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Challenge Card - Posts (Slide 6 Challenge Requirement) */}
                    <div className="bg-[oklch(0.62_0.14_170)]/10 backdrop-blur-md rounded-3xl p-6 border border-[oklch(0.62_0.14_170)] flex flex-col justify-between shadow-[0_8px_30px_rgba(0,128,128,0.12)] group hover:scale-[1.02] transition-transform">
                      <div className="flex justify-between items-start">
                        <span className="text-xs uppercase tracking-wider text-[oklch(0.62_0.14_170)] font-bold">Posts Count</span>
                        <div className="w-8 h-8 rounded-lg bg-[oklch(0.62_0.14_170)]/20 grid place-items-center text-[oklch(0.62_0.14_170)]">
                          <Send className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-extrabold tracking-tight text-white">{postsCount}</span>
                        <span className="text-xs text-[oklch(0.62_0.14_170)]/80 block mt-1 font-semibold">
                          Slide 6 Challenge posts count
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Main Chart Area & Challenges Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    
                    {/* Main Chart Area (Slide 1 Requirement) */}
                    <div className="xl:col-span-2 bg-slate-950/40 backdrop-blur-md rounded-3xl p-6 border border-[oklch(0.62_0.14_170)]/30 shadow-[0_8px_30px_rgb(0_128_128_/_4%)] flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[oklch(0.62_0.14_170)]" />
                          <h3 className="text-sm uppercase tracking-wider text-slate-200 font-bold">Main Chart Area</h3>
                        </div>
                        <span className="text-xs text-[oklch(0.62_0.14_170)] font-medium">Activity Trends</span>
                      </div>

                      <div className="h-[260px] w-full mt-2">
                        {mounted ? (
                          items.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="oklch(0.74 0.03 80)" fontSize={12} tickLine={false} />
                                <YAxis stroke="oklch(0.74 0.03 80)" fontSize={12} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                  cursor={{ fill: "rgba(0,128,128,0.04)" }}
                                  contentStyle={{
                                    background: "oklch(0.12 0.025 280)",
                                    border: "1px solid rgba(0,128,128,0.2)",
                                    borderRadius: "12px",
                                  }}
                                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                                  {chartData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.key === "post" ? "oklch(0.62_0.14_170)" : "oklch(0.45 0.15 275)"} 
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-2">
                              <p className="text-sm">No activity recorded yet.</p>
                              <Link to="/translator">
                                <Button size="sm" className="bg-[oklch(0.62_0.14_170)] text-slate-950 font-bold hover:opacity-90">
                                  Run Translation Tasks
                                </Button>
                              </Link>
                            </div>
                          )
                        ) : (
                          <div className="h-full flex items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin text-[oklch(0.62_0.14_170)]" />
                            <span>Loading charts...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Challenge Card Input & Actions Panel */}
                    <div className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                          <Sparkle className="w-4 h-4 text-[oklch(0.62_0.14_170)]" />
                          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Challenge Actions</h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Slide 6 Challenge wants you to add a summary card for <strong>Posts</strong>. Write a post below to test database write / count workflows.
                        </p>
                        
                        <form onSubmit={handlePublishPost} className="space-y-3 pt-2">
                          <textarea
                            value={postInput}
                            onChange={(e) => setPostInput(e.target.value)}
                            placeholder="What did you learn in Day 13?"
                            rows={3}
                            className="w-full text-xs p-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.14_170)] resize-none"
                            required
                          />
                          <Button
                            type="submit"
                            disabled={submittingPost}
                            className="w-full text-xs font-bold bg-[oklch(0.62_0.14_170)] text-slate-950 hover:opacity-90 rounded-xl"
                          >
                            {submittingPost ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Publishing...
                              </>
                            ) : (
                              "Write Post (POST -> Supabase)"
                            )}
                          </Button>
                        </form>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Mock Messages Inbox</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMsgCount(m => m + 1);
                              toast.info("Simulated message received!");
                            }}
                            className="h-7 text-[10px] text-[oklch(0.62_0.14_170)] hover:bg-white/5"
                          >
                            + Add Mock Msg
                          </Button>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">System Alerts</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAlertCount(a => a + 1);
                              toast.warning("Simulated alert received!");
                            }}
                            className="h-7 text-[10px] text-rose-400 hover:bg-white/5"
                          >
                            + Trigger Alert
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Dashboard Features list (Slide 5 display) */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                      Slide 5 — Interactive Dashboard Features
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      
                      {[
                        { code: "S", name: "Summary Cards", desc: "Quick metrics (tasks, posts)" },
                        { code: "A", name: "Activity Feed", desc: "Recent actions in realtime" },
                        { code: "C", name: "Charts & Visuals", desc: "Trends and usage graphs" },
                        { code: "F", name: "Filters & Search", desc: "Find transaction data fast" },
                        { code: "Q", name: "Quick Actions", desc: "Write posts with one click" },
                        { code: "N", name: "Notifications", desc: "Critical updates to student" },
                      ].map((feat) => (
                        <div key={feat.code} className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-[oklch(0.62_0.14_170)]/30 transition-colors">
                          <span className="w-8 h-8 rounded-full bg-[oklch(0.62_0.14_170)]/10 border border-[oklch(0.62_0.14_170)]/30 grid place-items-center text-[oklch(0.62_0.14_170)] font-bold text-xs">
                            {feat.code}
                          </span>
                          <div className="mt-3">
                            <span className="text-xs font-bold text-slate-200 block">{feat.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-1 leading-normal">{feat.desc}</span>
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: USER PROFILE PANEL (Slide 3 Design replica) */}
              {activeTab === "profile" && (
                <div className="max-w-2xl mx-auto py-4">
                  <div className="bg-slate-950/40 backdrop-blur-md rounded-3xl border border-[oklch(0.62_0.14_170)]/30 shadow-[0_8px_30px_rgb(0_128_128_/_4%)] p-8 relative overflow-hidden flex flex-col">
                    
                    {/* Header: Edit button in green/teal on top-right */}
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-xs uppercase tracking-wider text-[oklch(0.62_0.14_170)] font-bold">
                        Supabase Profiles Table
                      </span>
                      <Button
                        onClick={() => {
                          setEditName(profileName);
                          setEditBio(bio);
                          setEditLocation(location);
                          setEditRole(role);
                          setIsEditingProfile(true);
                        }}
                        className="bg-[oklch(0.62_0.14_170)] text-slate-950 hover:bg-[oklch(0.62_0.14_170)]/90 font-bold text-xs rounded-xl px-4 py-1.5 h-auto transition-transform active:scale-95"
                      >
                        Edit
                      </Button>
                    </div>

                    {/* Profile Fields matching slide layout */}
                    <div className="space-y-6 pt-4 border-t border-white/5">
                      
                      {/* Field 1: Location */}
                      <div className="pb-4 border-b border-white/5">
                        <span className="text-lg text-slate-100 font-medium block">
                          {profileLoading ? "Loading..." : location}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[oklch(0.62_0.14_170)]/80 mt-1 block">
                          Location
                        </span>
                      </div>

                      {/* Field 2: Bio */}
                      <div className="pb-4 border-b border-white/5">
                        <span className="text-lg text-slate-100 font-medium block">
                          {profileLoading ? "Loading..." : bio}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[oklch(0.62_0.14_170)]/80 mt-1 block">
                          Bio
                        </span>
                      </div>

                      {/* Field 3: Email */}
                      <div className="pb-4 border-b border-white/5">
                        <span className="text-lg text-slate-100 font-medium block">
                          {user?.email || "alex@example.edu"}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[oklch(0.62_0.14_170)]/80 mt-1 block">
                          Email
                        </span>
                      </div>

                    </div>

                    {/* Footer region: Badge, Name, and Initials Avatar at bottom center */}
                    <div className="mt-12 flex flex-col items-center text-center space-y-4">
                      
                      <span className="bg-slate-950 text-[oklch(0.62_0.14_170)] border border-[oklch(0.62_0.14_170)]/30 rounded-lg px-4 py-1 font-bold text-xs tracking-wider uppercase">
                        {role}
                      </span>

                      <h2 className="font-display text-3xl font-extrabold text-white">
                        {profileName}
                      </h2>

                      {/* Initials Avatar inside green-bordered circle */}
                      <div className="w-20 h-20 rounded-full border-2 border-[oklch(0.62_0.14_170)] bg-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(0,128,128,0.2)] mt-2">
                        <span className="font-display text-3xl font-bold text-[oklch(0.62_0.14_170)]">
                          {profileName ? profileName.slice(0, 1).toUpperCase() : "A"}
                        </span>
                      </div>

                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: ADMIN PANEL (Special tab visible only when role is Admin) */}
              {activeTab === "admin" && role === "Admin" && (
                <div className="space-y-6">
                  
                  {/* Stats counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-rose-500/20 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 grid place-items-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Users</span>
                        <span className="text-2xl font-bold text-white mt-0.5">{profilesList.length}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-rose-500/20 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 grid place-items-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">API Gateways</span>
                        <span className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active Fallbacks
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-rose-500/20 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 grid place-items-center">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">System Status</span>
                        <span className="text-sm font-bold text-slate-200 mt-0.5">Vite Dev Mode</span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Users Table */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Supabase Registered User Profiles
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={loadAdminData}
                        disabled={loadingAdmin}
                        className="h-8 text-xs text-rose-400 hover:bg-white/5 gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAdmin ? "animate-spin" : ""}`} /> Refresh Table
                      </Button>
                    </div>

                    {loadingAdmin ? (
                      <div className="h-[200px] flex items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> Loading users...
                      </div>
                    ) : profilesList.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs">
                        No profiles recorded in the database.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 font-bold uppercase">
                              <th className="py-3 px-4">User ID</th>
                              <th className="py-3 px-4">Full Name</th>
                              <th className="py-3 px-4">Created At</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profilesList.map((prof) => (
                              <tr key={prof.id} className="border-b border-white/5 text-slate-200 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 font-mono select-all text-[10px] text-slate-400">{prof.id}</td>
                                <td className="py-3 px-4 font-bold">{prof.full_name || "Anonymous User"}</td>
                                <td className="py-3 px-4 text-slate-400">{new Date(prof.created_at).toLocaleString()}</td>
                                <td className="py-3 px-4 text-right">
                                  {prof.id !== user?.id && prof.id !== "00000000-0000-0000-0000-000000000000" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to permanently delete user "${prof.full_name || prof.id}"? This will delete all their translations, posts, and details.`)) {
                                          try {
                                            await deleteUser({ data: { userId: prof.id } });
                                            toast.success("User deleted successfully!");
                                            loadAdminData();
                                          } catch (err: any) {
                                            toast.error(err.message || "Failed to delete user");
                                          }
                                        }
                                      }}
                                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 rounded-lg text-[10px] px-2.5 font-bold"
                                    >
                                      Delete User
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CRUD PLAYGROUND (Slide 4 Data Management) */}
              {activeTab === "playground" && (
                <div className="space-y-6">
                  
                  {/* Slide details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* READ */}
                    <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-[oklch(0.62_0.14_170)]/20 transition-all">
                      <div>
                        <div className="w-10 h-10 rounded-full bg-[oklch(0.62_0.14_170)]/15 border border-[oklch(0.62_0.14_170)]/20 grid place-items-center text-[oklch(0.62_0.14_170)] font-extrabold text-base mb-4">
                          R
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Read (GET)</h4>
                        <p className="text-xs text-slate-400">
                          Fetch records from Supabase database tables. Runs when loading the history list and chart counts.
                        </p>
                      </div>
                      <Button
                        onClick={handlePlaygroundGET}
                        className="w-full text-xs font-semibold bg-slate-900 border border-[oklch(0.62_0.14_170)]/30 hover:bg-[oklch(0.62_0.14_170)]/10 text-[oklch(0.62_0.14_170)] rounded-xl mt-6"
                      >
                        Run GET Query
                      </Button>
                    </div>

                    {/* WRITE */}
                    <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-[oklch(0.62_0.14_170)]/20 transition-all">
                      <div>
                        <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/20 grid place-items-center text-indigo-400 font-extrabold text-base mb-4">
                          W
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Write (POST)</h4>
                        <p className="text-xs text-slate-400">
                          Insert new rows into the Supabase database. Runs when a user saves a new translation or writes a challenge post.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setActiveTab("dashboard");
                          toast.info("Write a message in the Challenge Actions card to run POST.");
                        }}
                        className="w-full text-xs font-semibold bg-slate-900 border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 rounded-xl mt-6"
                      >
                        Trigger POST Input
                      </Button>
                    </div>

                    {/* UPDATE */}
                    <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-[oklch(0.62_0.14_170)]/20 transition-all">
                      <div>
                        <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/20 grid place-items-center text-amber-400 font-extrabold text-base mb-4">
                          U
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Update (PATCH)</h4>
                        <p className="text-xs text-slate-400">
                          Modify existing profile records safely. Runs when editing user Name, Location, or Bio details.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setActiveTab("profile");
                          toast.info("Click 'Edit' in the profile card to trigger PATCH.");
                        }}
                        className="w-full text-xs font-semibold bg-slate-900 border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 rounded-xl mt-6"
                      >
                        Trigger PATCH Form
                      </Button>
                    </div>

                  </div>

                  {/* Console logs output */}
                  <div className="bg-slate-950 rounded-3xl border border-white/5 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Antigravity Realtime Query Console
                        </h4>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const simulatedAlerts = [
                              { title: "Supabase connection verified: 100% active", type: "success" },
                              { title: "Vite dev server reloaded changes successfully", type: "info" },
                              { title: "API request limit reaching 85% capacity", type: "warning" },
                            ];
                            const randomAlert = simulatedAlerts[Math.floor(Math.random() * simulatedAlerts.length)];
                            showPopup(randomAlert.title, randomAlert.type as any);
                          }}
                          className="bg-[oklch(0.62_0.14_170)]/15 border border-[oklch(0.62_0.14_170)]/30 text-[oklch(0.62_0.14_170)] font-bold text-[10px] rounded-lg px-3 py-1 h-7 hover:bg-[oklch(0.62_0.14_170)]/20"
                        >
                          🔔 Simulate Popup Alert
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLogs([])}
                          className="h-7 text-xs text-slate-400 hover:text-slate-200"
                          disabled={logs.length === 0}
                        >
                          Clear Console
                        </Button>
                      </div>
                    </div>

                    {logs.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs">
                        No operations executed yet. Click GET above or perform dashboard updates to trace logs.
                      </div>
                    ) : (
                      <div className="h-[300px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {logs.map((log, index) => (
                          <div key={index} className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 font-mono text-[11px] space-y-2">
                            <div className="flex justify-between items-center text-slate-400 border-b border-white/5 pb-2">
                              <span className="font-bold text-[oklch(0.62_0.14_170)]">{log.type}</span>
                              <span>{log.time}</span>
                            </div>
                            <div>
                              <span className="text-indigo-400 block font-semibold">// Javascript Query</span>
                              <code className="text-slate-200">{log.query}</code>
                            </div>
                            <div>
                              <span className="text-amber-400 block font-semibold">// Postgres SQL Equivalent</span>
                              <code className="text-slate-300">{log.sql}</code>
                            </div>
                            <div>
                              <span className="text-emerald-400 block font-semibold">// Live JSON Response</span>
                              <pre className="text-slate-400 overflow-x-auto bg-slate-950 p-2.5 rounded-lg border border-white/5 text-[10px]">
                                {JSON.stringify(log.response, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: COURSE SLIDES COMPANION */}
              {activeTab === "slides" && (
                <div className="space-y-6">
                  
                  {/* Interactive slide presentations */}
                  <div className="bg-slate-950/40 rounded-3xl p-8 border border-[oklch(0.62_0.14_170)]/30 shadow-[0_8px_30px_rgb(0_128_128_/_4%)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[oklch(0.62_0.14_170)] block mb-4">
                      Scalezix · Complete Workflow Slide Viewer
                    </span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {SLIDES.map((slide, i) => (
                        <div key={i} className="bg-slate-900 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-[oklch(0.62_0.14_170)]/20 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center text-xs text-slate-400">
                              <span>Day {slide.day}</span>
                              <span className="bg-[oklch(0.62_0.14_170)]/10 text-[oklch(0.62_0.14_170)] rounded px-1.5 py-0.5 font-semibold text-[10px]">
                                Slide {i+1}
                              </span>
                            </div>
                            <h3 className="font-display text-xl font-bold text-white mt-2 leading-tight">
                              {slide.title}
                            </h3>
                            <p className="text-xs text-slate-400 leading-normal mt-2">
                              {slide.desc}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-white/5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                              Core Concepts
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {slide.concepts.map((concept, idx) => (
                                <span key={idx} className="bg-white/5 text-slate-300 text-[9px] px-2 py-0.5 rounded-md">
                                  {concept}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Flow chart diagram replica from Page 6 (Putting It Together) */}
                  <div className="bg-slate-950/40 rounded-3xl p-8 border border-white/5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-6">
                      Page 6: Putting It Together Workflow Diagram
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
                      
                      {[
                        { step: "1. Auth", sub: "User signs in", code: "auth.signIn()", icon: "A" },
                        { step: "2. Fetch", sub: "Load profile & data", code: "from('users').select()", icon: "F" },
                        { step: "3. Display", sub: "Render dashboard", code: "Client-side rendering", icon: "D" },
                        { step: "4. Interact", sub: "User edits -> save", code: "from('users').update()", icon: "I" },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-white/5 p-5 rounded-2xl text-center space-y-3 relative group hover:border-[oklch(0.62_0.14_170)]/30 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-[oklch(0.62_0.14_170)]/15 border border-[oklch(0.62_0.14_170)]/30 grid place-items-center text-[oklch(0.62_0.14_170)] font-extrabold text-base mx-auto group-hover:scale-110 transition-transform">
                            {item.icon}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{item.step}</h4>
                            <p className="text-[10px] text-slate-400 mt-1">{item.sub}</p>
                          </div>
                          <code className="text-[9px] block bg-slate-950 p-1.5 rounded-lg border border-white/5 text-slate-300 truncate">
                            {item.code}
                          </code>
                        </div>
                      ))}

                    </div>
                  </div>

                  {/* Messages inbox list (connected to Msgs card count) */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-3">
                      Course Inbox ({msgCount} Messages)
                    </h4>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          onClick={() => {
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                            if (!msg.read && msgCount > 0) {
                              setMsgCount(c => Math.max(0, c - 1));
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start gap-4 ${
                            msg.read 
                              ? "bg-slate-900/40 border-white/5 hover:bg-slate-900/60" 
                              : "bg-[oklch(0.62_0.14_170)]/5 border-[oklch(0.62_0.14_170)]/20 hover:bg-[oklch(0.62_0.14_170)]/10"
                          }`}
                        >
                          <div>
                            <span className={`text-xs font-bold block ${msg.read ? "text-slate-400" : "text-[oklch(0.62_0.14_170)]"}`}>
                              {msg.from} {!msg.read && "• (New)"}
                            </span>
                            <p className={`text-xs mt-1 ${msg.read ? "text-slate-400" : "text-slate-200"}`}>
                              {msg.body}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">12:30 PM</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: HISTORY FEED LIST */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  
                  {/* Multistep Task Form Wizard */}
                  <MultistepTaskForm onSubmit={handleCreateTask} submitting={creatingTask} />

                  {/* Task Manager Table Board */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5">
                    <div className="flex flex-col gap-4 mb-6 border-b border-white/5 pb-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-xl font-semibold text-white">Task Board</h3>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot" title={`Last synced: ${lastUpdated.toLocaleTimeString()}`} />
                            <span className="text-[9px] text-muted-foreground">Live synced</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Manage all your logged translation operations.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                            <Button
                              size="sm"
                              variant={filter === "all" ? "secondary" : "ghost"}
                              onClick={() => setFilter("all")}
                              className={`h-7 px-3 text-xs rounded-lg transition-all ${
                                filter === "all"
                                  ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] font-bold"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              All
                            </Button>
                            <Button
                              size="sm"
                              variant={filter === "saved" ? "secondary" : "ghost"}
                              onClick={() => setFilter("saved")}
                              className={`h-7 px-3 text-xs rounded-lg transition-all ${
                                filter === "saved"
                                  ? "bg-[oklch(0.62_0.14_170)]/15 text-[oklch(0.62_0.14_170)] font-bold"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Saved
                            </Button>
                          </div>

                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={exportCSV}
                              className="h-8 px-3 text-xs font-semibold bg-slate-900 border border-white/10 text-slate-300 hover:bg-white/5 rounded-xl"
                            >
                              Export CSV
                            </Button>
                            <Button
                              size="sm"
                              onClick={exportJSON}
                              className="h-8 px-3 text-xs font-semibold bg-slate-900 border border-white/10 text-slate-300 hover:bg-white/5 rounded-xl"
                            >
                              Export JSON
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Search & Filter Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            placeholder="Search tasks by source or result text..."
                            className="w-full text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900/60 text-white focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.14_170)]"
                          />
                        </div>
                        <div>
                          <select
                            value={taskCategoryFilter}
                            onChange={(e) => setTaskCategoryFilter(e.target.value)}
                            className="w-full text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.14_170)]"
                          >
                            <option value="all">All Categories</option>
                            <option value="text">Text Translation</option>
                            <option value="voice">Voice Transcription</option>
                            <option value="document">Document Translation</option>
                            <option value="image">Image Scan Task</option>
                            <option value="study">Study Session helper</option>
                            <option value="post">Social Post</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      /* Premium Skeleton Grid */
                      <div className="space-y-3">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/10 skeleton" />
                              <div className="space-y-1.5">
                                <div className="h-3.5 w-24 bg-white/10 rounded skeleton" />
                                <div className="h-3 w-40 bg-white/10 rounded skeleton" />
                              </div>
                            </div>
                            <div className="h-6 w-16 bg-white/10 rounded skeleton" />
                          </div>
                        ))}
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs text-center p-4">
                        <p>No translation tasks found.</p>
                        <p className="mt-1 text-slate-600">Create a task above to log details!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-4">Task Category</th>
                              <th className="py-3 px-4">Source Text</th>
                              <th className="py-3 px-4">Result</th>
                              <th className="py-3 px-4">Languages</th>
                              <th className="py-3 px-4">Created At</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTasks.map((it) => {
                              const Icon = iconFor[it.kind] ?? LangIcon;
                              const isOptimisticDelete = deletingIds.has(it.id);

                              return (
                                <tr
                                  key={it.id}
                                  className={`border-b border-white/5 text-slate-200 hover:bg-white/5 transition-all duration-300
                                    ${isOptimisticDelete ? "optimistic-delete" : ""}`}
                                >
                                  <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg grid place-items-center bg-white/5 text-[oklch(0.62_0.14_170)]">
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="uppercase tracking-wide text-[10px]">{it.kind}</span>
                                  </td>
                                  <td className="py-3.5 px-4 max-w-[180px] truncate text-slate-400 select-all" title={it.source_text}>
                                    {it.source_text}
                                  </td>
                                  <td className="py-3.5 px-4 max-w-[180px] truncate font-medium text-slate-100 select-all" title={it.translated_text}>
                                    {it.translated_text}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-400">
                                    {languageName(it.source_lang)} → {languageName(it.target_lang)}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-500 text-[10px]">
                                    {new Date(it.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          handleToggleSaved(it.id, it.saved);
                                          logActivity(
                                            "Task Audit Trail",
                                            `Audit Trail: changed saved status from "${it.saved ? "saved" : "unsaved"}" to "${!it.saved ? "saved" : "unsaved"}" for task "${it.source_text.slice(0, 20)}..."`,
                                            "update"
                                          );
                                        }}
                                        className="h-7 w-7 rounded-lg hover:bg-white/5"
                                        aria-label="Toggle Saved Status"
                                      >
                                        {it.saved ? (
                                          <Star className="w-3.5 h-3.5 text-[oklch(0.62_0.14_170)] fill-[oklch(0.62_0.14_170)]" />
                                        ) : (
                                          <StarOff className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </Button>
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          navigator.clipboard.writeText(it.translated_text);
                                          toast.success("Copied translation!");
                                        }}
                                        className="h-7 w-7 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200"
                                        aria-label="Copy Translated Text"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </Button>
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDeleteWithUndo(it.id)}
                                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300"
                                        aria-label="Move to Trash"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 7: TRASH BIN LIST */}
              {activeTab === "trash" && (
                <div className="space-y-6">
                  
                  {/* Trash Bin Header */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-rose-400" /> Trash Bin
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Tasks in the trash bin are automatically deleted 30 days after they were created.
                      </p>
                    </div>

                    {loading ? (
                      <div className="h-[200px] flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-[oklch(0.62_0.14_170)]" /> Loading trash...
                      </div>
                    ) : trashTasks.length === 0 ? (
                      <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs text-center p-4 mt-6">
                        <p>Your trash bin is empty.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-6">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-4">Task Category</th>
                              <th className="py-3 px-4">Source Text</th>
                              <th className="py-3 px-4">Result</th>
                              <th className="py-3 px-4">Languages</th>
                              <th className="py-3 px-4">Auto-Deletes In</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trashTasks.map((it) => {
                              const Icon = iconFor[it.kind] ?? LangIcon;
                              const ageInMs = new Date().getTime() - new Date(it.created_at).getTime();
                              const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
                              const daysLeft = Math.max(0, 30 - ageInDays);
                              
                              return (
                                <tr key={it.id} className="border-b border-white/5 text-slate-200 hover:bg-white/5 transition-colors">
                                  <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg grid place-items-center bg-white/5 text-rose-400">
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="uppercase tracking-wide text-[10px]">
                                      {it.kind.replace("_trash", "")}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 max-w-[180px] truncate text-slate-400 select-all" title={it.source_text}>
                                    {it.source_text}
                                  </td>
                                  <td className="py-3.5 px-4 max-w-[180px] truncate font-medium text-slate-100 select-all" title={it.translated_text}>
                                    {it.translated_text}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-400">
                                    {languageName(it.source_lang)} → {languageName(it.target_lang)}
                                  </td>
                                  <td className="py-3.5 px-4 text-rose-400 font-semibold text-[10px]">
                                    {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={async () => {
                                          try {
                                            await restore({ data: { id: it.id } });
                                            toast.success("Task restored successfully!");
                                            showPopup("Task restored to Task Manager board successfully.", "success");
                                            logActivity(
                                              "Task State Audit Trail", 
                                              `Audit Trail: changed task state from trashed (kind: "${it.kind}") to active (kind: "${it.kind.replace("_trash", "")}") for task "${it.source_text.slice(0, 20)}..."`, 
                                              "update"
                                            );
                                            refresh();
                                          } catch (err: any) {
                                            toast.error(err.message || "Failed to restore task");
                                          }
                                        }}
                                        className="h-7 w-7 rounded-lg hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300"
                                        aria-label="Restore Task"
                                        title="Restore Task"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={async () => {
                                          if (confirm("Are you sure you want to permanently delete this task from the database? This cannot be undone.")) {
                                            try {
                                              await remove({ data: { id: it.id } });
                                              toast.success("Task deleted permanently!");
                                              showPopup("Task permanently deleted from database.", "warning");
                                              logActivity(
                                                "Task State Audit Trail", 
                                                `Audit Trail: changed task state from trashed (kind: "${it.kind}") to deleted (purged from database) for task "${it.source_text.slice(0, 20)}..."`, 
                                                "delete"
                                              );
                                              refresh();
                                            } catch (err: any) {
                                              toast.error(err.message || "Failed to delete task");
                                            }
                                          }
                                        }}
                                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300"
                                        aria-label="Delete Permanently"
                                        title="Delete Permanently"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 8: ACTIVITY LOGS TIMELINE */}
              {activeTab === "activity" && (
                <div className="space-y-6">
                  
                  {/* Activity Dashboard Card */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                          <Activity className="w-5 h-5 text-[oklch(0.62_0.14_170)]" /> System Activity Log
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Track database records, queries, profile updates, and server bypass status in real time.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input
                          type="text"
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          placeholder="Search activities..."
                          className="text-xs px-3.5 py-1.5 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.14_170)] w-full sm:w-48"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActivities([]);
                            logActivity("Logs Cleared", "Activity logs cleared by administrator.", "system");
                          }}
                          className="h-8 px-3 rounded-xl text-slate-400 hover:text-rose-400 text-xs shrink-0"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {/* Timeline List */}
                    <div className="relative pl-6 border-l border-white/10 ml-3 space-y-6">
                      {activities
                        .filter(act => 
                          act.event.toLowerCase().includes(activitySearch.toLowerCase()) || 
                          act.detail.toLowerCase().includes(activitySearch.toLowerCase())
                        )
                        .map((act) => {
                          // Icon colors based on type
                          const circleClr = 
                            act.type === "create" ? "bg-emerald-400/20 border-emerald-400 text-emerald-400" :
                            act.type === "delete" ? "bg-rose-400/20 border-rose-400 text-rose-400" :
                            act.type === "update" ? "bg-amber-400/20 border-amber-400 text-amber-400" :
                            "bg-sky-400/20 border-sky-400 text-sky-400";

                          return (
                            <div key={act.id} className="relative group">
                              
                              {/* Glowing circle point */}
                              <span className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-slate-950 transition-transform group-hover:scale-125 ${circleClr}`} />

                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-200 block">
                                    {act.event}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block leading-relaxed">
                                    {act.detail}
                                  </span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wide font-bold text-slate-500 shrink-0">
                                  {act.time}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                      {activities.filter(act => 
                        act.event.toLowerCase().includes(activitySearch.toLowerCase()) || 
                        act.detail.toLowerCase().includes(activitySearch.toLowerCase())
                      ).length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-xs">
                          No matching logs found.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 9: ANALYTICS DASHBOARD */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  
                  {/* Top Dashboard Header */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[oklch(0.62_0.14_170)]" /> Advanced Translation Analytics
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Deeper insights into category shares, daily trends, volume processing, and language distribution.
                      </p>
                    </div>
                    <span className="bg-slate-900 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
                      Volume: <span className="text-[oklch(0.62_0.14_170)] font-bold">{totalCharacters} Chars</span>
                    </span>
                  </div>

                  {/* Interactive Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Average Character Length</span>
                      <span className="text-2xl font-extrabold text-white mt-2">
                        {totalTasks > 0 ? Math.round(totalCharacters / totalTasks) : 0}
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Language Diversity</span>
                      <span className="text-2xl font-extrabold text-white mt-2">
                        {uniqueLanguages} <span className="text-xs text-slate-400 font-medium">Langs Used</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Task Star Save Rate</span>
                      <span className="text-2xl font-extrabold text-white mt-2">
                        {totalTasks > 0 ? Math.round((savedCount / totalTasks) * 100) : 0}%
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-3xl p-5 border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Recycle Trash Count</span>
                      <span className="text-2xl font-extrabold text-white mt-2">
                        {trashTasks.length} <span className="text-xs text-slate-400 font-medium">Tasks in Bin</span>
                      </span>
                    </div>
                  </div>

                  {/* Double Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Left Chart: Daily Translation Activity Area Chart */}
                    <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 flex flex-col">
                      <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider mb-4">Daily Translation Trends</h4>
                      <div className="h-[250px] w-full">
                        {mounted && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="oklch(0.62_0.14_170)" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="oklch(0.62_0.14_170)" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "oklch(0.12 0.025 280)",
                                  border: "1px solid rgba(0,128,128,0.2)",
                                  borderRadius: "12px",
                                }}
                              />
                              <Area type="monotone" dataKey="count" stroke="oklch(0.62_0.14_170)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Right Chart: Category Share Distribution Pie Chart */}
                    <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 flex flex-col">
                      <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider mb-4">Category Share Distribution</h4>
                      <div className="h-[250px] w-full flex items-center justify-center">
                        {mounted && (
                          pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => {
                                    const colors = ["oklch(0.62_0.14_170)", "#6366f1", "#f59e0b", "#3b82f6", "#ec4899"];
                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                  })}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    background: "oklch(0.12 0.025 280)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "12px",
                                  }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-xs text-slate-500">Create tasks to view share distribution.</p>
                          )
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Languages Popularity Index list */}
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-4">
                    <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider">Top Target Languages Usage Index</h4>
                    <div className="space-y-3.5">
                      {popularLanguages.length > 0 ? (
                        popularLanguages.map((lang, index) => {
                          const percent = Math.round((lang.count / (totalTasks || 1)) * 100);
                          return (
                            <div key={lang.code} className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-200">{index + 1}. {lang.name} ({lang.code.toUpperCase()})</span>
                                <span className="text-slate-400 font-medium">{lang.count} {lang.count === 1 ? "task" : "tasks"} ({percent}%)</span>
                              </div>
                              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[oklch(0.62_0.14_170)] to-indigo-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 py-4 text-center">No language logs recorded yet.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        ) : (
          /* BHASHABRIDGE CLASSIC LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            
            {/* LEFT PANEL */}
            <aside className="space-y-6">
              <div className="glass rounded-3xl p-6 border border-white/10 relative overflow-hidden flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--gradient-saffron)] text-[oklch(0.18_0.04_275)] font-display text-3xl font-bold flex items-center justify-center shadow-[var(--shadow-glow)] mb-4">
                  {profileName ? profileName.slice(0, 1).toUpperCase() : "U"}
                </div>
                
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--saffron)]/15 text-[var(--saffron)] border border-[var(--saffron)]/20 mb-3">
                  {role}
                </span>
                
                <h2 className="font-display text-xl font-bold text-foreground line-clamp-1">{profileName}</h2>
                <p className="text-xs text-muted-foreground mt-1 mb-4 select-all">{user?.email || "alex@example.edu"}</p>
                
                <div className="w-full border-t border-white/5 pt-4 space-y-3 text-left text-sm">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Bio</span>
                    <span className="text-foreground line-clamp-3">{bio}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground text-xs">{location}</span>
                  </div>
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-6 bg-white/5 hover:bg-white/10 border border-white/10 h-10 rounded-xl"
                  onClick={() => {
                    setEditName(profileName);
                    setEditBio(bio);
                    setEditLocation(location);
                    setEditRole(role);
                    setIsEditingProfile(true);
                  }}
                >
                  Edit Profile
                </Button>
              </div>
              
              <div className="glass rounded-3xl p-6 border border-white/10 space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-3">Quick Navigation</h3>
                {[
                  { to: "/translator", label: "Text Translator" },
                  { to: "/voice", label: "Voice Translator" },
                  { to: "/documents", label: "Document Translator" },
                  { to: "/image", label: "Image Translator" },
                  { to: "/study", label: "Study Assistant" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block px-3 py-2 text-sm text-muted-foreground rounded-xl hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </aside>
            
            {/* MAIN CONTENT AREA */}
            <div className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between min-h-[120px] shadow-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Tasks</span>
                  <span className="text-4xl font-bold mt-2 text-gradient-saffron">{totalTasks}</span>
                  <span className="text-xs text-muted-foreground mt-1">Logged translations</span>
                </div>
                
                <div className="glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between min-h-[120px] shadow-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Saved Items</span>
                  <span className="text-4xl font-bold mt-2 text-[var(--gold)]">{savedCount}</span>
                  <span className="text-xs text-muted-foreground mt-1">Starred entries</span>
                </div>
                
                <div className="glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between min-h-[120px] shadow-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Unique Formats</span>
                  <span className="text-4xl font-bold mt-2 text-indigo-400">{kinds.filter(k => k !== "post" && items.filter(i => i.kind === k).length > 0).length}</span>
                  <span className="text-xs text-muted-foreground mt-1">Different features used</span>
                </div>
                
              </div>
              
              {/* Main Activity Chart */}
              <div className="glass rounded-3xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Activity Trends</h3>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[var(--saffron)]" /> Metrics by Category
                  </span>
                </div>
                <div className="h-[240px] w-full flex items-center justify-center">
                  {mounted ? (
                    totalTasks > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.filter(d => d.key !== "post")} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="oklch(0.74 0.03 80)" fontSize={12} tickLine={false} />
                          <YAxis stroke="oklch(0.74 0.03 80)" fontSize={12} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.02)" }}
                            contentStyle={{
                              background: "oklch(0.18 0.04 275)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                            }}
                            labelStyle={{ color: "#fff", fontWeight: "bold" }}
                          />
                          <Bar dataKey="count" fill="oklch(0.72 0.17 55)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">No activity recorded yet.</p>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--saffron)]" /> Loading Activity...
                    </div>
                  )}
                </div>
              </div>
              
              {/* History Feed List */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-display text-2xl font-semibold">Translation History</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={filter === "all" ? "secondary" : "ghost"}
                      onClick={() => setFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={filter === "saved" ? "secondary" : "ghost"}
                      onClick={() => setFilter("saved")}
                    >
                      Saved
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--saffron)]" /> Loading…
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="mt-16 text-center glass rounded-3xl p-12">
                    <p className="text-muted-foreground text-sm">
                      No translations yet. Start translating using the links!
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 space-y-3 animate-fade-in">
                    {filteredTasks.map((it) => {
                      const Icon = iconFor[it.kind] ?? LangIcon;
                      return (
                        <div key={it.id} className="glass rounded-2xl p-5 border border-white/10 hover:border-white/15 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="w-8 h-8 rounded-lg grid place-items-center bg-white/5">
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="uppercase tracking-wider font-semibold">{it.kind}</span>
                              <span>
                                · {languageName(it.source_lang)} → {languageName(it.target_lang)}
                              </span>
                              <span>· {new Date(it.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={async () => {
                                  await toggle({ data: { id: it.id, saved: !it.saved } });
                                  refresh();
                                }}
                                aria-label="Toggle saved"
                                className="rounded-xl hover:bg-white/5"
                              >
                                {it.saved ? (
                                  <Star className="w-4 h-4 text-[var(--saffron)] fill-[var(--saffron)]" />
                                ) : (
                                  <StarOff className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(it.translated_text);
                                  toast.success("Copied");
                                }}
                                aria-label="Copy translation"
                                className="rounded-xl hover:bg-white/5"
                                
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={async () => {
                                  await remove({ data: { id: it.id } });
                                  refresh();
                                }}
                                aria-label="Delete"
                                className="rounded-xl hover:bg-white/5 text-rose-400 hover:text-rose-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 mt-4 pt-2 border-t border-white/5">
                            <div className="text-sm text-slate-400 whitespace-pre-wrap">
                              {it.source_text}
                            </div>
                            <div className="text-sm whitespace-pre-wrap text-foreground">
                              {it.translated_text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>
      <SiteFooter />

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 text-white p-6 rounded-2xl shadow-2xl">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-[oklch(0.62_0.14_170)]" /> Edit Profile
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                aria-label="Close modal"
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-[oklch(0.62_0.14_170)] focus:outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400">Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-[oklch(0.62_0.14_170)] focus:outline-none resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-[oklch(0.62_0.14_170)] focus:outline-none"
                  placeholder="e.g. Online Campus"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400">User Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900 text-white focus:ring-2 focus:ring-[oklch(0.62_0.14_170)] focus:outline-none"
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 hover:bg-white/5 rounded-xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex-1 bg-[oklch(0.62_0.14_170)] text-slate-950 font-bold hover:opacity-90 border-0 rounded-xl h-12 flex items-center justify-center gap-2"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}
      {/* Real-time Floating Notification Popups Stack */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
        {activePopups.map((popup) => {
          const borderClr = 
            popup.type === "success" ? "border-emerald-500/30 bg-emerald-950/80 shadow-emerald-500/10 text-emerald-200" :
            popup.type === "warning" ? "border-amber-500/30 bg-amber-950/80 shadow-amber-500/10 text-amber-200" :
            "border-sky-500/30 bg-slate-900/90 shadow-sky-500/10 text-sky-200";

          return (
            <div
              key={popup.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-8 duration-200 ${borderClr}`}
            >
              <span className="mt-0.5 shrink-0">
                {popup.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {popup.type === "warning" && <Bell className="w-4 h-4 text-amber-400" />}
                {popup.type === "info" && <Sparkles className="w-4 h-4 text-sky-400" />}
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold leading-normal">{popup.title}</p>
              </div>
              <button
                onClick={() => setActivePopups(prev => prev.filter(p => p.id !== popup.id))}
                className="text-slate-400 hover:text-slate-200 shrink-0 text-xs font-bold leading-none p-0.5"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Alerts History Modal Popup */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[80vh] flex flex-col justify-between shadow-2xl relative">
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[oklch(0.62_0.14_170)]" /> Alert Notification Center
                </h3>
                <button
                  onClick={() => setIsAlertsModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 mt-4 overflow-y-auto max-h-[50vh] pr-1">
                {alerts.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">No notifications logged yet.</p>
                ) : (
                  alerts.map((alert) => {
                    const bg = 
                      alert.type === "success" ? "bg-emerald-500/10 border-emerald-500/20" :
                      alert.type === "warning" ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-sky-500/10 border-sky-500/20";
                    
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs text-slate-200 ${bg}`}
                      >
                        <span className="mt-0.5">
                          {alert.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {alert.type === "warning" && <Bell className="w-4 h-4 text-amber-400" />}
                          {alert.type === "info" && <Sparkles className="w-4 h-4 text-sky-400" />}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium leading-normal">{alert.title}</p>
                        </div>
                        <button
                          onClick={() => {
                            setAlerts(prev => prev.filter(a => a.id !== alert.id));
                            setAlertCount(c => Math.max(0, c - 1));
                          }}
                          className="text-slate-400 hover:text-slate-200 text-[10px] ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setAlerts([]);
                  setAlertCount(0);
                }}
                className="text-slate-400 hover:text-rose-400 text-xs h-8 px-3 rounded-lg animate-in fade-in"
                disabled={alerts.length === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={() => setIsAlertsModalOpen(false)}
                className="bg-[oklch(0.62_0.14_170)] text-slate-950 hover:bg-[oklch(0.62_0.14_170)]/90 font-bold text-xs h-8 px-4 rounded-lg"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

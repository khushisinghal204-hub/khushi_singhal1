import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getDbClient(userId: string, standardClient: any) {
  if (userId === "00000000-0000-0000-0000-000000000000") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }
  return standardClient;
}

function shouldBypassDb(userId: string) {
  // Bypass the real Supabase DB when running locally (development mode)
  // or when using the mock developer user ID (which does not exist in auth.users).
  return process.env.NODE_ENV !== "production" || userId === "00000000-0000-0000-0000-000000000000";
}

// Generate simple UUID for mock records
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get mock database operations
let mockDbMemory: any[] = [];
let isLoaded = false;

// Get mock database operations
async function getMockDbOps() {
  const fs = await import("fs");
  const path = await import("path");
  const MOCK_DB_PATH = path.join(process.cwd(), "mock-db.json");

  if (!isLoaded) {
    try {
      if (fs.existsSync(MOCK_DB_PATH)) {
        mockDbMemory = JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf-8"));
      }
    } catch (e) {
      console.warn("Failed to load initial mock-db.json:", e);
    }
    isLoaded = true;
  }

  const readDb = (): any[] => mockDbMemory;

  const writeDb = (data: any[]) => {
    mockDbMemory = data;
    try {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      // Ignore write errors silently on Vercel read-only filesystem
    }
  };

  return { readDb, writeDb };
}

const SaveInput = z.object({
  kind: z.enum(["text", "voice", "document", "image", "study", "post"]),
  sourceLang: z.string().max(20),
  targetLang: z.string().max(20),
  sourceText: z.string().max(20000),
  translatedText: z.string().max(40000),
  saved: z.boolean().default(false),
});

export const saveTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(SaveInput)
  .handler(async ({ data, context }) => {
    if (shouldBypassDb(context.userId)) {
      const { readDb, writeDb } = await getMockDbOps();
      const items = readDb();
      const newId = generateUUID();
      const newRow = {
        id: newId,
        user_id: context.userId,
        kind: data.kind,
        source_lang: data.sourceLang,
        target_lang: data.targetLang,
        source_text: data.sourceText,
        translated_text: data.translatedText,
        saved: data.saved,
        created_at: new Date().toISOString(),
      };
      items.push(newRow);
      writeDb(items);
      return { id: newId };
    }

    const db = await getDbClient(context.userId, context.supabase);
    const { error, data: row } = await db
      .from("translations")
      .insert({
        user_id: context.userId,
        kind: data.kind,
        source_lang: data.sourceLang,
        target_lang: data.targetLang,
        source_text: data.sourceText,
        translated_text: data.translatedText,
        saved: data.saved,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listTranslations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (shouldBypassDb(context.userId)) {
      const { readDb, writeDb } = await getMockDbOps();
      let items = readDb();

      // Auto-purge trashed translations older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const beforePurgeCount = items.length;
      items = items.filter(item => {
        const isTrash = item.kind.endsWith("_trash");
        const isOld = new Date(item.created_at) < thirtyDaysAgo;
        return !(isTrash && isOld);
      });
      if (items.length !== beforePurgeCount) {
        writeDb(items);
      }

      // Sort by created_at descending, limit 100
      const sorted = items
        .filter(item => item.user_id === context.userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100);

      return { items: sorted };
    }

    const db = await getDbClient(context.userId, context.supabase);
    
    // Auto-purge trashed translations older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
      await db
        .from("translations")
        .delete()
        .eq("user_id", context.userId)
        .like("kind", "%_trash")
        .lt("created_at", thirtyDaysAgo.toISOString());
    } catch (purgeErr) {
      console.error("Auto-purge trash failed:", purgeErr);
    }

    const { data, error } = await db
      .from("translations")
      .select("id, kind, source_lang, target_lang, source_text, translated_text, saved, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const ToggleInput = z.object({ id: z.string().uuid(), saved: z.boolean() });
export const toggleSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(ToggleInput)
  .handler(async ({ data, context }) => {
    if (shouldBypassDb(context.userId)) {
      const { readDb, writeDb } = await getMockDbOps();
      const items = readDb();
      const item = items.find(i => i.id === data.id);
      if (item) {
        item.saved = data.saved;
        writeDb(items);
      }
      return { ok: true };
    }

    const db = await getDbClient(context.userId, context.supabase);
    const { error } = await db
      .from("translations")
      .update({ saved: data.saved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(DeleteInput)
  .handler(async ({ data, context }) => {
    if (shouldBypassDb(context.userId)) {
      const { readDb, writeDb } = await getMockDbOps();
      let items = readDb();
      items = items.filter(i => i.id !== data.id);
      writeDb(items);
      return { ok: true };
    }

    const db = await getDbClient(context.userId, context.supabase);
    const { error } = await db.from("translations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteUserInput = z.object({ userId: z.string() });
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(DeleteUserInput)
  .handler(async ({ data, context }) => {
    if (shouldBypassDb(context.userId)) {
      // Simulation for developer bypass admin deletion
      return { ok: true };
    }

    // 1. Verify caller has Admin role or is in dev bypass mode
    const isMockAdmin = context.userId === "00000000-0000-0000-0000-000000000000";
    let isAdmin = isMockAdmin;

    if (!isMockAdmin) {
      const { data: userResp } = await context.supabase.auth.getUser();
      isAdmin = userResp?.user?.user_metadata?.role === "Admin";
    }

    if (!isAdmin) {
      throw new Error("Forbidden: Only administrators can perform this action");
    }

    // 2. Load admin client inside server handler to avoid client bundle leak
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 3. Delete user from auth.users (cascades to profiles and translation tables)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) {
      // Fallback: If auth delete fails or isn't supported, delete from public profiles table directly
      const { error: dbErr } = await context.supabase
        .from("profiles")
        .delete()
        .eq("id", data.userId);
      if (dbErr) throw new Error(dbErr.message);
    }

    return { ok: true };
  });

const SoftDeleteInput = z.object({ id: z.string().uuid() });
export const softDeleteTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(SoftDeleteInput)
  .handler(async ({ data, context }) => {
    if (shouldBypassDb(context.userId)) {
      const { readDb, writeDb } = await getMockDbOps();
      const items = readDb();
      const item = items.find(i => i.id === data.id);
      if (!item) throw new Error("Task not found");
      item.kind = item.kind.endsWith("_trash") ? item.kind : `${item.kind}_trash`;
      writeDb(items);
      return { ok: true };
    }

    const db = await getDbClient(context.userId, context.supabase);
    
    // 1. Get the current kind
    const { data: item } = await db
      .from("translations")
      .select("kind")
      .eq("id", data.id)
      .single();
      
    if (!item) throw new Error("Task not found");
    
    // 2. Append _trash to kind if not already present
    const newKind = item.kind.endsWith("_trash") ? item.kind : `${item.kind}_trash`;
    
    const { error } = await db
      .from("translations")
      .update({ kind: newKind })
      .eq("id", data.id);
      
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RestoreInput = z.object({ id: z.string().uuid() });
export const restoreTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(RestoreInput)
  .handler(async ({ data, context }) => {
    if (shouldBypassDb(context.userId)) {
      const { readDb, writeDb } = await getMockDbOps();
      const items = readDb();
      const item = items.find(i => i.id === data.id);
      if (!item) throw new Error("Task not found");
      item.kind = item.kind.endsWith("_trash") ? item.kind.replace("_trash", "") : item.kind;
      writeDb(items);
      return { ok: true };
    }

    const db = await getDbClient(context.userId, context.supabase);
    
    // 1. Get the current kind
    const { data: item } = await db
      .from("translations")
      .select("kind")
      .eq("id", data.id)
      .single();
      
    if (!item) throw new Error("Task not found");
    
    // 2. Remove _trash suffix from kind
    const newKind = item.kind.endsWith("_trash") ? item.kind.replace("_trash", "") : item.kind;
    
    const { error } = await db
      .from("translations")
      .update({ kind: newKind })
      .eq("id", data.id);
      
    if (error) throw new Error(error.message);
    return { ok: true };
  });

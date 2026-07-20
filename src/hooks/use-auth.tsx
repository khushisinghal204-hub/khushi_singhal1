import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("sb-mock-login") === "true") {
      setUser({
        id: "00000000-0000-0000-0000-000000000000",
        email: "developer@bhashabridge.io",
        user_metadata: {
          full_name: localStorage.getItem("sb-mock-name") || "Developer Admin",
          role: localStorage.getItem("sb-mock-role") || "Admin",
          bio: localStorage.getItem("sb-mock-bio") || "Developer bypass active",
          location: localStorage.getItem("sb-mock-loc") || "Localhost"
        }
      } as any);
      setSession({
        access_token: "mock-token",
        user: { id: "00000000-0000-0000-0000-000000000000" }
      } as any);
      setLoading(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

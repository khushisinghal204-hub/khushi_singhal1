import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined" && localStorage.getItem("sb-mock-login") === "true") {
      return {
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          email: "developer@bhashabridge.io",
          user_metadata: {
            full_name: localStorage.getItem("sb-mock-name") || "Developer Admin",
            role: localStorage.getItem("sb-mock-role") || "Admin",
            bio: localStorage.getItem("sb-mock-bio") || "Developer bypass active",
            location: localStorage.getItem("sb-mock-loc") || "Localhost"
          }
        }
      };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});

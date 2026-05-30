import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Server-side: always send to /login. Client overrides below if signed in.
    if (typeof window === "undefined") {
      throw redirect({ to: "/login" });
    }
  },
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = Route.useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/feed" : "/login", replace: true });
    });
  }, [navigate]);
  return null;
}

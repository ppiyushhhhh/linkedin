import { createFileRoute, Link, Outlet, useLocation, redirect } from "@tanstack/react-router";
import { BackButton } from "@/components/app/BackButton";
import { User, Shield, Bell, Lock, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LinkUp World" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/settings" || location.pathname === "/settings/") {
      throw redirect({ to: "/settings/profile" });
    }
  },
  component: SettingsLayout,
});

const NAV = [
  { to: "/settings/profile", label: "Profile", icon: User },
  { to: "/settings/account", label: "Account", icon: KeyRound },
  { to: "/settings/privacy", label: "Privacy", icon: Shield },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/settings/security", label: "Security", icon: Lock },
] as const;

function SettingsLayout() {
  const loc = useLocation();
  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-3">
        <BackButton />
      </div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-2 md:sticky md:top-20 md:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
            {NAV.map((n) => {
              const active = loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

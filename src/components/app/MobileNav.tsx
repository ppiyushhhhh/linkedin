import { Link } from "@tanstack/react-router";
import { Home, Users, Search, Bell, User as UserIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/profile.functions";

export function MobileNav() {
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const username = me?.username ?? "";

  const items = [
    { to: "/feed", label: "Home", icon: Home, params: undefined as any },
    { to: "/network", label: "Network", icon: Users, params: undefined as any },
    { to: "/search", label: "Search", icon: Search, params: undefined as any },
    { to: "/notifications", label: "Alerts", icon: Bell, params: undefined as any },
    { to: "/u/$username", label: "Me", icon: UserIcon, params: { username } },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              to={it.to as any}
              params={it.params}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: false }}
            >
              <it.icon className="h-5 w-5" />
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

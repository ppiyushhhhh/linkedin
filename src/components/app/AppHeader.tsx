import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Home, Users, Search, User as UserIcon, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/profile.functions";
import { UserAvatar } from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const navItems = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/network", label: "Network", icon: Users },
  { to: "/search", label: "Search", icon: Search },
];

export function AppHeader() {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: me } = useQuery({
    queryKey: ["me-profile"],
    queryFn: () => getMyProfile(),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    await router.invalidate();
    navigate({ to: "/login" });
  };

  const fullName = me ? `${me.first_name} ${me.last_name}`.trim() || me.username : "";

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/feed" className="flex items-center gap-2 font-bold text-primary">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">CS</div>
          <span className="hidden sm:inline">ConnectSphere</span>
        </Link>

        <form
          className="relative ml-2 hidden flex-1 max-w-sm md:block"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } as any });
          }}
        >
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people"
            className="h-9 bg-muted pl-8"
          />
        </form>

        <nav className="ml-auto flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to as any}
              className="flex flex-col items-center rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <item.icon className="h-5 w-5" />
              <span className="hidden sm:block">{item.label}</span>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 outline-none">
              <UserAvatar url={me?.avatar_url} name={fullName} className="h-8 w-8" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs text-muted-foreground">@{me?.username}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/u/$username", params: { username: me?.username ?? "" } })}>
                <UserIcon className="mr-2 h-4 w-4" /> My profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}

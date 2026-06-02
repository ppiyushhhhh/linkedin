import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { Home, Users, Search, User as UserIcon, LogOut, PlusSquare } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/profile.functions";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/network", label: "Network", icon: Users },
  { to: "/feed", label: "Post", icon: PlusSquare },
  { to: "/search", label: "Search", icon: Search },
];

export function AppHeader() {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const urlSearch = useSearch({ strict: false }) as { q?: string };
  const [q, setQ] = useState(urlSearch?.q ?? "");

  useEffect(() => {
    setQ(urlSearch?.q ?? "");
  }, [urlSearch?.q]);

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
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link to="/feed" className="flex shrink-0 items-center gap-2 font-bold text-primary">
          <img src={logo} alt="LinkUp World" className="h-8 w-8 rounded-md object-cover" />
          <span className="hidden text-sm sm:inline">LinkUp World</span>
        </Link>

        <form
          className="relative ml-1 hidden flex-1 max-w-sm md:block"
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

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to as any}
              className="flex min-w-[60px] flex-col items-center rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary [&.active]:border-b-2 [&.active]:border-primary"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: true }}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-1">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <UserAvatar url={me?.avatar_url} name={fullName} className="h-8 w-8" />
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-muted-foreground">@{me?.username}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/u/$username", params: { username: me?.username ?? "" } })}>
              <UserIcon className="mr-2 h-4 w-4" /> View profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/feed" })}>
              <Home className="mr-2 h-4 w-4" /> Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import { Home, Users, Briefcase, Bell, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/profile.functions";
import { getUnreadMessageCount } from "@/lib/messages.functions";

export function MobileNav() {
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: unreadMsgs } = useQuery({
    queryKey: ["unread-messages"],
    queryFn: () => getUnreadMessageCount(),
    refetchInterval: 30_000,
  });
  const msgCount = unreadMsgs?.count ?? 0;
  const username = me?.username ?? "";

  void username;
  const items = [
    { to: "/feed", label: "Home", icon: Home, params: undefined as any, badge: 0 },
    { to: "/network", label: "Network", icon: Users, params: undefined as any, badge: 0 },
    { to: "/jobs", label: "Jobs", icon: Briefcase, params: undefined as any, badge: 0 },
    { to: "/messages", label: "Chat", icon: MessageSquare, params: undefined as any, badge: msgCount },
    { to: "/notifications", label: "Alerts", icon: Bell, params: undefined as any, badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              to={it.to as any}
              params={it.params}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: false }}
            >
              <div className="relative">
                <it.icon className="h-5 w-5" />
                {it.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
                    {it.badge > 9 ? "9+" : it.badge}
                  </span>
                )}
              </div>
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

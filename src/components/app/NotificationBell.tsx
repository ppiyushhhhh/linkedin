import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, Check, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markAllRead,
  markRead,
} from "@/lib/notifications.functions";
import { NotificationItem } from "./NotificationItem";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications", "latest"],
    queryFn: () => listNotifications({ data: { limit: 10 } }),
    refetchInterval: 60_000,
  });

  // Realtime: refresh on any change to my notifications.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`notif-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
          () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
          },
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  const markAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });
  const markOne = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = (data?.notifications ?? []).slice(0, 5);
  const unread = data?.unread ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications {unread > 0 && <span className="text-muted-foreground">({unread})</span>}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">You're all caught up</p>
            </div>
          ) : (
            items.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                compact
                onOpen={() => {/* Popover closes via outside click on navigation */}}
                onMarkRead={(id) => markOne.mutate(id)}
              />
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full justify-center" onClick={() => navigate({ to: "/notifications" })}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

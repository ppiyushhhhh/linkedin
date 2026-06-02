import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { NotificationItem } from "@/components/app/NotificationItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearAllNotifications,
  deleteNotification,
  listNotifications,
  markAllRead,
  markRead,
  type NotificationRow,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LinkUp World" }] }),
  component: NotificationsPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "connections", label: "Connections", types: ["connection_request", "connection_accepted"] },
  { id: "posts", label: "Posts", types: ["post_like", "post_comment", "comment_reply", "mention"] },
  { id: "followers", label: "Followers", types: ["follow"] },
] as const;

function filterRows(rows: NotificationRow[], filter: string) {
  if (filter === "all") return rows;
  if (filter === "unread") return rows.filter((n) => !n.is_read);
  const f = FILTERS.find((f) => f.id === filter);
  const types = (f as any)?.types as string[] | undefined;
  return types ? rows.filter((n) => types.includes(n.type)) : rows;
}

function NotificationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => listNotifications({ data: { limit: 100 } }),
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`notif-page-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
          () => qc.invalidateQueries({ queryKey: ["notifications"] }),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  const markOne = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const removeOne = useMutation({
    mutationFn: (id: string) => deleteNotification({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete"),
  });
  const markAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read");
    },
  });
  const clearAll = useMutation({
    mutationFn: () => clearAllNotifications(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications cleared");
    },
  });

  const rows = data?.notifications ?? [];
  const unread = data?.unread ?? 0;
  const filtered = filterRows(rows, tab);

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-3">
        <BackButton />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>
            <Check className="mr-1 h-4 w-4" /> Mark all read
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={rows.length === 0}>
                <Trash2 className="mr-1 h-4 w-4" /> Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all of your notifications. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearAll.mutate()}>Clear all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.id} value={f.id}>
              {f.label}
              {f.id === "unread" && unread > 0 ? ` (${unread})` : ""}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            {isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 border-b px-3 py-3 last:border-b-0">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No notifications</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "unread" ? "You have no unread notifications." : "We'll let you know when something happens."}
                </p>
              </div>
            ) : (
              filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onMarkRead={(id) => markOne.mutate(id)}
                  onDelete={(id) => removeOne.mutate(id)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { createFileRoute, Link, Outlet, useMatch, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listConversations } from "@/lib/messages.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { UserAvatar } from "@/components/app/UserAvatar";
import { BackButton } from "@/components/app/BackButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, Inbox, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — LinkUp World" }] }),
  component: MessagesLayout,
});

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

function MessagesLayout() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: convs, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
    refetchInterval: 30_000,
  });

  // Detect active conversation route to control mobile visibility
  const childMatch = useMatch({ from: "/_authenticated/messages/$conversationId", shouldThrow: false });
  const activeId = childMatch?.params?.conversationId ?? null;

  // Realtime: refresh list when any message lands in one of my conversations
  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel(`msgs-list-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["unread-messages"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.id, qc]);

  return (
    <div className="mx-auto max-w-6xl px-2 py-3 sm:px-4 sm:py-5">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <BackButton />
        <Link to="/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-[320px_1fr]">
        {/* Sidebar / conversation list */}
        <aside
          className={cn(
            "overflow-hidden rounded-xl border bg-card md:block",
            activeId ? "hidden" : "block",
          )}
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h1 className="flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4" /> Messaging
            </h1>
          </header>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !convs || convs.length === 0 ? (
              <EmptyList />
            ) : (
              <ul>
                {convs.map((c) => {
                  const name = c.other
                    ? `${c.other.first_name ?? ""} ${c.other.last_name ?? ""}`.trim() || c.other.username
                    : "Unknown";
                  const isActive = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <Link
                        to="/messages/$conversationId"
                        params={{ conversationId: c.id }}
                        className={cn(
                          "flex items-start gap-3 border-b px-3 py-3 transition-colors hover:bg-muted/50",
                          isActive && "bg-primary/5",
                          c.unread_count > 0 && "bg-primary/[0.03]",
                        )}
                      >
                        <UserAvatar url={c.other?.avatar_url ?? undefined} name={name} className="h-11 w-11" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("truncate text-sm", c.unread_count > 0 ? "font-semibold" : "font-medium")}>
                              {name}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {c.last_message ? timeAgo(c.last_message.created_at) : ""}
                            </span>
                          </div>
                          {c.other?.headline && (
                            <p className="truncate text-xs text-muted-foreground">{c.other.headline}</p>
                          )}
                          <div className="mt-0.5 flex items-center gap-2">
                            <p className={cn("flex-1 truncate text-xs", c.unread_count > 0 ? "text-foreground" : "text-muted-foreground")}>
                              {c.last_message?.sender_id === me?.id && "You: "}
                              {c.last_message?.content ?? "No messages yet"}
                            </p>
                            {c.unread_count > 0 && (
                              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                                {c.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Active chat / outlet */}
        <section
          className={cn(
            "min-h-[60vh] overflow-hidden rounded-xl border bg-card md:block",
            activeId ? "block" : "hidden md:block",
          )}
        >
          <Outlet />
        </section>
      </div>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="px-4 py-12 text-center">
      <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">No conversations yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Start a conversation with one of your connections from their profile.
      </p>
    </div>
  );
}

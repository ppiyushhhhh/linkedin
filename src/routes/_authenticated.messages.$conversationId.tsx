import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteMessage,
  editMessage,
  getConversation,
  markConversationRead,
  sendMessage,
  type MessageRow,
} from "@/lib/messages.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ExternalLink, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  component: ConversationPage,
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function ConversationPage() {
  const { conversationId } = useParams({ from: "/_authenticated/messages/$conversationId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<MessageRow | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data, isLoading, error } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation({ data: { id: conversationId } }),
  });

  const markRead = useMutation({
    mutationFn: () => markConversationRead({ data: { conversation_id: conversationId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["unread-messages"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Realtime updates for this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
          // Auto-mark new incoming messages as read since user is viewing
          markRead.mutate();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, qc]);

  // Mark read when opening / messages load
  useEffect(() => {
    if (data) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.messages.length]);

  // Auto-scroll to latest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages.length]);

  const send = useMutation({
    mutationFn: (content: string) => sendMessage({ data: { conversation_id: conversationId, content } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const editMut = useMutation({
    mutationFn: (v: { id: string; content: string }) => editMessage({ data: v }),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      toast.success("Message updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteMessage({ data: { id } }),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Message deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const groups = useMemo(() => {
    const out: { day: string; items: MessageRow[] }[] = [];
    for (const m of data?.messages ?? []) {
      const day = formatDay(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [data?.messages]);

  const other = data?.other;
  const otherName = other ? `${other.first_name ?? ""} ${other.last_name ?? ""}`.trim() || other.username : "";

  if (error) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load this conversation.</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate({ to: "/messages" })}>
          Back to messages
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[calc(100vh-9rem)] flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => navigate({ to: "/messages" })}
          aria-label="Back to list"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {isLoading || !other ? (
          <>
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </>
        ) : (
          <>
            <UserAvatar url={other.avatar_url ?? undefined} name={otherName} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <Link
                to="/u/$username"
                params={{ username: other.username }}
                className="block truncate text-sm font-semibold hover:underline"
              >
                {otherName}
              </Link>
              {other.headline && <p className="truncate text-xs text-muted-foreground">{other.headline}</p>}
            </div>
            <Link to="/u/$username" params={{ username: other.username }}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> View profile
              </Button>
            </Link>
          </>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-10 max-w-[60%] rounded-2xl", i % 2 ? "ml-auto" : "")} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="text-sm font-medium">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Say hi to {otherName.split(" ")[0] || "them"} 👋</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.day} className="space-y-1.5">
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">{g.day}</span>
                </div>
                {g.items.map((m) => {
                  const mine = m.sender_id === me?.id;
                  return (
                    <div key={m.id} className={cn("group flex gap-2", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("flex max-w-[80%] flex-col sm:max-w-[65%]", mine && "items-end")}>
                        <div
                          className={cn(
                            "relative rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                            mine
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-muted text-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                          <span>{formatTime(m.created_at)}</span>
                          {mine && m.is_read && <span>· Read</span>}
                          {m.updated_at !== m.created_at && <span>· edited</span>}
                        </div>
                      </div>
                      {mine && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 self-center opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(m);
                                setEditText(m.content);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmDelete(m)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="flex items-end gap-2 border-t bg-card px-3 py-2.5 sm:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || send.isPending) return;
          send.mutate(t);
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const t = text.trim();
              if (t && !send.isPending) send.mutate(t);
            }
          }}
          placeholder="Write a message…"
          rows={1}
          className="min-h-10 resize-none"
        />
        <Button type="submit" size="icon" disabled={!text.trim() || send.isPending} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
          </DialogHeader>
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editing && editText.trim()) editMut.mutate({ id: editing.id, content: editText.trim() });
              }}
              disabled={editMut.isPending || !editText.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && delMut.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

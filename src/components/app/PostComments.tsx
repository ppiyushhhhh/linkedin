import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { UserAvatar } from "./UserAvatar";
import { addComment, deleteComment, getComments } from "@/lib/feed.functions";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function PostComments({
  postId,
  currentUserId,
  autoFocus,
}: {
  postId: string;
  currentUserId: string;
  autoFocus?: boolean;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => getComments({ data: { post_id: postId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["comments", postId] });
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["post", postId] });
  };

  const add = useMutation({
    mutationFn: () => addComment({ data: { post_id: postId, content: text } }),
    onSuccess: () => {
      setText("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 border-t bg-muted/30 px-4 py-3">
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="min-h-[40px] bg-card"
          rows={2}
          autoFocus={autoFocus}
        />
        <Button
          size="sm"
          disabled={!text.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          Post
        </Button>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      )}

      {!isLoading && (comments?.length ?? 0) === 0 && (
        <p className="py-2 text-center text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      )}

      <div className="space-y-2">
        {(comments ?? []).map((c: any) => {
          const name =
            `${c.author?.first_name ?? ""} ${c.author?.last_name ?? ""}`.trim() ||
            c.author?.username ||
            "User";
          return (
            <div key={c.id} className="flex gap-2">
              {c.author?.username ? (
                <Link to="/u/$username" params={{ username: c.author.username }}>
                  <UserAvatar url={c.author?.avatar_url} name={name} className="h-8 w-8" />
                </Link>
              ) : (
                <UserAvatar url={c.author?.avatar_url} name={name} className="h-8 w-8" />
              )}
              <div className="flex-1 rounded-lg bg-card px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {c.author?.username ? (
                      <Link
                        to="/u/$username"
                        params={{ username: c.author.username }}
                        className="text-sm font-semibold hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">{name}</span>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {c.author_id === currentUserId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove your comment.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove.mutate(c.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

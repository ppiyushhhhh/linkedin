import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ThumbsUp,
  MessageSquare,
  Trash2,
  PartyPopper,
  Heart,
  Lightbulb,
  Smile,
  Repeat2,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import {
  addComment,
  deleteComment,
  deletePost,
  getComments,
  toggleReaction,
  type FeedPost,
} from "@/lib/feed.functions";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


const REACTIONS = [
  { type: "like", label: "Like", Icon: ThumbsUp, color: "text-primary" },
  { type: "celebrate", label: "Celebrate", Icon: PartyPopper, color: "text-warning" },
  { type: "support", label: "Support", Icon: Heart, color: "text-destructive" },
  { type: "insightful", label: "Insightful", Icon: Lightbulb, color: "text-success" },
  { type: "funny", label: "Funny", Icon: Smile, color: "text-warning" },
] as const;

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const react = useMutation({
    mutationFn: (type: typeof REACTIONS[number]["type"]) => toggleReaction({ data: { post_id: post.id, type } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const del = useMutation({
    mutationFn: () => deletePost({ data: { id: post.id } }),
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const author = post.author;
  const fullName = `${author.first_name} ${author.last_name}`.trim() || author.username;
  const currentReaction = REACTIONS.find((r) => r.type === post.my_reaction);
  const MainIcon = currentReaction?.Icon ?? ThumbsUp;

  return (
    <article className="rounded-xl border bg-card shadow-sm">
      <header className="flex items-start gap-3 px-4 pt-4">
        <Link to="/u/$username" params={{ username: author.username }}>
          <UserAvatar url={author.avatar_url} name={fullName} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to="/u/$username" params={{ username: author.username }} className="block truncate font-semibold hover:underline">
            {fullName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{author.headline}</p>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
        </div>
        {post.author_id === currentUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Post actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => del.mutate()}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>




      <div className="whitespace-pre-wrap px-4 py-3 text-sm">{post.content}</div>
      {post.image_url && (
        <img src={post.image_url} alt="" className="max-h-[480px] w-full object-cover" />
      )}

      {post.reactions.total > 0 || post.comment_count > 0 ? (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <span>{post.reactions.total > 0 ? `${post.reactions.total} reaction${post.reactions.total === 1 ? "" : "s"}` : ""}</span>
          <button onClick={() => setShowComments((s) => !s)} className="hover:underline">
            {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count === 1 ? "" : "s"}` : ""}
          </button>
        </div>
      ) : null}

      <div className="border-t px-2 py-1">
        <div className="relative grid grid-cols-4">
          <div
            className="relative"
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => setShowPicker(false)}
          >
            <Button
              variant="ghost"
              className={cn("w-full justify-center gap-2", currentReaction?.color)}
              onClick={() => react.mutate(currentReaction?.type ?? "like")}
            >
              <MainIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{currentReaction?.label ?? "Like"}</span>
            </Button>
            {showPicker && (
              <div className="absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 gap-1 rounded-full border bg-popover p-1 shadow-md">
                {REACTIONS.map(({ type, Icon, label, color }) => (
                  <button
                    key={type}
                    title={label}
                    onClick={() => {
                      react.mutate(type);
                      setShowPicker(false);
                    }}
                    className={cn("rounded-full p-1.5 transition-transform hover:scale-125", color)}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" className="justify-center gap-2" onClick={() => setShowComments((s) => !s)}>
            <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Comment</span>
          </Button>
          <Button
            variant="ghost"
            className="justify-center gap-2"
            onClick={() => toast.info("Repost coming soon")}
          >
            <Repeat2 className="h-4 w-4" /> <span className="hidden sm:inline">Repost</span>
          </Button>
          <Button
            variant="ghost"
            className="justify-center gap-2"
            onClick={() => toast.success("Post saved")}
          >
            <Bookmark className="h-4 w-4" /> <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>


      {showComments && <Comments postId={post.id} currentUserId={currentUserId} />}
    </article>
  );
}

function Comments({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => getComments({ data: { post_id: postId } }),
  });

  const add = useMutation({
    mutationFn: () => addComment({ data: { post_id: postId, content: text } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
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
        />
        <Button size="sm" disabled={!text.trim() || add.isPending} onClick={() => add.mutate()}>Post</Button>
      </div>
      <div className="space-y-2">
        {(comments ?? []).map((c: any) => {
          const name = `${c.author?.first_name ?? ""} ${c.author?.last_name ?? ""}`.trim() || c.author?.username;
          return (
            <div key={c.id} className="flex gap-2">
              <UserAvatar url={c.author?.avatar_url} name={name} className="h-8 w-8" />
              <div className="flex-1 rounded-lg bg-card px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{name}</span>
                  {c.author_id === currentUserId && (
                    <button onClick={() => remove.mutate(c.id)} aria-label="Delete comment">
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

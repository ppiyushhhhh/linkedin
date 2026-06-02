import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Share2,
  Link2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "./UserAvatar";
import { PostComments } from "./PostComments";
import {
  createRepost,
  deletePost,
  toggleReaction,
  toggleSavePost,
  updatePost,
  type FeedPost,
  type OriginalPost,
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

export function PostCard({
  post,
  currentUserId,
  expandComments,
  hideOpenLink,
}: {
  post: FeedPost;
  currentUserId: string;
  expandComments?: boolean;
  hideOpenLink?: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(!!expandComments);
  const [showPicker, setShowPicker] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["post", post.id] });
    qc.invalidateQueries({ queryKey: ["saved-posts"] });
  };

  const react = useMutation({
    mutationFn: (type: (typeof REACTIONS)[number]["type"]) =>
      toggleReaction({ data: { post_id: post.id, type } }),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: () => toggleSavePost({ data: { post_id: post.id } }),
    onSuccess: (res) => {
      toast.success(res.saved ? "Post saved" : "Removed from saved");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const repost = useMutation({
    mutationFn: () => createRepost({ data: { original_post_id: post.id } }),
    onSuccess: () => {
      toast.success("Reposted to your feed");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deletePost({ data: { id: post.id } }),
    onSuccess: () => {
      toast.success("Post deleted");
      invalidate();
      if (expandComments) navigate({ to: "/feed" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isOwner = post.author_id === currentUserId;
  const author = post.author;
  const fullName =
    `${author?.first_name ?? ""} ${author?.last_name ?? ""}`.trim() ||
    author?.username ||
    "User";
  const currentReaction = REACTIONS.find((r) => r.type === post.my_reaction);
  const MainIcon = currentReaction?.Icon ?? ThumbsUp;

  const copyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Post link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const isRepost = !!post.repost_of;

  return (
    <article id={`post-${post.id}`} className="rounded-xl border bg-card shadow-sm">
      {isRepost && (
        <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5" />
          <Link
            to="/u/$username"
            params={{ username: author?.username ?? "" }}
            className="hover:underline"
          >
            {fullName}
          </Link>
          <span>reposted this</span>
        </div>
      )}

      <header className="flex items-start gap-3 px-4 pt-4">
        <Link to="/u/$username" params={{ username: author?.username ?? "" }}>
          <UserAvatar url={author?.avatar_url} name={fullName} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/u/$username"
            params={{ username: author?.username ?? "" }}
            className="block truncate font-semibold hover:underline"
          >
            {fullName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{author?.headline}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Post actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!hideOpenLink && (
              <DropdownMenuItem
                onClick={() => navigate({ to: "/post/$id", params: { id: post.id } })}
              >
                <Share2 className="mr-2 h-4 w-4" /> Open post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyLink}>
              <Link2 className="mr-2 h-4 w-4" /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => save.mutate()}>
              <Bookmark className="mr-2 h-4 w-4" />
              {post.is_saved ? "Unsave post" : "Save post"}
            </DropdownMenuItem>
            {isOwner && !isRepost && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit post
                </DropdownMenuItem>
              </>
            )}
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete post
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the post and all of its
                        comments and reactions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => del.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.content && (
        <BodyWrapper to={hideOpenLink ? null : post.id}>
          <div className="whitespace-pre-wrap px-4 py-3 text-sm">{post.content}</div>
        </BodyWrapper>
      )}

      {post.image_url && (
        <BodyWrapper to={hideOpenLink ? null : post.id}>
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="max-h-[480px] w-full object-cover"
          />
        </BodyWrapper>
      )}

      {post.repost_of && (
        <div className="mx-4 mb-3 mt-1">
          <RepostPreview original={post.repost_of} />
        </div>
      )}

      {(post.reactions.total > 0 ||
        post.comment_count > 0 ||
        post.repost_count > 0) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-muted-foreground">
          <span>
            {post.reactions.total > 0
              ? `${post.reactions.total} reaction${post.reactions.total === 1 ? "" : "s"}`
              : ""}
          </span>
          <div className="flex gap-3">
            {post.comment_count > 0 && (
              <button
                onClick={() => setShowComments((s) => !s)}
                className="hover:underline"
              >
                {post.comment_count} comment{post.comment_count === 1 ? "" : "s"}
              </button>
            )}
            {post.repost_count > 0 && (
              <span>
                {post.repost_count} repost{post.repost_count === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="border-t px-2 py-1">
        <div className="relative grid grid-cols-4">
          <div
            className="relative"
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => setShowPicker(false)}
          >
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-center gap-2",
                currentReaction?.color,
              )}
              onClick={() => react.mutate(currentReaction?.type ?? "like")}
            >
              <MainIcon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {currentReaction?.label ?? "Like"}
              </span>
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
                    className={cn(
                      "rounded-full p-1.5 transition-transform hover:scale-125",
                      color,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className="justify-center gap-2"
            onClick={() => {
              if (hideOpenLink) setShowComments((s) => !s);
              else navigate({ to: "/post/$id", params: { id: post.id } });
            }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Comment</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-center gap-2">
                <Repeat2 className="h-4 w-4" />
                <span className="hidden sm:inline">Repost</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem
                onClick={() => repost.mutate()}
                disabled={repost.isPending}
              >
                <Repeat2 className="mr-2 h-4 w-4" /> Repost
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRepostOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Repost with thoughts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}>
                <Link2 className="mr-2 h-4 w-4" /> Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            className={cn(
              "justify-center gap-2",
              post.is_saved && "text-primary",
            )}
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            <Bookmark
              className={cn("h-4 w-4", post.is_saved && "fill-current")}
            />
            <span className="hidden sm:inline">
              {post.is_saved ? "Saved" : "Save"}
            </span>
          </Button>
        </div>
      </div>

      {showComments && (
        <PostComments postId={post.id} currentUserId={currentUserId} />
      )}

      <EditPostDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        post={post}
        onSaved={invalidate}
      />
      <RepostThoughtsDialog
        open={repostOpen}
        onOpenChange={setRepostOpen}
        original={post.repost_of ?? {
          id: post.id,
          content: post.content,
          image_url: post.image_url,
          created_at: post.created_at,
          author_id: post.author_id,
          author: post.author,
        }}
        onDone={invalidate}
      />
    </article>
  );
}

function BodyWrapper({
  to,
  children,
}: {
  to: string | null;
  children: React.ReactNode;
}) {
  if (!to) return <>{children}</>;
  return (
    <Link
      to="/post/$id"
      params={{ id: to }}
      className="block hover:bg-muted/30"
    >
      {children}
    </Link>
  );
}

export function RepostPreview({ original }: { original: OriginalPost }) {
  const name =
    `${original.author?.first_name ?? ""} ${original.author?.last_name ?? ""}`.trim() ||
    original.author?.username ||
    "User";
  return (
    <Link
      to="/post/$id"
      params={{ id: original.id }}
      className="block overflow-hidden rounded-xl border bg-background transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3 p-3">
        <UserAvatar
          url={original.author?.avatar_url}
          name={name}
          className="h-9 w-9"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {original.author?.headline}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(original.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      {original.content && (
        <p className="line-clamp-4 whitespace-pre-wrap px-3 pb-2 text-sm">
          {original.content}
        </p>
      )}
      {original.image_url && (
        <img
          src={original.image_url}
          alt=""
          loading="lazy"
          className="max-h-72 w-full object-cover"
        />
      )}
    </Link>
  );
}

function EditPostDialog({
  open,
  onOpenChange,
  post,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  post: FeedPost;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(post.content);
  const update = useMutation({
    mutationFn: () =>
      updatePost({
        data: { id: post.id, content, image_url: post.image_url },
      }),
    onSuccess: () => {
      toast.success("Post updated");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={3000}
        />
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            className="max-h-48 w-full rounded-md object-cover"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => update.mutate()}
            disabled={!content.trim() || update.isPending}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepostThoughtsDialog({
  open,
  onOpenChange,
  original,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  original: OriginalPost;
  onDone: () => void;
}) {
  const [thoughts, setThoughts] = useState("");
  const send = useMutation({
    mutationFn: () =>
      createRepost({
        data: { original_post_id: original.id, thoughts: thoughts.trim() },
      }),
    onSuccess: () => {
      toast.success("Reposted to your feed");
      setThoughts("");
      onDone();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repost with your thoughts</DialogTitle>
        </DialogHeader>
        <Textarea
          value={thoughts}
          onChange={(e) => setThoughts(e.target.value)}
          rows={4}
          placeholder="Share your thoughts about this post…"
          maxLength={3000}
        />
        <div className="rounded-md border bg-muted/30 p-2">
          <RepostPreview original={original} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            Repost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

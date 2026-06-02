import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Home } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { getSavedPosts } from "@/lib/feed.functions";
import { PostCard } from "@/components/app/PostCard";
import { PostSkeleton } from "@/components/app/PostSkeleton";
import { BackButton } from "@/components/app/BackButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/saved-posts")({
  head: () => ({ meta: [{ title: "Saved posts — LinkUp World" }] }),
  component: SavedPostsPage,
});

function SavedPostsPage() {
  const { data: me } = useQuery({
    queryKey: ["me-profile"],
    queryFn: () => getMyProfile(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["saved-posts"],
    queryFn: () => getSavedPosts(),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <Button asChild variant="ghost" size="sm">
          <Link to="/feed">
            <Home className="mr-1 h-4 w-4" /> Home
          </Link>
        </Button>
      </div>

      <header className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Bookmark className="h-5 w-5 text-primary" /> Saved posts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Posts you've bookmarked for later. Only you can see this list.
        </p>
      </header>

      {isLoading && (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No saved posts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the bookmark icon on any post to save it for later.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/feed">Browse feed</Link>
          </Button>
        </div>
      )}

      {me &&
        (data ?? []).map((p) => (
          <div key={p.id} className="space-y-1">
            <p className="px-1 text-[11px] text-muted-foreground">
              Saved {new Date(p.saved_at).toLocaleDateString()}
            </p>
            <PostCard post={p} currentUserId={me.id} />
          </div>
        ))}
    </div>
  );
}

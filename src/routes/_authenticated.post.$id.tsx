import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Loader2 } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { getPostById, getRelatedPosts } from "@/lib/feed.functions";
import { PostCard } from "@/components/app/PostCard";
import { PostComments } from "@/components/app/PostComments";
import { PostSkeleton } from "@/components/app/PostSkeleton";
import { BackButton } from "@/components/app/BackButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/post/$id")({
  head: () => ({ meta: [{ title: "Post — LinkedIn" }] }),
  component: PostDetailPage,
});

function PostDetailPage() {
  const { id } = useParams({ from: "/_authenticated/post/$id" });
  const { data: me } = useQuery({
    queryKey: ["me-profile"],
    queryFn: () => getMyProfile(),
  });
  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["post", id],
    queryFn: () => getPostById({ data: { id } }),
  });
  const { data: related } = useQuery({
    queryKey: ["post-related", id],
    queryFn: () => getRelatedPosts({ data: { id } }),
    enabled: !!post,
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

      {isLoading && <PostSkeleton />}

      {isError && (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Something went wrong loading this post.
        </div>
      )}

      {!isLoading && !isError && !post && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="font-semibold">Post not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted or the link is incorrect.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/feed">Back to feed</Link>
          </Button>
        </div>
      )}

      {post && me && (
        <>
          <PostCard
            post={post}
            currentUserId={me.id}
            hideOpenLink
          />
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Comments
            </div>
            <PostComments postId={post.id} currentUserId={me.id} autoFocus />
          </section>

          {(related?.length ?? 0) > 0 && (
            <section className="space-y-2 pt-2">
              <h2 className="px-1 text-sm font-semibold text-muted-foreground">
                More from {post.author?.first_name || post.author?.username}
              </h2>
              {related!.map((p) => (
                <PostCard key={p.id} post={p} currentUserId={me.id} />
              ))}
            </section>
          )}
        </>
      )}

      {post && !me && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
    </div>
  );
}

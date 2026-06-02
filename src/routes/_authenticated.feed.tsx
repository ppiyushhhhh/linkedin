import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getFeed } from "@/lib/feed.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { getSuggestions } from "@/lib/network.functions";
import { PostComposer } from "@/components/app/PostComposer";
import { PostCard } from "@/components/app/PostCard";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — LinkUp World" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: suggestions } = useQuery({ queryKey: ["suggestions"], queryFn: () => getSuggestions() });

  const feed = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => getFeed({ data: { limit: 10, cursor: pageParam as string | null } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];
  const fullName = me ? `${me.first_name} ${me.last_name}`.trim() || me.username : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr_280px]">
      {/* Left sidebar */}
      <aside className="hidden lg:block">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="h-14 bg-gradient-to-r from-primary/40 to-primary/20" />
          <div className="-mt-8 flex flex-col items-center px-4 pb-4">
            <UserAvatar url={me?.avatar_url} name={fullName} className="h-16 w-16 border-4 border-card" />
            <Link to="/u/$username" params={{ username: me?.username ?? "" }} className="mt-2 font-semibold hover:underline">
              {fullName}
            </Link>
            <p className="text-center text-xs text-muted-foreground">{me?.headline}</p>
          </div>
          <div className="border-t px-4 py-3 text-xs">
            <Link to="/network" className="text-muted-foreground hover:text-primary">Manage your network</Link>
          </div>
        </div>
      </aside>

      {/* Main feed */}
      <main className="space-y-3">
        <PostComposer me={me ?? undefined} />
        {feed.isLoading && <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Loading feed…</div>}
        {!feed.isLoading && posts.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="font-semibold">Your feed is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Follow people or create your first post to get started.</p>
          </div>
        )}
        {me && posts.map((p) => <PostCard key={p.id} post={p} currentUserId={me.id} />)}
        {feed.hasNextPage && (
          <div className="text-center">
            <Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
              {feed.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </main>

      {/* Right sidebar */}
      <aside className="hidden lg:block">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold">People you may know</h3>
          <ul className="mt-3 space-y-3">
            {(suggestions ?? []).slice(0, 5).map((p: any) => {
              const n = `${p.first_name} ${p.last_name}`.trim() || p.username;
              return (
                <li key={p.id} className="flex items-start gap-2">
                  <UserAvatar url={p.avatar_url} name={n} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <Link to="/u/$username" params={{ username: p.username }} className="block truncate text-sm font-semibold hover:underline">{n}</Link>
                    <p className="truncate text-xs text-muted-foreground">{p.headline}</p>
                  </div>
                </li>
              );
            })}
            {(!suggestions || suggestions.length === 0) && <p className="text-xs text-muted-foreground">No suggestions yet.</p>}
          </ul>
          <Link to="/network" className="mt-3 block text-center text-xs text-primary hover:underline">See all</Link>
        </div>
      </aside>
    </div>
  );
}

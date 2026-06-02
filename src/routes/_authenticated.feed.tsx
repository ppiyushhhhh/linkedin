import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Briefcase, UserPlus, TrendingUp, Loader2 } from "lucide-react";
import { getFeed } from "@/lib/feed.functions";
import { getMyProfile, getMyStats, getMyLatestExperience } from "@/lib/profile.functions";
import { getSuggestions, sendConnectionRequest } from "@/lib/network.functions";
import { PostComposer } from "@/components/app/PostComposer";
import { PostCard } from "@/components/app/PostCard";
import { PostSkeleton } from "@/components/app/PostSkeleton";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — LinkedIn" }] }),
  component: FeedPage,
});

const TRENDING = [
  { tag: "#AIInnovation", meta: "12,540 posts" },
  { tag: "#RemoteWork", meta: "8,201 posts" },
  { tag: "#Hiring", meta: "5,690 posts" },
  { tag: "#ProductDesign", meta: "3,418 posts" },
  { tag: "#StartupLife", meta: "2,775 posts" },
];

function FeedPage() {
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: stats } = useQuery({ queryKey: ["me-stats"], queryFn: () => getMyStats() });
  const { data: latestExp } = useQuery({ queryKey: ["me-latest-exp"], queryFn: () => getMyLatestExperience() });
  const { data: suggestions } = useQuery({ queryKey: ["suggestions"], queryFn: () => getSuggestions() });

  const feed = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) =>
      getFeed({ data: { limit: 10, cursor: pageParam as string | null } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];
  const fullName = me ? `${me.first_name} ${me.last_name}`.trim() || me.username : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[260px_1fr_300px]">
      {/* Left sidebar */}
      <aside className="hidden lg:block">
        <ProfileCard
          me={me}
          stats={stats}
          latestExp={latestExp ?? null}
          fullName={fullName}
        />
      </aside>

      {/* Main feed */}
      <main className="space-y-3">
        <PostComposer me={me ?? undefined} />

        {feed.isLoading && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {!feed.isLoading && posts.length === 0 && (
          <div className="rounded-xl border bg-card p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold">Your feed is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect with people or create your first post to get started.
            </p>
            <Link to="/network" className="mt-4 inline-block">
              <Button size="sm">Find people to connect with</Button>
            </Link>
          </div>
        )}

        {me && posts.map((p) => <PostCard key={p.id} post={p} currentUserId={me.id} />)}

        {feed.hasNextPage && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
            >
              {feed.isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </>
              ) : (
                "Load more posts"
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Right sidebar */}
      <aside className="hidden lg:block space-y-4">
        <SuggestionsCard suggestions={suggestions ?? []} />
        <TrendingCard />
        <footer className="px-2 text-xs text-muted-foreground">
          <p>LinkedIn © {new Date().getFullYear()}</p>
        </footer>
      </aside>
    </div>
  );
}

function ProfileCard({
  me,
  stats,
  latestExp,
  fullName,
}: {
  me: any;
  stats: { followers: number; following: number; connections: number } | undefined;
  latestExp: { title: string; company: string } | null;
  fullName: string;
}) {
  if (!me) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="h-16 bg-muted" />
        <div className="space-y-2 p-4">
          <div className="h-16 w-16 -mt-12 rounded-full bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div
        className="h-16 bg-gradient-to-r from-primary/50 to-primary/20"
        style={
          me.cover_url
            ? { backgroundImage: `url(${me.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />
      <div className="flex flex-col items-center px-4 pb-4 -mt-8 text-center">
        <UserAvatar url={me.avatar_url} name={fullName} className="h-16 w-16 border-4 border-card" />
        <Link
          to="/u/$username"
          params={{ username: me.username }}
          className="mt-2 font-semibold hover:underline"
        >
          {fullName}
        </Link>
        <p className="text-xs text-muted-foreground">@{me.username}</p>
        {me.headline && (
          <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{me.headline}</p>
        )}
        {latestExp?.company && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            {latestExp.title} · {latestExp.company}
          </p>
        )}
        {me.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {me.location}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 border-t bg-muted/30 text-center text-xs">
        <div className="p-2">
          <div className="font-semibold text-foreground">{stats?.connections ?? 0}</div>
          <div className="text-muted-foreground">Connections</div>
        </div>
        <div className="border-l p-2">
          <div className="font-semibold text-foreground">{stats?.followers ?? 0}</div>
          <div className="text-muted-foreground">Followers</div>
        </div>
      </div>
      <div className="border-t p-3">
        <Link to="/u/$username" params={{ username: me.username }}>
          <Button variant="outline" size="sm" className="w-full">
            View profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SuggestionsCard({ suggestions }: { suggestions: any[] }) {
  const qc = useQueryClient();
  const connect = useMutation({
    mutationFn: (id: string) => sendConnectionRequest({ data: { addressee_id: id } }),
    onSuccess: () => {
      toast.success("Connection request sent");
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
    onError: (e: any) => toast.error(e.message || "Could not send request"),
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">People you may know</h3>
      <ul className="mt-3 space-y-3">
        {suggestions.slice(0, 5).map((p: any) => {
          const n = `${p.first_name} ${p.last_name}`.trim() || p.username;
          return (
            <li key={p.id} className="flex items-start gap-2">
              <Link to="/u/$username" params={{ username: p.username }}>
                <UserAvatar url={p.avatar_url} name={n} className="h-10 w-10" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to="/u/$username"
                  params={{ username: p.username }}
                  className="block truncate text-sm font-semibold hover:underline"
                >
                  {n}
                </Link>
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.headline}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 h-7 rounded-full px-3 text-xs"
                  disabled={connect.isPending && connect.variables === p.id}
                  onClick={() => connect.mutate(p.id)}
                >
                  <UserPlus className="mr-1 h-3 w-3" /> Connect
                </Button>
              </div>
            </li>
          );
        })}
        {suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">No suggestions yet.</p>
        )}
      </ul>
      <Link to="/network" className="mt-3 block text-center text-xs text-primary hover:underline">
        See all
      </Link>
    </div>
  );
}

function TrendingCard() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="h-4 w-4 text-primary" /> Trending topics
      </h3>
      <ul className="mt-3 space-y-2.5">
        {TRENDING.map((t) => (
          <li key={t.tag}>
            <Link
              to="/search"
              search={{ q: t.tag.replace("#", "") } as any}
              className="block rounded-md px-1 py-0.5 hover:bg-muted/60"
            >
              <div className="text-sm font-medium">{t.tag}</div>
              <div className="text-xs text-muted-foreground">{t.meta}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

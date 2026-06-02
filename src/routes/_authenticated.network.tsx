import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getMyConnections,
  getSuggestions,
  getFollowGraph,
  respondConnection,
  sendConnectionRequest,
  removeConnection,
  toggleFollow,
} from "@/lib/network.functions";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Check,
  X,
  UserPlus,
  UserMinus,
  Building2,
  MapPin,
  Users,
  Clock,
  UserCheck,
  Search as SearchIcon,
  Eye,
} from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { MessageButton } from "@/components/app/MessageButton";
import { PeopleYouMayKnow } from "@/components/app/PeopleYouMayKnow";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({ meta: [{ title: "My Network — LinkedIn" }] }),
  component: NetworkPage,
});

type Person = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  headline?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  company?: string | null;
  i_follow?: boolean;
};

const fullName = (p?: Person) => (p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.username : "");

function matchesQuery(p: Person | undefined, q: string) {
  if (!p) return false;
  if (!q) return true;
  const hay = `${fullName(p)} ${p.username} ${p.headline ?? ""} ${p.company ?? ""} ${p.location ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function NetworkPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const connsQ = useQuery({ queryKey: ["my-connections"], queryFn: () => getMyConnections() });
  const suggestionsQ = useQuery({ queryKey: ["suggestions"], queryFn: () => getSuggestions() });
  const followsQ = useQuery({ queryKey: ["follow-graph"], queryFn: () => getFollowGraph() });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["my-connections"] });
    qc.invalidateQueries({ queryKey: ["suggestions"] });
    qc.invalidateQueries({ queryKey: ["follow-graph"] });
  };

  const respond = useMutation({
    mutationFn: (v: { requester_id: string; accept: boolean }) => respondConnection({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.accept ? "Connection accepted" : "Request declined");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Something went wrong"),
  });
  const connect = useMutation({
    mutationFn: (id: string) => sendConnectionRequest({ data: { addressee_id: id } }),
    onSuccess: () => {
      toast.success("Connection request sent");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send request"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeConnection({ data: { other_id: id } }),
    onSuccess: () => {
      toast.success("Removed");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove"),
  });
  const follow = useMutation({
    mutationFn: (v: { profile_id: string; follow: boolean }) => toggleFollow({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.follow ? "Following" : "Unfollowed");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update follow"),
  });

  const incoming = connsQ.data?.incoming ?? [];
  const outgoing = connsQ.data?.outgoing ?? [];
  const accepted = connsQ.data?.accepted ?? [];
  const suggestions = (suggestionsQ.data ?? []) as Person[];
  const followers = followsQ.data?.followers ?? [];
  const following = followsQ.data?.following ?? [];

  const followingIds = useMemo(() => new Set(following.map((p: Person) => p.id)), [following]);

  const fIncoming = incoming.filter((c: any) => matchesQuery(c.other, query));
  const fOutgoing = outgoing.filter((c: any) => matchesQuery(c.other, query));
  const fAccepted = accepted.filter((c: any) => matchesQuery(c.other, query));
  const fSuggestions = suggestions.filter((p) => matchesQuery(p, query));
  const fFollowers = followers.filter((p: Person) => matchesQuery(p, query));
  const fFollowing = following.filter((p: Person) => matchesQuery(p, query));

  const loading = connsQ.isLoading || followsQ.isLoading;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <BackButton />
      </div>

      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Network</h1>
        <p className="text-sm text-muted-foreground">Manage your professional connections and discover new people.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Connections" value={accepted.length} loading={loading} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Pending" value={incoming.length + outgoing.length} loading={loading} />
        <SummaryCard icon={<UserCheck className="h-4 w-4" />} label="Followers" value={followers.length} loading={loading} />
        <SummaryCard icon={<UserPlus className="h-4 w-4" />} label="Following" value={following.length} loading={loading} />
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, username, headline, company or location"
          className="h-10 bg-card pl-9"
        />
      </div>

      <Tabs defaultValue="requests" className="mt-4">
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="requests">
            Requests{incoming.length ? ` (${incoming.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="connections">Connections ({accepted.length})</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="sent">Sent{outgoing.length ? ` (${outgoing.length})` : ""}</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        {/* Requests */}
        <TabsContent value="requests" className="mt-4 grid gap-3 sm:grid-cols-2">
          {loading ? <SkeletonGrid /> : fIncoming.length ? fIncoming.map((c: any) => (
            <PersonCard key={c.requester_id} person={c.other}
              actions={
                <>
                  <Button size="sm" className="flex-1" onClick={() => respond.mutate({ requester_id: c.requester_id, accept: true })} disabled={respond.isPending}>
                    <Check className="mr-1 h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => respond.mutate({ requester_id: c.requester_id, accept: false })} disabled={respond.isPending}>
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </>
              } />
          )) : <EmptyState colSpan msg="No connection requests yet" />}
        </TabsContent>

        {/* Connections */}
        <TabsContent value="connections" className="mt-4 grid gap-3 sm:grid-cols-2">
          {loading ? <SkeletonGrid /> : fAccepted.length ? fAccepted.map((c: any) => (
            <PersonCard key={`${c.requester_id}-${c.addressee_id}`} person={c.other}
              actions={
                <>
                  <MessageButton otherId={c.other.id} className="flex-1" />
                  <ConfirmRemove name={fullName(c.other)} onConfirm={() => remove.mutate(c.other.id)} />
                </>
              } />
          )) : <EmptyState colSpan msg="No connections yet" />}
        </TabsContent>

        {/* Suggestions */}
        <TabsContent value="suggestions" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suggestionsQ.isLoading ? <SkeletonGrid /> : fSuggestions.length ? fSuggestions.map((p) => (
            <PersonCard key={p.id} person={p}
              actions={
                <>
                  <Button size="sm" className="flex-1" onClick={() => connect.mutate(p.id)} disabled={connect.isPending}>
                    <UserPlus className="mr-1 h-4 w-4" /> Connect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={follow.isPending}
                    onClick={() => follow.mutate({ profile_id: p.id, follow: !followingIds.has(p.id) })}
                  >
                    {followingIds.has(p.id) ? "Unfollow" : "Follow"}
                  </Button>
                </>
              } />
          )) : <EmptyState colSpan msg="No suggestions available" />}
        </TabsContent>

        {/* Sent */}
        <TabsContent value="sent" className="mt-4 grid gap-3 sm:grid-cols-2">
          {loading ? <SkeletonGrid /> : fOutgoing.length ? fOutgoing.map((c: any) => (
            <PersonCard key={c.addressee_id} person={c.other} badge="Pending"
              actions={
                <Button size="sm" variant="outline" className="flex-1" onClick={() => remove.mutate(c.other.id)} disabled={remove.isPending}>
                  Cancel request
                </Button>
              } />
          )) : <EmptyState colSpan msg="No pending sent requests" />}
        </TabsContent>

        {/* Followers */}
        <TabsContent value="followers" className="mt-4 grid gap-3 sm:grid-cols-2">
          {followsQ.isLoading ? <SkeletonGrid /> : fFollowers.length ? fFollowers.map((p: Person) => (
            <PersonCard key={p.id} person={p}
              actions={
                p.i_follow ? (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => follow.mutate({ profile_id: p.id, follow: false })}>
                    Following
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1" onClick={() => follow.mutate({ profile_id: p.id, follow: true })}>
                    <UserPlus className="mr-1 h-4 w-4" /> Follow back
                  </Button>
                )
              } />
          )) : <EmptyState colSpan msg="No followers yet" />}
        </TabsContent>

        {/* Following */}
        <TabsContent value="following" className="mt-4 grid gap-3 sm:grid-cols-2">
          {followsQ.isLoading ? <SkeletonGrid /> : fFollowing.length ? fFollowing.map((p: Person) => (
            <PersonCard key={p.id} person={p}
              actions={
                <Button size="sm" variant="outline" className="flex-1" onClick={() => follow.mutate({ profile_id: p.id, follow: false })} disabled={follow.isPending}>
                  <UserMinus className="mr-1 h-4 w-4" /> Unfollow
                </Button>
              } />
          )) : <EmptyState colSpan msg="You are not following anyone yet" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: number; loading?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-1 text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-10" /> : value}</div>
    </div>
  );
}

function PersonCard({ person, actions, badge }: { person?: Person; actions: React.ReactNode; badge?: string }) {
  if (!person) return null;
  const name = fullName(person);
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <UserAvatar url={person.avatar_url ?? undefined} name={name} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to="/u/$username" params={{ username: person.username }} className="truncate font-semibold hover:underline">
              {name}
            </Link>
            {badge && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{badge}</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
          {person.headline && <p className="mt-1 line-clamp-2 text-sm">{person.headline}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {person.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{person.company}</span>}
            {person.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{person.location}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions}
        <Link to="/u/$username" params={{ username: person.username }} className="inline-flex">
          <Button size="sm" variant="ghost">
            <Eye className="mr-1 h-4 w-4" /> View
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ConfirmRemove({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex-1">
          <UserMinus className="mr-1 h-4 w-4" /> Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove connection?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <span className="font-medium">{name}</span> from your connections? They will not be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SkeletonGrid() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({ msg, colSpan }: { msg: string; colSpan?: boolean }) {
  return (
    <div className={`rounded-xl border border-dashed bg-card p-10 text-center ${colSpan ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}

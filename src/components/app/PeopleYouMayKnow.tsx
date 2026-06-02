import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Users,
  Building2,
  MapPin,
  Eye,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/app/UserAvatar";
import {
  getPeopleYouMayKnow,
  sendConnectionRequest,
  respondConnection,
  toggleFollow,
  type PeopleYouMayKnowItem,
} from "@/lib/network.functions";

type Variant = "sidebar" | "grid";

type Props = {
  variant?: Variant;
  limit?: number;
  title?: string;
  showSeeAll?: boolean;
  className?: string;
};

export function PeopleYouMayKnow({
  variant = "grid",
  limit = 12,
  title = "People you may know",
  showSeeAll = false,
  className,
}: Props) {
  const queryKey = ["people-you-may-know", limit] as const;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPeopleYouMayKnow({ data: { limit } }),
  });

  const people = data ?? [];

  if (variant === "sidebar") {
    return (
      <div className={`rounded-xl border bg-card p-4 shadow-sm ${className ?? ""}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          {showSeeAll && (
            <Link to="/network" className="text-xs text-primary hover:underline">
              See all
            </Link>
          )}
        </div>
        <ul className="mt-3 space-y-3">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <SidebarSkeleton key={i} />)}
          {!isLoading && people.length === 0 && (
            <p className="text-xs text-muted-foreground">No suggestions yet.</p>
          )}
          {!isLoading &&
            people.slice(0, 5).map((p) => (
              <PersonRowSidebar key={p.id} person={p} queryKey={queryKey} />
            ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        {!isLoading && people.length === 0 && (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center sm:col-span-2 lg:col-span-3">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No suggestions available right now.</p>
          </div>
        )}
        {!isLoading &&
          people.map((p) => <PersonCardGrid key={p.id} person={p} queryKey={queryKey} />)}
      </div>
    </div>
  );
}

// Horizontal scrolling variant for compact empty states
export function PeopleYouMayKnowStrip({ limit = 8 }: { limit?: number }) {
  const queryKey = ["people-you-may-know", limit] as const;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPeopleYouMayKnow({ data: { limit } }),
  });
  const people = data ?? [];

  if (!isLoading && people.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">People you may know</h3>
        <Link to="/network" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[220px] sm:min-w-0">
              <CardSkeleton />
            </div>
          ))}
        {!isLoading &&
          people.map((p) => (
            <div key={p.id} className="min-w-[220px] sm:min-w-0">
              <PersonCardGrid person={p} queryKey={queryKey} compact />
            </div>
          ))}
      </div>
    </div>
  );
}

function useActions(queryKey: readonly unknown[]) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["suggestions"] });
    qc.invalidateQueries({ queryKey: ["my-connections"] });
    qc.invalidateQueries({ queryKey: ["follow-graph"] });
  };

  const connect = useMutation({
    mutationFn: (id: string) => sendConnectionRequest({ data: { addressee_id: id } }),
    onSuccess: () => {
      toast.success("Connection request sent");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send request"),
  });

  const respond = useMutation({
    mutationFn: (v: { requester_id: string; accept: boolean }) =>
      respondConnection({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.accept ? "Connection accepted" : "Request declined");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Something went wrong"),
  });

  const follow = useMutation({
    mutationFn: (v: { profile_id: string; follow: boolean }) =>
      toggleFollow({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.follow ? "Following" : "Unfollowed");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update follow"),
  });

  return { connect, respond, follow };
}

function fullName(p: PeopleYouMayKnowItem) {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.username;
}

function PersonCardGrid({
  person,
  queryKey,
  compact,
}: {
  person: PeopleYouMayKnowItem;
  queryKey: readonly unknown[];
  compact?: boolean;
}) {
  const { connect, respond, follow } = useActions(queryKey);
  const name = fullName(person);
  const isIncoming = person.connection_status === "pending_in";

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Link to="/u/$username" params={{ username: person.username }}>
          <UserAvatar url={person.avatar_url} name={name} className="h-14 w-14" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/u/$username"
            params={{ username: person.username }}
            className="block truncate font-semibold hover:underline"
          >
            {name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
          {person.headline && (
            <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{person.headline}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {person.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {person.company}
              </span>
            )}
            {person.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {person.location}
              </span>
            )}
          </div>
          {person.mutual_count > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {person.mutual_count} mutual connection{person.mutual_count === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {!compact && person.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {person.skills.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">
              {s}
            </Badge>
          ))}
          {person.skills.length > 4 && (
            <Badge variant="outline" className="text-[10px]">
              +{person.skills.length - 4}
            </Badge>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {isIncoming ? (
          <>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => respond.mutate({ requester_id: person.id, accept: true })}
              disabled={respond.isPending}
            >
              <Check className="mr-1 h-4 w-4" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => respond.mutate({ requester_id: person.id, accept: false })}
              disabled={respond.isPending}
            >
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => connect.mutate(person.id)}
            disabled={connect.isPending}
          >
            <UserPlus className="mr-1 h-4 w-4" /> Connect
          </Button>
        )}
        <Button
          size="sm"
          variant={person.i_follow ? "secondary" : "outline"}
          onClick={() =>
            follow.mutate({ profile_id: person.id, follow: !person.i_follow })
          }
          disabled={follow.isPending}
        >
          {person.i_follow ? "Following" : "Follow"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/u/$username" params={{ username: person.username }}>
            <Eye className="mr-1 h-4 w-4" /> View
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PersonRowSidebar({
  person,
  queryKey,
}: {
  person: PeopleYouMayKnowItem;
  queryKey: readonly unknown[];
}) {
  const { connect, respond } = useActions(queryKey);
  const name = fullName(person);
  const isIncoming = person.connection_status === "pending_in";

  return (
    <li className="flex items-start gap-2">
      <Link to="/u/$username" params={{ username: person.username }}>
        <UserAvatar url={person.avatar_url} name={name} className="h-10 w-10" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to="/u/$username"
          params={{ username: person.username }}
          className="block truncate text-sm font-semibold hover:underline"
        >
          {name}
        </Link>
        {person.headline && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{person.headline}</p>
        )}
        {person.mutual_count > 0 && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {person.mutual_count} mutual
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {isIncoming ? (
            <>
              <Button
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => respond.mutate({ requester_id: person.id, accept: true })}
                disabled={respond.isPending}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => respond.mutate({ requester_id: person.id, accept: false })}
                disabled={respond.isPending}
              >
                Reject
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => connect.mutate(person.id)}
              disabled={connect.isPending}
            >
              <UserPlus className="mr-1 h-3 w-3" /> Connect
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function SidebarSkeleton() {
  return (
    <li className="flex items-start gap-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </li>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}

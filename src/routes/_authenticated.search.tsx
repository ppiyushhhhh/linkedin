import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Search as SearchIcon,
  X,
  Home,
  Filter,
  MapPin,
  Building2,
  Wrench,
  Users,
  Heart,
  MessageSquare,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserAvatar } from "@/components/app/UserAvatar";
import { BackButton } from "@/components/app/BackButton";
import { PeopleYouMayKnow } from "@/components/app/PeopleYouMayKnow";

import {
  searchAll,
  type SearchPerson,
  type SearchPost,
  type SearchProject,
  type SearchGroup,
} from "@/lib/search.functions";
import {
  sendConnectionRequest,
  toggleFollow,
} from "@/lib/network.functions";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Search — LinkedIn" }] }),
  component: SearchPage,
});

const RECENT_KEY = "linkup_recent_searches";

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  if (typeof window === "undefined") return;
  const prev = getRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
  const next = [q, ...prev].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
function clearRecent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_KEY);
}

function SearchPage() {
  const { q } = useSearch({ from: "/_authenticated/search" });
  const navigate = useNavigate();
  const [input, setInput] = useState(q ?? "");
  const [debounced, setDebounced] = useState(q ?? "");
  const [tab, setTab] = useState("all");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  useEffect(() => {
    setInput(q ?? "");
    setDebounced(q ?? "");
    if (q && q.trim()) {
      pushRecent(q.trim());
      setRecent(getRecent());
    }
  }, [q]);

  // Debounce input -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed === (q ?? "")) return;
      navigate({
        to: "/search",
        search: trimmed ? ({ q: trimmed } as any) : ({} as any),
        replace: true,
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching } = useQuery({
    queryKey: ["search-all", debounced],
    queryFn: () => searchAll({ data: { q: debounced } }),
    enabled: !!debounced,
    staleTime: 30_000,
  });

  // People filters
  const [pLocation, setPLocation] = useState("");
  const [pCompany, setPCompany] = useState("");
  const [pSkill, setPSkill] = useState("");
  const [pStatus, setPStatus] = useState<"all" | "accepted" | "none" | "pending">("all");
  const [pSort, setPSort] = useState<"relevant" | "skills">("relevant");

  // Post filters
  const [postFilter, setPostFilter] =
    useState<"latest" | "liked" | "commented" | "images" | "connections">("latest");

  const filteredPeople = useMemo(() => {
    let list = data?.people ?? [];
    if (pLocation)
      list = list.filter((p) =>
        (p.location ?? "").toLowerCase().includes(pLocation.toLowerCase()),
      );
    if (pCompany)
      list = list.filter((p) =>
        (p.company ?? "").toLowerCase().includes(pCompany.toLowerCase()),
      );
    if (pSkill)
      list = list.filter((p) =>
        p.skills.some((s) => s.toLowerCase().includes(pSkill.toLowerCase())),
      );
    if (pStatus !== "all") {
      list = list.filter((p) => {
        if (pStatus === "accepted") return p.connection_status === "accepted";
        if (pStatus === "pending")
          return p.connection_status === "pending_in" || p.connection_status === "pending_out";
        if (pStatus === "none") return p.connection_status === "none";
        return true;
      });
    }
    if (pSort === "skills")
      list = [...list].sort((a, b) => b.skills.length - a.skills.length);
    return list;
  }, [data?.people, pLocation, pCompany, pSkill, pStatus, pSort]);

  const filteredPosts = useMemo(() => {
    let list = [...(data?.posts ?? [])];
    if (postFilter === "liked")
      list.sort((a, b) => b.like_count - a.like_count);
    else if (postFilter === "commented")
      list.sort((a, b) => b.comment_count - a.comment_count);
    else if (postFilter === "images") list = list.filter((p) => p.image_url);
    else if (postFilter === "connections")
      list = list.filter((p) => p.from_connection);
    else
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    return list;
  }, [data?.posts, postFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    pushRecent(trimmed);
    setRecent(getRecent());
    navigate({ to: "/search", search: { q: trimmed } as any });
  };

  const counts = {
    people: data?.people.length ?? 0,
    posts: data?.posts.length ?? 0,
    projects: data?.projects.length ?? 0,
    companies: data?.companies.length ?? 0,
    locations: data?.locations.length ?? 0,
  };

  const totalCount =
    counts.people + counts.posts + counts.projects + counts.companies + counts.locations;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <BackButton />
        <Button asChild variant="ghost" size="sm">
          <Link to="/feed">
            <Home className="mr-1 h-4 w-4" /> Home
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h1 className="mb-3 text-lg font-semibold sm:text-xl">Search LinkedIn</h1>
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search people, posts, skills, companies, locations…"
            className="h-12 pl-10 pr-20 text-base"
            autoFocus
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput("")}
              className="absolute right-16 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2">
            Search
          </Button>
        </form>

        {!input && recent.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Recent searches</p>
              <button
                onClick={() => {
                  clearRecent();
                  setRecent([]);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setInput(r);
                    navigate({ to: "/search", search: { q: r } as any });
                  }}
                  className="rounded-full border bg-muted/50 px-3 py-1 text-xs hover:border-primary/40 hover:bg-muted"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!debounced && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="mb-3 text-base font-semibold">Suggested people</h2>
            <PeopleYouMayKnow variant="grid" limit={9} />
          </div>
        </div>
      )}


      {debounced && (
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <div className="sticky top-14 z-20 -mx-3 overflow-x-auto bg-background/95 px-3 py-2 backdrop-blur sm:mx-0 sm:px-0">
            <TabsList className="h-auto w-max">
              <TabsTrigger value="all">All {totalCount > 0 && <Badge variant="secondary" className="ml-1.5">{totalCount}</Badge>}</TabsTrigger>
              <TabsTrigger value="people">People {counts.people > 0 && <Badge variant="secondary" className="ml-1.5">{counts.people}</Badge>}</TabsTrigger>
              <TabsTrigger value="posts">Posts {counts.posts > 0 && <Badge variant="secondary" className="ml-1.5">{counts.posts}</Badge>}</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="companies">Companies {counts.companies > 0 && <Badge variant="secondary" className="ml-1.5">{counts.companies}</Badge>}</TabsTrigger>
              <TabsTrigger value="locations">Locations {counts.locations > 0 && <Badge variant="secondary" className="ml-1.5">{counts.locations}</Badge>}</TabsTrigger>
            </TabsList>
          </div>

          {isFetching && !data && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching for "{debounced}"…
            </div>
          )}

          <TabsContent value="all" className="mt-4 space-y-6">
            {counts.people > 0 && (
              <Section title="People" icon={Users} onMore={() => setTab("people")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredPeople.slice(0, 4).map((p) => (
                    <PersonCard key={p.id} person={p} />
                  ))}
                </div>
              </Section>
            )}
            {counts.posts > 0 && (
              <Section title="Posts" icon={MessageSquare} onMore={() => setTab("posts")}>
                <div className="space-y-3">
                  {filteredPosts.slice(0, 3).map((p) => (
                    <PostResult key={p.id} post={p} />
                  ))}
                </div>
              </Section>
            )}
            {counts.projects > 0 && (
              <Section title="Projects & Skills" icon={Wrench} onMore={() => setTab("skills")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data!.projects.slice(0, 4).map((pr) => (
                    <ProjectCard key={pr.id} project={pr} />
                  ))}
                </div>
              </Section>
            )}
            {counts.companies > 0 && (
              <Section title="Companies" icon={Building2} onMore={() => setTab("companies")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data!.companies.slice(0, 4).map((g) => (
                    <GroupCard key={g.key} group={g} type="company" setTab={setTab} />
                  ))}
                </div>
              </Section>
            )}
            {counts.locations > 0 && (
              <Section title="Locations" icon={MapPin} onMore={() => setTab("locations")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data!.locations.slice(0, 4).map((g) => (
                    <GroupCard key={g.key} group={g} type="location" setTab={setTab} />
                  ))}
                </div>
              </Section>
            )}
            {!isFetching && totalCount === 0 && <EmptyState query={debounced} />}
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            <PeopleFilters
              {...{
                pLocation, setPLocation, pCompany, setPCompany,
                pSkill, setPSkill, pStatus, setPStatus, pSort, setPSort,
              }}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredPeople.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
            {!isFetching && filteredPeople.length === 0 && <EmptyState query={debounced} />}
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {(["latest", "liked", "commented", "images", "connections"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={postFilter === f ? "default" : "outline"}
                  onClick={() => setPostFilter(f)}
                >
                  {f === "latest" ? "Latest" : f === "liked" ? "Most liked" : f === "commented" ? "Most commented" : f === "images" ? "With images" : "From connections"}
                </Button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredPosts.map((p) => (
                <PostResult key={p.id} post={p} />
              ))}
            </div>
            {!isFetching && filteredPosts.length === 0 && <EmptyState query={debounced} />}
          </TabsContent>

          <TabsContent value="skills" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              People & projects matching "<span className="font-medium text-foreground">{debounced}</span>"
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPeople
                .filter((p) =>
                  p.skills.some((s) => s.toLowerCase().includes(debounced.toLowerCase())) ||
                  (p.headline ?? "").toLowerCase().includes(debounced.toLowerCase()),
                )
                .map((p) => (
                  <PersonCard key={p.id} person={p} highlight={debounced} />
                ))}
            </div>
            {(data?.projects.length ?? 0) > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Projects</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data!.projects.map((pr) => (
                    <ProjectCard key={pr.id} project={pr} highlight={debounced} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="companies" className="mt-4 grid gap-3 sm:grid-cols-2">
            {(data?.companies ?? []).map((g) => (
              <GroupCard key={g.key} group={g} type="company" setTab={setTab} />
            ))}
            {!isFetching && counts.companies === 0 && <EmptyState query={debounced} />}
          </TabsContent>

          <TabsContent value="locations" className="mt-4 grid gap-3 sm:grid-cols-2">
            {(data?.locations ?? []).map((g) => (
              <GroupCard key={g.key} group={g} type="location" setTab={setTab} />
            ))}
            {!isFetching && counts.locations === 0 && <EmptyState query={debounced} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  onMore,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  onMore?: () => void;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </div>
        {onMore && (
          <Button variant="ghost" size="sm" onClick={onMore}>
            See all
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function PeopleFilters(props: any) {
  const {
    pLocation, setPLocation, pCompany, setPCompany,
    pSkill, setPSkill, pStatus, setPStatus, pSort, setPSort,
  } = props;

  const content = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Input placeholder="Location" value={pLocation} onChange={(e) => setPLocation(e.target.value)} />
      <Input placeholder="Company" value={pCompany} onChange={(e) => setPCompany(e.target.value)} />
      <Input placeholder="Skill" value={pSkill} onChange={(e) => setPSkill(e.target.value)} />
      <Select value={pStatus} onValueChange={setPStatus}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="accepted">Connected</SelectItem>
          <SelectItem value="none">Not connected</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>
      <Select value={pSort} onValueChange={setPSort}>
        <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="relevant">Most relevant</SelectItem>
          <SelectItem value="skills">Most skills</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <div className="hidden rounded-2xl border bg-card p-3 sm:block">{content}</div>
      <div className="sm:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader><SheetTitle>Filter people</SheetTitle></SheetHeader>
            <div className="mt-4">{content}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function PersonCard({ person, highlight }: { person: SearchPerson; highlight?: string }) {
  const qc = useQueryClient();
  const name = `${person.first_name} ${person.last_name}`.trim() || person.username;

  const connect = useMutation({
    mutationFn: () => sendConnectionRequest({ data: { addressee_id: person.id } }),
    onSuccess: () => {
      toast.success("Connection request sent");
      qc.invalidateQueries({ queryKey: ["search-all"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const follow = useMutation({
    mutationFn: () =>
      toggleFollow({ data: { profile_id: person.id, follow: !person.is_following } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["search-all"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30">
      <div className="flex gap-3">
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
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {person.headline}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {person.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {person.company}
              </span>
            )}
            {person.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {person.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {person.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {person.skills.slice(0, 5).map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className={
                highlight && s.toLowerCase().includes(highlight.toLowerCase())
                  ? "bg-primary/15 text-primary"
                  : ""
              }
            >
              {s}
            </Badge>
          ))}
          {person.skills.length > 5 && (
            <Badge variant="outline">+{person.skills.length - 5}</Badge>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {person.connection_status === "self" ? (
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/u/$username" params={{ username: person.username }}>
              View profile
            </Link>
          </Button>
        ) : (
          <>
            {person.connection_status === "none" && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => connect.mutate()}
                disabled={connect.isPending}
              >
                Connect
              </Button>
            )}
            {person.connection_status === "pending_out" && (
              <Button size="sm" variant="outline" className="flex-1" disabled>
                Pending
              </Button>
            )}
            {person.connection_status === "pending_in" && (
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link to="/network">Respond</Link>
              </Button>
            )}
            {person.connection_status === "accepted" && (
              <Button size="sm" variant="outline" className="flex-1" disabled>
                Connected
              </Button>
            )}
            <Button
              size="sm"
              variant={person.is_following ? "secondary" : "outline"}
              onClick={() => follow.mutate()}
              disabled={follow.isPending}
            >
              {person.is_following ? "Following" : "Follow"}
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/u/$username" params={{ username: person.username }}>
                View
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function PostResult({ post }: { post: SearchPost }) {
  const name =
    `${post.author.first_name} ${post.author.last_name}`.trim() || post.author.username;
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Link to="/u/$username" params={{ username: post.author.username }}>
          <UserAvatar url={post.author.avatar_url} name={name} className="h-10 w-10" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              to="/u/$username"
              params={{ username: post.author.username }}
              className="truncate font-semibold hover:underline"
            >
              {name}
            </Link>
            <span className="truncate text-xs text-muted-foreground">
              · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          {post.author.headline && (
            <p className="truncate text-xs text-muted-foreground">{post.author.headline}</p>
          )}
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">{post.content}</p>
          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              className="mt-2 max-h-64 w-full rounded-lg object-cover"
            />
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {post.like_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count}
            </span>
            <Button asChild size="sm" variant="ghost" className="ml-auto h-7">
              <Link to="/feed" hash={`post-${post.id}`}>
                Open post
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProjectCard({ project, highlight }: { project: SearchProject; highlight?: string }) {
  const name =
    `${project.profile.first_name} ${project.profile.last_name}`.trim() ||
    project.profile.username;
  return (
    <div className="flex flex-col rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <UserAvatar url={project.profile.avatar_url} name={name} className="h-7 w-7" />
        <Link
          to="/u/$username"
          params={{ username: project.profile.username }}
          className="truncate text-xs text-muted-foreground hover:underline"
        >
          {name}
        </Link>
      </div>
      <h4 className="mt-2 font-semibold">{project.title}</h4>
      {project.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
      )}
      {project.tech_stack.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tech_stack.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className={
                highlight && t.toLowerCase().includes(highlight.toLowerCase())
                  ? "bg-primary/15 text-primary"
                  : ""
              }
            >
              {t}
            </Badge>
          ))}
        </div>
      )}
      {(project.live_url || project.github_url) && (
        <div className="mt-3 flex gap-2">
          {project.live_url && (
            <Button asChild size="sm" variant="outline">
              <a href={project.live_url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Live
              </a>
            </Button>
          )}
          {project.github_url && (
            <Button asChild size="sm" variant="ghost">
              <a href={project.github_url} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  type,
  setTab,
}: {
  group: SearchGroup;
  type: "company" | "location";
  setTab: (t: string) => void;
}) {
  const Icon = type === "company" ? Building2 : MapPin;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h4 className="font-semibold">{group.key}</h4>
        </div>
        <Badge variant="secondary">{group.count}</Badge>
      </div>
      <div className="mt-3 flex -space-x-2">
        {group.people.slice(0, 5).map((p) => (
          <Link
            key={p.id}
            to="/u/$username"
            params={{ username: p.username }}
            title={`${p.first_name} ${p.last_name}`.trim() || p.username}
          >
            <UserAvatar
              url={p.avatar_url}
              name={`${p.first_name} ${p.last_name}`.trim() || p.username}
              className="h-8 w-8 ring-2 ring-card"
            />
          </Link>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        onClick={() => setTab("people")}
      >
        View people
      </Button>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center">
      <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">No results for "{query}"</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try a different keyword or check your spelling.
      </p>
    </div>
  );
}

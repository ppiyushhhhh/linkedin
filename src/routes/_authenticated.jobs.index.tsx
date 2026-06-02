import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Filter, Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { JobCard, formatSalary } from "@/components/app/JobCard";
import { JobsPageHeader } from "@/components/app/JobsPageHeader";
import { ApplyJobDialog } from "@/components/app/ApplyJobDialog";
import {
  listJobs,
  getMyJobsAndSavedIds,
  toggleSaveJob,
} from "@/lib/jobs.functions";
import { getMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({ meta: [{ title: "Jobs — LinkedIn" }] }),
  component: JobsPage,
});

const WORKPLACE = ["Remote", "On-site", "Hybrid"];
const TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Freelance"];
const LEVELS = ["Fresher", "Junior", "Mid-level", "Senior"];

function JobsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [workplace, setWorkplace] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [level, setLevel] = useState<string | undefined>();
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [postedDays, setPostedDays] = useState<string | undefined>();
  const [sort, setSort] = useState<"recent" | "salary_high">("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      location: location || undefined,
      workplace_type: workplace,
      job_type: type,
      experience_level: level,
      salary_min: salaryMin ? Number(salaryMin) : undefined,
      posted_within_days: postedDays ? Number(postedDays) : undefined,
      sort,
    }),
    [q, location, workplace, type, level, salaryMin, postedDays, sort],
  );

  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => listJobs({ data: filters }),
  });
  const { data: myState } = useQuery({
    queryKey: ["jobs-my-state"],
    queryFn: () => getMyJobsAndSavedIds(),
  });

  const savedSet = new Set(myState?.saved ?? []);
  const appliedSet = new Set(myState?.applied ?? []);

  const selected = useMemo(
    () => (jobs ?? []).find((j) => j.id === selectedId) ?? (jobs ?? [])[0] ?? null,
    [jobs, selectedId],
  );

  const saveMut = useMutation({
    mutationFn: (id: string) => toggleSaveJob({ data: { job_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs-my-state"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const clearFilters = () => {
    setLocation("");
    setWorkplace(undefined);
    setType(undefined);
    setLevel(undefined);
    setSalaryMin("");
    setPostedDays(undefined);
  };

  const filtersPanel = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Location</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Bangalore"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Workplace</label>
        <Select value={workplace ?? "any"} onValueChange={(v) => setWorkplace(v === "any" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {WORKPLACE.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Job type</label>
        <Select value={type ?? "any"} onValueChange={(v) => setType(v === "any" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {TYPES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Experience level</label>
        <Select value={level ?? "any"} onValueChange={(v) => setLevel(v === "any" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {LEVELS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Min salary</label>
        <Input
          type="number"
          inputMode="numeric"
          value={salaryMin}
          onChange={(e) => setSalaryMin(e.target.value)}
          placeholder="e.g. 50000"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Posted within</label>
        <Select value={postedDays ?? "any"} onValueChange={(v) => setPostedDays(v === "any" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Any time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any time</SelectItem>
            <SelectItem value="1">Past 24 hours</SelectItem>
            <SelectItem value="7">Past week</SelectItem>
            <SelectItem value="30">Past month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
        <X className="mr-1 h-4 w-4" /> Clear filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-3 py-4 sm:px-4">
      <JobsPageHeader />

      <header className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Briefcase className="h-5 w-5 text-primary" /> Jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find your next opportunity. Search, filter, save, and apply.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, company, skill, location"
              className="pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="salary_high">Salary: high to low</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Filter className="mr-1 h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-4">{filtersPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_360px]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Filters</h2>
            {filtersPanel}
          </div>
        </aside>

        <section className="space-y-2">
          {isLoading && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </>
          )}
          {!isLoading && (jobs?.length ?? 0) === 0 && (
            <div className="rounded-xl border bg-card p-10 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No jobs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search.
              </p>
            </div>
          )}
          {(jobs ?? []).map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={selected?.id === job.id}
              saved={savedSet.has(job.id)}
              applied={appliedSet.has(job.id)}
              onSelect={() => setSelectedId(job.id)}
              onToggleSave={() => saveMut.mutate(job.id)}
            />
          ))}
        </section>

        <aside className="hidden lg:block">
          {selected ? (
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <p className="text-sm text-muted-foreground">{selected.company_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.location} · {selected.workplace_type} · {selected.job_type} · {selected.experience_level}
              </p>
              {formatSalary(selected.salary_min, selected.salary_max, selected.currency) && (
                <p className="mt-2 text-sm font-medium">
                  {formatSalary(selected.salary_min, selected.salary_max, selected.currency)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {(selected.skills ?? []).map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                ))}
              </div>
              <p className="mt-3 line-clamp-[10] whitespace-pre-wrap text-sm text-foreground">
                {selected.description}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild>
                  <Link to="/jobs/$id" params={{ id: selected.id }}>View full details</Link>
                </Button>
                {!appliedSet.has(selected.id) ? (
                  <Button variant="outline" onClick={() => { setSelectedId(selected.id); setApplyOpen(true); }}>
                    Apply now
                  </Button>
                ) : (
                  <Badge variant="outline" className="self-start border-primary/40 text-primary">Applied</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="sticky top-20 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Select a job to preview details.
            </div>
          )}
        </aside>
      </div>

      {selected && (
        <ApplyJobDialog
          jobId={selected.id}
          jobTitle={selected.title}
          open={applyOpen}
          onOpenChange={setApplyOpen}
          me={me}
        />
      )}
    </div>
  );
}

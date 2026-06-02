import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/app/JobCard";
import { JobsPageHeader } from "@/components/app/JobsPageHeader";
import { getSavedJobs, toggleSaveJob, getMyJobsAndSavedIds } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/saved-jobs")({
  head: () => ({ meta: [{ title: "Saved jobs — LinkedIn" }] }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["saved-jobs"], queryFn: () => getSavedJobs() });
  const { data: myState } = useQuery({ queryKey: ["jobs-my-state"], queryFn: () => getMyJobsAndSavedIds() });
  const applied = new Set(myState?.applied ?? []);
  const saveMut = useMutation({
    mutationFn: (id: string) => toggleSaveJob({ data: { job_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-my-state"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4">
      <JobsPageHeader />
      <header className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Bookmark className="h-5 w-5 text-primary" /> Saved jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Jobs you've bookmarked for later.</p>
      </header>

      {isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No saved jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Save any job to come back to it later.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {(data ?? []).map((j: any) => (
          <JobCard
            key={j.id}
            job={j}
            saved
            applied={applied.has(j.id)}
            onToggleSave={() => saveMut.mutate(j.id)}
          />
        ))}
      </div>
    </div>
  );
}

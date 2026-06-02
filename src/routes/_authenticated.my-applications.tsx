import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JobsPageHeader } from "@/components/app/JobsPageHeader";
import { getMyApplications } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/my-applications")({
  head: () => ({ meta: [{ title: "My applications — LinkedIn" }] }),
  component: MyApplicationsPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  submitted: "outline",
  viewed: "secondary",
  shortlisted: "default",
  accepted: "default",
  rejected: "destructive",
};

function MyApplicationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => getMyApplications(),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4">
      <JobsPageHeader />
      <header className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-primary" /> My applications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Track the status of jobs you've applied to.</p>
      </header>

      {isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No applications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Find roles you love and apply.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {(data ?? []).map((a: any) => (
          <li key={a.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {a.job ? (
                  <Link to="/jobs/$id" params={{ id: a.job_id }} className="font-semibold hover:text-primary">
                    {a.job.title}
                  </Link>
                ) : (
                  <p className="font-semibold">Job removed</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {a.job?.company_name} {a.job?.location ? ` · ${a.job.location}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Applied {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[a.status] ?? "outline"} className="capitalize">{a.status}</Badge>
            </div>
            {a.job && (
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link to="/jobs/$id" params={{ id: a.job_id }}>Open job</Link>
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

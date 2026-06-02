import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark, BookmarkCheck, Briefcase, Building2, MapPin, Share2,
  Trash2, Pencil, Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { JobsPageHeader } from "@/components/app/JobsPageHeader";
import { ApplyJobDialog } from "@/components/app/ApplyJobDialog";
import { UserAvatar } from "@/components/app/UserAvatar";
import { formatSalary } from "@/components/app/JobCard";
import {
  getJobById, getSimilarJobs, toggleSaveJob, deleteJob,
  getMyJobsAndSavedIds, getApplicationsForMyJob,
} from "@/lib/jobs.functions";
import { getMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  head: () => ({ meta: [{ title: "Job details — LinkedIn" }] }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobById({ data: { id } }),
  });
  const { data: similar } = useQuery({
    queryKey: ["job-similar", id],
    queryFn: () => getSimilarJobs({ data: { id } }),
  });
  const { data: myState } = useQuery({
    queryKey: ["jobs-my-state"],
    queryFn: () => getMyJobsAndSavedIds(),
  });
  const isOwner = !!me && !!job && job.posted_by === me.id;
  const { data: apps } = useQuery({
    queryKey: ["job-applications", id],
    queryFn: () => getApplicationsForMyJob({ data: { job_id: id } }),
    enabled: isOwner,
  });

  const saved = !!myState?.saved.includes(id);
  const applied = !!myState?.applied.includes(id);

  const saveMut = useMutation({
    mutationFn: () => toggleSaveJob({ data: { job_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs-my-state"] }),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteJob({ data: { id } }),
    onSuccess: () => {
      toast.success("Job deleted");
      navigate({ to: "/jobs" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const share = async () => {
    const url = `${window.location.origin}/jobs/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: job?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 px-3 py-4">
        <JobsPageHeader />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 px-3 py-4">
        <JobsPageHeader />
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          Job not found.
        </div>
      </div>
    );
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-3 py-4 sm:px-4">
      <JobsPageHeader />

      <article className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt={job.company_name} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            <p className="text-sm text-muted-foreground">{job.company_name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {job.location && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
              )}
              <span>·</span><span>{job.workplace_type}</span>
              <span>·</span><span>{job.job_type}</span>
              <span>·</span><span>{job.experience_level}</span>
            </p>
            {salary && <p className="mt-1 text-sm font-medium">{salary}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Posted {new Date(job.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {applied ? (
            <Badge variant="outline" className="border-primary/40 text-primary">Applied</Badge>
          ) : (
            <Button onClick={() => setApplyOpen(true)}>Apply</Button>
          )}
          <Button variant="outline" onClick={() => saveMut.mutate()}>
            {saved ? <><BookmarkCheck className="mr-1 h-4 w-4" />Saved</> : <><Bookmark className="mr-1 h-4 w-4" />Save</>}
          </Button>
          <Button variant="outline" onClick={share}><Share2 className="mr-1 h-4 w-4" />Share</Button>
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive"><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone. Applications will also be removed.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {(job.skills?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {(job.skills ?? []).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        <Section title="About the role" text={job.description} />
        {job.responsibilities && <Section title="Responsibilities" text={job.responsibilities} />}
        {job.requirements && <Section title="Requirements" text={job.requirements} />}

        {job.poster && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-semibold">Posted by</h3>
            <Link
              to="/u/$username"
              params={{ username: job.poster.username }}
              className="mt-2 flex items-center gap-3 rounded-md p-2 hover:bg-muted"
            >
              <UserAvatar url={job.poster.avatar_url} name={`${job.poster.first_name} ${job.poster.last_name}`} className="h-10 w-10" />
              <div>
                <p className="text-sm font-medium">{job.poster.first_name} {job.poster.last_name}</p>
                <p className="text-xs text-muted-foreground">{job.poster.headline}</p>
              </div>
            </Link>
          </div>
        )}
      </article>

      {isOwner && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UsersIcon className="h-4 w-4" /> Applications ({apps?.length ?? 0})
          </h2>
          {(apps?.length ?? 0) === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {apps!.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-md border p-3">
                  <UserAvatar url={a.applicant?.avatar_url} name={`${a.applicant?.first_name ?? ""} ${a.applicant?.last_name ?? ""}`} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    {a.applicant && (
                      <Link to="/u/$username" params={{ username: a.applicant.username }} className="font-medium hover:text-primary">
                        {a.applicant.first_name} {a.applicant.last_name}
                      </Link>
                    )}
                    <p className="text-xs text-muted-foreground">{a.applicant?.headline}</p>
                    {a.cover_note && <p className="mt-1 text-sm">{a.cover_note}</p>}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {a.resume_url && <a className="text-primary underline" href={a.resume_url} target="_blank" rel="noreferrer">Resume</a>}
                      {a.portfolio_url && <a className="text-primary underline" href={a.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()} · <Badge variant="outline">{a.status}</Badge>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(similar?.length ?? 0) > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Briefcase className="h-4 w-4" /> Similar jobs
          </h2>
          <ul className="mt-2 divide-y">
            {similar!.map((s: any) => (
              <li key={s.id}>
                <Link to="/jobs/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.company_name} · {s.location} · {s.job_type}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ApplyJobDialog jobId={job.id} jobTitle={job.title} open={applyOpen} onOpenChange={setApplyOpen} me={me} />
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{text}</p>
    </div>
  );
}

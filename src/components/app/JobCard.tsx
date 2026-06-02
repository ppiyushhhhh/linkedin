import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type JobRow = {
  id: string;
  title: string;
  company_name: string;
  company_logo_url?: string | null;
  location: string;
  workplace_type: string;
  job_type: string;
  experience_level: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  description: string;
  skills?: string[] | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function formatSalary(min?: number | null, max?: number | null, ccy?: string | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
  const c = ccy ?? "INR";
  if (min && max) return `${c} ${fmt(min)}–${fmt(max)}`;
  return `${c} ${fmt((min ?? max)!)}`;
}

export function JobCard({
  job,
  selected,
  saved,
  applied,
  onSelect,
  onToggleSave,
}: {
  job: JobRow;
  selected?: boolean;
  saved?: boolean;
  applied?: boolean;
  onSelect?: () => void;
  onToggleSave?: () => void;
}) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${
        selected ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
      }`}
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {job.company_logo_url ? (
            <img src={job.company_logo_url} alt={job.company_name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onSelect}
            className="block w-full text-left"
          >
            <h3 className="truncate text-base font-semibold text-foreground hover:text-primary">
              {job.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{job.company_name}</p>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
            <span>·</span>
            <span>{job.workplace_type}</span>
            <span>·</span>
            <span>{job.job_type}</span>
            {salary && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground">{salary}</span>
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(job.skills ?? []).slice(0, 4).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? "Unsave" : "Save"}
          className="self-start rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
        >
          {saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
        </span>
        <div className="flex items-center gap-2">
          {applied && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Applied
            </Badge>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to="/jobs/$id" params={{ id: job.id }}>
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

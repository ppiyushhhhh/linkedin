import { Link } from "@tanstack/react-router";
import { Bookmark, Briefcase, FileText, Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "./BackButton";

export function JobsPageHeader({ title }: { title?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <BackButton />
        <Button asChild variant="ghost" size="sm">
          <Link to="/feed">
            <Home className="mr-1 h-4 w-4" /> Home
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/jobs">
            <Briefcase className="mr-1 h-4 w-4" /> Jobs
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/saved-jobs">
            <Bookmark className="mr-1 h-4 w-4" /> Saved
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/my-applications">
            <FileText className="mr-1 h-4 w-4" /> Applications
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/post-job">
            <Plus className="mr-1 h-4 w-4" /> Post job
          </Link>
        </Button>
      </div>
      {title && <h1 className="sr-only">{title}</h1>}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyToJob } from "@/lib/jobs.functions";

export function ApplyJobDialog({
  jobId,
  jobTitle,
  open,
  onOpenChange,
  me,
}: {
  jobId: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  me: { first_name?: string; last_name?: string; headline?: string; portfolio_url?: string | null } | null | undefined;
}) {
  const qc = useQueryClient();
  const [coverNote, setCoverNote] = useState("");
  const [resume, setResume] = useState("");
  const [portfolio, setPortfolio] = useState(me?.portfolio_url ?? "");

  const mut = useMutation({
    mutationFn: () =>
      applyToJob({
        data: {
          job_id: jobId,
          cover_note: coverNote.trim() || undefined,
          resume_url: resume.trim() || undefined,
          portfolio_url: portfolio.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Application submitted");
      qc.invalidateQueries({ queryKey: ["jobs-my-state"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to apply"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}</DialogTitle>
          <DialogDescription>
            Your name and profile will be shared with the employer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {me && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {(me.first_name ?? "") + " " + (me.last_name ?? "")}
              </p>
              {me.headline && <p className="text-xs text-muted-foreground">{me.headline}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="cover">Cover note</Label>
            <Textarea
              id="cover"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Tell the employer why you're a great fit..."
              maxLength={5000}
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="resume">Resume URL</Label>
            <Input
              id="resume"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
          <div>
            <Label htmlFor="portfolio">Portfolio / GitHub / LinkedIn</Label>
            <Input
              id="portfolio"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Submitting..." : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

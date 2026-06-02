import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { JobsPageHeader } from "@/components/app/JobsPageHeader";
import { createJob } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/post-job")({
  head: () => ({ meta: [{ title: "Post a job — LinkedIn" }] }),
  component: PostJobPage,
});

function PostJobPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", company_name: "", company_logo_url: "", location: "",
    workplace_type: "On-site", job_type: "Full-time", experience_level: "Mid-level",
    salary_min: "", salary_max: "", currency: "INR",
    description: "", responsibilities: "", requirements: "",
    application_email: "", external_apply_link: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || skills.includes(s) || skills.length >= 30) return;
    setSkills([...skills, s]);
    setSkillInput("");
  };

  const mut = useMutation({
    mutationFn: () =>
      createJob({
        data: {
          title: form.title,
          company_name: form.company_name,
          company_logo_url: form.company_logo_url || undefined,
          location: form.location,
          workplace_type: form.workplace_type as any,
          job_type: form.job_type as any,
          experience_level: form.experience_level as any,
          salary_min: form.salary_min ? Number(form.salary_min) : undefined,
          salary_max: form.salary_max ? Number(form.salary_max) : undefined,
          currency: form.currency,
          description: form.description,
          responsibilities: form.responsibilities || undefined,
          requirements: form.requirements || undefined,
          skills,
          application_email: form.application_email || undefined,
          external_apply_link: form.external_apply_link || undefined,
        },
      }),
    onSuccess: ({ id }) => {
      toast.success("Job posted");
      navigate({ to: "/jobs/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to post"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company_name.trim() || form.description.trim().length < 10) {
      toast.error("Title, company, and a description (10+ chars) are required.");
      return;
    }
    mut.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4">
      <JobsPageHeader />
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <header>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-5 w-5 text-primary" /> Post a job
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Reach professionals in your network and beyond.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Job title *">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={150} required />
          </Field>
          <Field label="Company name *">
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} maxLength={150} required />
          </Field>
          <Field label="Company logo URL">
            <Input value={form.company_logo_url} onChange={(e) => set("company_logo_url", e.target.value)} type="url" placeholder="https://..." />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City, country" />
          </Field>
          <Field label="Workplace type">
            <Select value={form.workplace_type} onValueChange={(v) => set("workplace_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Remote", "On-site", "Hybrid"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Job type">
            <Select value={form.job_type} onValueChange={(v) => set("job_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Full-time", "Part-time", "Internship", "Contract", "Freelance"].map((x) =>
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Experience level">
            <Select value={form.experience_level} onValueChange={(v) => set("experience_level", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Fresher", "Junior", "Mid-level", "Senior"].map((x) =>
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} maxLength={8} />
          </Field>
          <Field label="Salary min">
            <Input type="number" inputMode="numeric" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} />
          </Field>
          <Field label="Salary max">
            <Input type="number" inputMode="numeric" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} />
          </Field>
        </div>

        <Field label="Description *">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} maxLength={10000} required />
        </Field>
        <Field label="Responsibilities">
          <Textarea value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} rows={4} maxLength={10000} />
        </Field>
        <Field label="Requirements">
          <Textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} rows={4} maxLength={10000} />
        </Field>

        <div>
          <Label>Skills</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Add a skill and press Enter"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            />
            <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Application email">
            <Input type="email" value={form.application_email} onChange={(e) => set("application_email", e.target.value)} />
          </Field>
          <Field label="External apply link">
            <Input type="url" value={form.external_apply_link} onChange={(e) => set("external_apply_link", e.target.value)} placeholder="https://..." />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/jobs" })}>Cancel</Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending ? "Posting..." : "Post job"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

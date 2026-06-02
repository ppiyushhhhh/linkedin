import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Download, Save, RotateCcw, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/app/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES, type TemplateId } from "@/components/resume/ResumeTemplates";
import { getMyResumeData, getMyLatestDraft, saveResumeDraft, type ResumeData } from "@/lib/resume.functions";

export const Route = createFileRoute("/_authenticated/resume-builder")({
  head: () => ({ meta: [{ title: "Resume Builder — LinkedIn" }, { name: "description", content: "Generate a professional resume PDF from your profile." }] }),
  component: ResumeBuilderPage,
});

function ResumeBuilderPage() {
  const { data: profileData, isLoading } = useQuery({ queryKey: ["resume-data"], queryFn: () => getMyResumeData() });
  const { data: draft } = useQuery({ queryKey: ["resume-draft"], queryFn: () => getMyLatestDraft() });

  const [template, setTemplate] = useState<TemplateId>("modern");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize from profile or saved draft
  useEffect(() => {
    if (!profileData) return;
    if (draft?.resume_data) {
      setResume({ ...profileData, ...draft.resume_data });
      setTemplate((draft.template_name as TemplateId) ?? "modern");
      setDraftId(draft.id);
    } else {
      setResume(profileData);
    }
  }, [profileData, draft]);

  const Template = useMemo(() => TEMPLATES.find((t) => t.id === template)?.Component ?? TEMPLATES[0].Component, [template]);

  const save = useMutation({
    mutationFn: async () => {
      if (!resume) return;
      const res = await saveResumeDraft({
        data: {
          id: draftId ?? undefined,
          template_name: template,
          title: resume.headline,
          summary: resume.about,
          resume_data: resume,
        },
      });
      return res;
    },
    onSuccess: (r) => {
      if (r?.id) setDraftId(r.id);
      toast.success("Resume draft saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const resetFromProfile = () => {
    if (profileData) {
      setResume(profileData);
      toast.success("Reset from profile data");
    }
  };

  const downloadPdf = async () => {
    if (!previewRef.current || !resume) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const node = previewRef.current;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const safe = (resume.full_name || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      pdf.save(`${safe}-resume.pdf`);
      toast.success("Resume downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !resume) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-4">
        <div className="flex items-center justify-between"><BackButton /></div>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
      </div>
    );
  }

  const suggestions: string[] = [];
  if (!resume.about) suggestions.push("Add About section");
  if (resume.experiences.length === 0) suggestions.push("Add Experience");
  if (resume.educations.length === 0) suggestions.push("Add Education");
  if (resume.skills.length === 0) suggestions.push("Add Skills");
  if (resume.projects.length === 0) suggestions.push("Add Projects");
  if (resume.certifications.length === 0) suggestions.push("Add Certifications");

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <Link to="/feed" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="h-6 w-6 text-primary" /> Resume Builder</h1>
          <p className="text-sm text-muted-foreground">Generate a clean, ATS-friendly PDF from your profile.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetFromProfile}><RotateCcw className="mr-1 h-4 w-4" /> Reset from profile</Button>
          <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-1 h-4 w-4" /> {save.isPending ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {downloading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Make your resume stronger:</p>
          <ul className="ml-5 list-disc">{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
      )}

      <Card className="p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`rounded-md border px-3 py-2 text-sm transition ${template === t.id ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Mobile: tabs. Desktop: split */}
      <div className="md:hidden">
        <Tabs defaultValue="edit">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="download">Download</TabsTrigger>
          </TabsList>
          <TabsContent value="edit"><Editor resume={resume} setResume={setResume} /></TabsContent>
          <TabsContent value="preview"><PreviewWrap previewRef={previewRef}><Template data={resume} /></PreviewWrap></TabsContent>
          <TabsContent value="download" className="space-y-3 p-2 text-center">
            <p className="text-sm text-muted-foreground">Generate and download your resume as a PDF.</p>
            <Button onClick={downloadPdf} disabled={downloading} className="w-full">
              {downloading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
              Download PDF
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Editor resume={resume} setResume={setResume} />
        <PreviewWrap previewRef={previewRef}><Template data={resume} /></PreviewWrap>
      </div>
    </div>
  );
}

function PreviewWrap({ previewRef, children }: { previewRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  return (
    <div className="overflow-auto rounded-xl border bg-muted/40 p-3 shadow-sm">
      <div
        ref={previewRef}
        className="mx-auto bg-white p-8 shadow-md"
        style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
      >
        {children}
      </div>
    </div>
  );
}

function Editor({ resume, setResume }: { resume: ResumeData; setResume: (r: ResumeData) => void }) {
  const update = (patch: Partial<ResumeData>) => setResume({ ...resume, ...patch });

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <Section title="Basic info">
        <Field label="Full name" v={resume.full_name} onChange={(v) => update({ full_name: v })} />
        <Field label="Headline / title" v={resume.headline} onChange={(v) => update({ headline: v })} />
        <Field label="Location" v={resume.location} onChange={(v) => update({ location: v })} />
        <Field label="Email" v={resume.email} onChange={(v) => update({ email: v })} />
      </Section>

      <Section title="Links">
        <Field label="Website" v={resume.website} onChange={(v) => update({ website: v })} />
        <Field label="LinkedIn" v={resume.linkedin_url} onChange={(v) => update({ linkedin_url: v })} />
        <Field label="GitHub" v={resume.github_url} onChange={(v) => update({ github_url: v })} />
        <Field label="Portfolio" v={resume.portfolio_url} onChange={(v) => update({ portfolio_url: v })} />
      </Section>

      <Section title="Professional summary">
        <Textarea rows={5} value={resume.about} onChange={(e) => update({ about: e.target.value })} placeholder="Brief professional summary…" />
      </Section>

      <Section title="Experience">
        {resume.experiences.map((e, i) => (
          <div key={i} className="space-y-2 rounded-md border p-2">
            <div className="flex gap-2">
              <Input value={e.title} onChange={(ev) => updateArr("experiences", i, { title: ev.target.value })} placeholder="Title" />
              <Input value={e.company} onChange={(ev) => updateArr("experiences", i, { company: ev.target.value })} placeholder="Company" />
              <Button variant="ghost" size="icon" onClick={() => removeArr("experiences", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <Textarea rows={3} value={e.description ?? ""} onChange={(ev) => updateArr("experiences", i, { description: ev.target.value })} placeholder="Description (one bullet per line)" />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addArr("experiences", { title: "", company: "" })}><Plus className="mr-1 h-4 w-4" />Add experience</Button>
      </Section>

      <Section title="Projects">
        {resume.projects.map((p, i) => (
          <div key={i} className="space-y-2 rounded-md border p-2">
            <div className="flex gap-2">
              <Input value={p.title} onChange={(ev) => updateArr("projects", i, { title: ev.target.value })} placeholder="Title" />
              <Button variant="ghost" size="icon" onClick={() => removeArr("projects", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <Textarea rows={2} value={p.description ?? ""} onChange={(ev) => updateArr("projects", i, { description: ev.target.value })} placeholder="Description" />
            <Input value={(p.tech_stack ?? []).join(", ")} onChange={(ev) => updateArr("projects", i, { tech_stack: ev.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Tech stack (comma separated)" />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addArr("projects", { title: "" })}><Plus className="mr-1 h-4 w-4" />Add project</Button>
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-1.5">
          {resume.skills.map((s, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {s.name}
              <button onClick={() => removeArr("skills", i)} className="ml-1 text-destructive">×</button>
            </Badge>
          ))}
        </div>
        <SkillAdder onAdd={(name) => addArr("skills", { name })} />
      </Section>

      <Section title="Education">
        {resume.educations.map((ed, i) => (
          <div key={i} className="space-y-2 rounded-md border p-2">
            <div className="flex gap-2">
              <Input value={ed.school} onChange={(ev) => updateArr("educations", i, { school: ev.target.value })} placeholder="School" />
              <Button variant="ghost" size="icon" onClick={() => removeArr("educations", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <div className="flex gap-2">
              <Input value={ed.degree ?? ""} onChange={(ev) => updateArr("educations", i, { degree: ev.target.value })} placeholder="Degree" />
              <Input value={ed.field ?? ""} onChange={(ev) => updateArr("educations", i, { field: ev.target.value })} placeholder="Field" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addArr("educations", { school: "" })}><Plus className="mr-1 h-4 w-4" />Add education</Button>
      </Section>

      <Section title="Certifications">
        {resume.certifications.map((c, i) => (
          <div key={i} className="flex gap-2 rounded-md border p-2">
            <Input value={c.name} onChange={(ev) => updateArr("certifications", i, { name: ev.target.value })} placeholder="Name" />
            <Input value={c.issuer ?? ""} onChange={(ev) => updateArr("certifications", i, { issuer: ev.target.value })} placeholder="Issuer" />
            <Button variant="ghost" size="icon" onClick={() => removeArr("certifications", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addArr("certifications", { name: "" })}><Plus className="mr-1 h-4 w-4" />Add certification</Button>
      </Section>
    </div>
  );

  function updateArr<K extends "experiences" | "projects" | "educations" | "certifications" | "skills">(
    key: K,
    idx: number,
    patch: any
  ) {
    const arr = [...(resume[key] as any[])];
    arr[idx] = { ...arr[idx], ...patch };
    setResume({ ...resume, [key]: arr } as ResumeData);
  }
  function removeArr(key: keyof ResumeData, idx: number) {
    const arr = [...(resume[key] as any[])];
    arr.splice(idx, 1);
    setResume({ ...resume, [key]: arr } as ResumeData);
  }
  function addArr(key: keyof ResumeData, item: any) {
    const arr = [...(resume[key] as any[]), item];
    setResume({ ...resume, [key]: arr } as ResumeData);
  }
}

function SkillAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }}
      className="mt-2 flex gap-2"
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Add a skill" />
      <Button type="submit" size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</Label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Field({ label, v, onChange }: { label: string; v: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={v ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  getProfileByUsername,
  updateMyProfile,
  upsertExperience,
  deleteExperience,
  upsertEducation,
  deleteEducation,
  addSkill,
  deleteSkill,
} from "@/lib/profile.functions";
import {
  getProfileExtras,
  upsertProject,
  deleteProject,
  upsertCertification,
  deleteCertification,
} from "@/lib/profile-extras.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/app/UserAvatar";
import { BackButton } from "@/components/app/BackButton";
import {
  Home,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({ meta: [{ title: "Edit profile — LinkUp World" }] }),
  component: EditProfilePage,
});

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance", "Self-employed"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

function EditProfilePage() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const { data: full } = useQuery({
    queryKey: ["profile", me?.username],
    queryFn: () => getProfileByUsername({ data: { username: me!.username } }),
    enabled: !!me?.username,
  });
  const { data: extras } = useQuery({
    queryKey: ["profile-extras", me?.id],
    queryFn: () => getProfileExtras({ data: { profile_id: me!.id } }),
    enabled: !!me?.id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["me-profile"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["profile-extras", me?.id] });
  };

  if (isLoading || !me) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <BackButton />
        <div className="flex gap-2">
          <Link to="/feed">
            <Button variant="ghost" size="sm" className="gap-1">
              <Home className="h-4 w-4" /> Home
            </Button>
          </Link>
          <Link to="/u/$username" params={{ username: me.username }}>
            <Button variant="outline" size="sm">View profile</Button>
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Edit profile</h1>
      <p className="text-sm text-muted-foreground">
        Build a stronger profile. Updates appear instantly across LinkUp World.
      </p>

      <Tabs defaultValue="basic" className="mt-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="photo">Photo & Banner</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <BasicInfoCard me={me} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="about" className="mt-4">
          <AboutCard me={me} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="photo" className="mt-4">
          <PhotoBannerCard me={me} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="experience" className="mt-4">
          <ExperienceList items={full?.experiences ?? []} onChange={refresh} />
        </TabsContent>
        <TabsContent value="education" className="mt-4">
          <EducationList items={full?.educations ?? []} onChange={refresh} />
        </TabsContent>
        <TabsContent value="skills" className="mt-4">
          <SkillsList items={full?.skills ?? []} onChange={refresh} />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsList items={extras?.projects ?? []} onChange={refresh} />
        </TabsContent>
        <TabsContent value="certifications" className="mt-4">
          <CertificationsList items={extras?.certifications ?? []} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Basic Info ---------------- */

function BasicInfoCard({ me, onSaved }: { me: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    username: me.username,
    first_name: me.first_name ?? "",
    last_name: me.last_name ?? "",
    headline: me.headline ?? "",
    company: me.company ?? "",
    location: me.location ?? "",
    website: me.website ?? "",
    github_url: me.github_url ?? "",
    linkedin_url: me.linkedin_url ?? "",
    portfolio_url: me.portfolio_url ?? "",
  });

  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: { ...me, ...form, about: me.about ?? "" } }),
    onSuccess: () => {
      toast.success("Basic info updated");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Could not save"),
  });

  return (
    <SectionCard title="Basic Info" description="Your name, headline, and contact links.">
      <Grid2>
        <Field label="First name">
          <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} maxLength={60} />
        </Field>
        <Field label="Last name">
          <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} maxLength={60} />
        </Field>
      </Grid2>
      <Field label="Username" hint="Lowercase letters, numbers, underscore.">
        <Input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
          maxLength={30}
        />
      </Field>
      <Field label="Headline" hint="A short professional tagline.">
        <Input
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          maxLength={220}
          placeholder="Senior Product Engineer at Acme"
        />
      </Field>
      <Grid2>
        <Field label="Company">
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
        </Field>
        <Field label="Location">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={120} placeholder="San Francisco, CA" />
        </Field>
      </Grid2>
      <Grid2>
        <Field label="Website">
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
        </Field>
        <Field label="Portfolio">
          <Input value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://" />
        </Field>
      </Grid2>
      <Grid2>
        <Field label="GitHub">
          <Input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/…" />
        </Field>
        <Field label="LinkedIn">
          <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" />
        </Field>
      </Grid2>
      <SaveBar pending={save.isPending} onSave={() => save.mutate()} />
    </SectionCard>
  );
}

/* ---------------- About ---------------- */

function AboutCard({ me, onSaved }: { me: any; onSaved: () => void }) {
  const [about, setAbout] = useState<string>(me.about ?? "");
  const max = 1000;
  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: { ...me, about } }),
    onSuccess: () => {
      toast.success("About updated");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Could not save"),
  });

  return (
    <SectionCard title="About" description="Tell people about your work, interests, and goals.">
      <Textarea
        value={about}
        onChange={(e) => setAbout(e.target.value.slice(0, max))}
        rows={8}
        placeholder="Write a brief professional summary…"
      />
      <p className="text-right text-xs text-muted-foreground">
        {about.length}/{max}
      </p>
      <SaveBar pending={save.isPending} onSave={() => save.mutate()} />
    </SectionCard>
  );
}

/* ---------------- Photo & Banner ---------------- */

function PhotoBannerCard({ me, onSaved }: { me: any; onSaved: () => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Profile photo" description="Upload a clear, friendly headshot.">
        <ImageUploader
          userId={me.id}
          currentUrl={me.avatar_url}
          bucket="avatars"
          variant="avatar"
          onSaved={async (url) => {
            await updateMyProfile({ data: { ...me, avatar_url: url ?? "" } });
            toast.success(url ? "Photo updated" : "Photo removed");
            onSaved();
          }}
          fallbackName={`${me.first_name} ${me.last_name}`.trim() || me.username}
        />
      </SectionCard>
      <SectionCard title="Cover banner" description="A wide image shown at the top of your profile.">
        <ImageUploader
          userId={me.id}
          currentUrl={me.cover_url}
          bucket="post-media"
          variant="cover"
          onSaved={async (url) => {
            await updateMyProfile({ data: { ...me, cover_url: url ?? "" } });
            toast.success(url ? "Banner updated" : "Banner removed");
            onSaved();
          }}
          fallbackName=""
        />
      </SectionCard>
    </div>
  );
}

function ImageUploader({
  userId,
  currentUrl,
  bucket,
  variant,
  onSaved,
  fallbackName,
}: {
  userId: string;
  currentUrl?: string | null;
  bucket: "avatars" | "post-media";
  variant: "avatar" | "cover";
  onSaved: (url: string | null) => void | Promise<void>;
  fallbackName: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Only JPG, PNG, or WEBP images allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5MB or smaller");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      const ext = file.name.split(".").pop();
      const path = `${userId}/${variant}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setPreview(data.publicUrl);
      await onSaved(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {variant === "avatar" ? (
        <div className="flex items-center gap-4">
          <UserAvatar url={preview ?? undefined} name={fallbackName} className="h-24 w-24" />
          <UploaderActions
            uploading={uploading}
            onPick={() => inputRef.current?.click()}
            onRemove={
              preview
                ? async () => {
                    setPreview(null);
                    await onSaved(null);
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div
            className="h-32 w-full rounded-lg border bg-muted bg-cover bg-center sm:h-44"
            style={preview ? { backgroundImage: `url(${preview})` } : undefined}
          >
            {!preview && (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                <ImagePlus className="mr-1 h-4 w-4" /> No banner uploaded
              </div>
            )}
          </div>
          <UploaderActions
            uploading={uploading}
            onPick={() => inputRef.current?.click()}
            onRemove={
              preview
                ? async () => {
                    setPreview(null);
                    await onSaved(null);
                  }
                : undefined
            }
          />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={pick}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Max 5MB.</p>
    </div>
  );
}

function UploaderActions({
  uploading,
  onPick,
  onRemove,
}: {
  uploading: boolean;
  onPick: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onPick} disabled={uploading} className="gap-2">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Upload"}
      </Button>
      {onRemove && (
        <Button type="button" variant="ghost" onClick={onRemove} disabled={uploading} className="gap-2">
          <X className="h-4 w-4" /> Remove
        </Button>
      )}
    </div>
  );
}

/* ---------------- Experience ---------------- */

function ExperienceList({ items, onChange }: { items: any[]; onChange: () => void }) {
  return (
    <SectionCard
      title="Experience"
      description="Your professional roles."
      icon={<Briefcase className="h-4 w-4" />}
      action={<ExperienceDialog onSaved={onChange} />}
    >
      {items.length === 0 ? (
        <EmptyState text="Add your work history to showcase your career." />
      ) : (
        <ul className="divide-y">
          {items.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-muted-foreground">
                  {e.company}
                  {e.employment_type ? ` · ${e.employment_type}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmt(e.start_date)} – {e.is_current ? "Present" : fmt(e.end_date)}
                </p>
                {e.description && <p className="mt-1 whitespace-pre-wrap text-sm">{e.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <ExperienceDialog initial={e} onSaved={onChange} />
                <DeleteBtn
                  onConfirm={async () => {
                    await deleteExperience({ data: { id: e.id } });
                    toast.success("Experience removed");
                    onChange();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ExperienceDialog({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    company: initial?.company ?? "",
    employment_type: initial?.employment_type ?? "",
    location: initial?.location ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    is_current: initial?.is_current ?? false,
    description: initial?.description ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      upsertExperience({
        data: { id: initial?.id, ...form, end_date: form.is_current ? null : form.end_date || null },
      }),
    onSuccess: () => {
      toast.success(initial ? "Experience updated" : "Experience added");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add experience</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit experience" : "Add experience"}</DialogTitle>
        </DialogHeader>
        <Field label="Job title *">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Company *">
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
        <Grid2>
          <Field label="Employment type">
            <Select value={form.employment_type || undefined} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Start date *">
            <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={form.end_date ?? ""}
              disabled={form.is_current}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </Field>
        </Grid2>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.is_current}
            onCheckedChange={(v) => setForm({ ...form, is_current: !!v, end_date: v ? "" : form.end_date })}
          />
          I currently work here
        </label>
        <Field label="Description">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 2000) })}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.company.trim() || !form.start_date || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Education ---------------- */

function EducationList({ items, onChange }: { items: any[]; onChange: () => void }) {
  return (
    <SectionCard
      title="Education"
      description="Your schools and qualifications."
      icon={<GraduationCap className="h-4 w-4" />}
      action={<EducationDialog onSaved={onChange} />}
    >
      {items.length === 0 ? (
        <EmptyState text="Add your education history." />
      ) : (
        <ul className="divide-y">
          {items.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{e.school}</p>
                <p className="text-sm text-muted-foreground">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.start_date)} – {fmt(e.end_date)}</p>
                {e.description && <p className="mt-1 whitespace-pre-wrap text-sm">{e.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <EducationDialog initial={e} onSaved={onChange} />
                <DeleteBtn
                  onConfirm={async () => {
                    await deleteEducation({ data: { id: e.id } });
                    toast.success("Education removed");
                    onChange();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function EducationDialog({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    school: initial?.school ?? "",
    degree: initial?.degree ?? "",
    field: initial?.field ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    description: initial?.description ?? "",
  });

  const save = useMutation({
    mutationFn: () => upsertEducation({ data: { id: initial?.id, ...form } }),
    onSuccess: () => {
      toast.success(initial ? "Education updated" : "Education added");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add education</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit education" : "Add education"}</DialogTitle>
        </DialogHeader>
        <Field label="School *">
          <Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        </Field>
        <Grid2>
          <Field label="Degree">
            <Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="B.S." />
          </Field>
          <Field label="Field of study">
            <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="Computer Science" />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Start date">
            <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label="End date">
            <Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </Field>
        </Grid2>
        <Field label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 2000) })} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.school.trim() || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Skills ---------------- */

function SkillsList({ items, onChange }: { items: any[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<string>("");

  const add = useMutation({
    mutationFn: () => addSkill({ data: { name, level: (level || null) as any } }),
    onSuccess: () => {
      setName("");
      setLevel("");
      toast.success("Skill added");
      onChange();
    },
    onError: (e: any) => toast.error(e.message || "Could not add"),
  });

  return (
    <SectionCard title="Skills" description="Highlight your strongest skills.">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. TypeScript"
          className="flex-1"
          maxLength={60}
        />
        <Select value={level || undefined} onValueChange={setLevel}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Level (optional)" /></SelectTrigger>
          <SelectContent>
            {SKILL_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState text="Add a few skills to be discoverable." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
              {s.name}
              {s.level && <span className="text-muted-foreground">· {s.level}</span>}
              <button
                onClick={async () => {
                  await deleteSkill({ data: { id: s.id } });
                  toast.success("Skill removed");
                  onChange();
                }}
                className="ml-1 text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- Projects ---------------- */

function ProjectsList({ items, onChange }: { items: any[]; onChange: () => void }) {
  return (
    <SectionCard
      title="Projects"
      description="Showcase what you've built."
      icon={<FolderGit2 className="h-4 w-4" />}
      action={<ProjectDialog onSaved={onChange} />}
    >
      {items.length === 0 ? (
        <EmptyState text="Add your projects to stand out." />
      ) : (
        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex-1">
                <p className="font-semibold">{p.title}</p>
                {(p.start_date || p.end_date) && (
                  <p className="text-xs text-muted-foreground">{fmt(p.start_date)} – {fmt(p.end_date) || "Present"}</p>
                )}
                {p.description && <p className="mt-1 whitespace-pre-wrap text-sm">{p.description}</p>}
                {p.tech_stack?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.tech_stack.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                )}
                <div className="mt-1.5 flex gap-3 text-xs">
                  {p.live_url && <a href={p.live_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Live ↗</a>}
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub ↗</a>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <ProjectDialog initial={p} onSaved={onChange} />
                <DeleteBtn
                  onConfirm={async () => {
                    await deleteProject({ data: { id: p.id } });
                    toast.success("Project removed");
                    onChange();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ProjectDialog({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    tech: (initial?.tech_stack ?? []).join(", "),
    live_url: initial?.live_url ?? "",
    github_url: initial?.github_url ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      upsertProject({
        data: {
          id: initial?.id,
          title: form.title,
          description: form.description,
          tech_stack: form.tech.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
          live_url: form.live_url || undefined,
          github_url: form.github_url || undefined,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        },
      }),
    onSuccess: () => {
      toast.success(initial ? "Project updated" : "Project added");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add project</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit project" : "Add project"}</DialogTitle>
        </DialogHeader>
        <Field label="Project title *">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 2000) })} />
        </Field>
        <Field label="Tech stack" hint="Comma separated.">
          <Input value={form.tech} onChange={(e) => setForm({ ...form, tech: e.target.value })} placeholder="React, TypeScript, Postgres" />
        </Field>
        <Grid2>
          <Field label="Live URL">
            <Input value={form.live_url} onChange={(e) => setForm({ ...form, live_url: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="GitHub URL">
            <Input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/…" />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Start date">
            <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label="End date">
            <Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </Field>
        </Grid2>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Certifications ---------------- */

function CertificationsList({ items, onChange }: { items: any[]; onChange: () => void }) {
  return (
    <SectionCard
      title="Certifications"
      description="Licenses and credentials you've earned."
      icon={<Award className="h-4 w-4" />}
      action={<CertificationDialog onSaved={onChange} />}
    >
      {items.length === 0 ? (
        <EmptyState text="Add certifications to highlight your credentials." />
      ) : (
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{c.name}</p>
                {c.issuer && <p className="text-sm text-muted-foreground">{c.issuer}</p>}
                <p className="text-xs text-muted-foreground">
                  {c.issue_date && <>Issued {fmt(c.issue_date)}</>}
                  {c.expiry_date && <> · Expires {fmt(c.expiry_date)}</>}
                </p>
                {c.credential_id && <p className="text-xs text-muted-foreground">ID: {c.credential_id}</p>}
                {c.credential_url && (
                  <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    View credential ↗
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <CertificationDialog initial={c} onSaved={onChange} />
                <DeleteBtn
                  onConfirm={async () => {
                    await deleteCertification({ data: { id: c.id } });
                    toast.success("Certification removed");
                    onChange();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CertificationDialog({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    issuer: initial?.issuer ?? "",
    issue_date: initial?.issue_date ?? "",
    expiry_date: initial?.expiry_date ?? "",
    credential_id: initial?.credential_id ?? "",
    credential_url: initial?.credential_url ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      upsertCertification({
        data: {
          id: initial?.id,
          name: form.name,
          issuer: form.issuer,
          issue_date: form.issue_date || null,
          expiry_date: form.expiry_date || null,
          credential_id: form.credential_id || null,
          credential_url: form.credential_url || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(initial ? "Certification updated" : "Certification added");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add certification</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit certification" : "Add certification"}</DialogTitle>
        </DialogHeader>
        <Field label="Certificate name *">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Issuing organization">
          <Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
        </Field>
        <Grid2>
          <Field label="Issue date">
            <Input type="date" value={form.issue_date ?? ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={form.expiry_date ?? ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </Field>
        </Grid2>
        <Field label="Credential ID">
          <Input value={form.credential_id} onChange={(e) => setForm({ ...form, credential_id: e.target.value })} />
        </Field>
        <Field label="Credential URL">
          <Input value={form.credential_url} onChange={(e) => setForm({ ...form, credential_url: e.target.value })} placeholder="https://" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Shared building blocks ---------------- */

function SectionCard({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">{icon}{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function SaveBar({ pending, onSave }: { pending: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end border-t pt-4">
      <Button onClick={onSave} disabled={pending}>
        {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
      </Button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Delete"
      onClick={() => {
        if (confirm("Delete this item?")) onConfirm();
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

function fmt(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getProfileByUsername, getMyProfile, addSkill, deleteSkill, upsertExperience, deleteExperience, upsertEducation, deleteEducation } from "@/lib/profile.functions";
import { getProfileExtras, upsertProject, deleteProject, upsertCertification, deleteCertification } from "@/lib/profile-extras.functions";
import {
  getConnectionStatus,
  removeConnection,
  sendConnectionRequest,
  respondConnection,
  toggleFollow,
} from "@/lib/network.functions";
import { UserAvatar } from "@/components/app/UserAvatar";
import { BackButton } from "@/components/app/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Globe, Github, Linkedin, UserPlus, UserCheck, Clock, UserMinus, Plus, Pencil, Trash2, Home, MessageSquare, Award, FolderGit2, Briefcase, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — LinkUp World` },
      { name: "description", content: `View ${params.username}'s profile on LinkUp World.` },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = useParams({ from: "/u/$username" });
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile", username], queryFn: () => getProfileByUsername({ data: { username } }) });
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile(), retry: false });

  const profile = data?.profile;
  const profileId = profile?.id;

  const { data: extras } = useQuery({
    queryKey: ["profile-extras", profileId],
    queryFn: () => getProfileExtras({ data: { profile_id: profileId! } }),
    enabled: !!profileId,
  });

  const { data: status } = useQuery({
    queryKey: ["conn-status", profileId],
    queryFn: () => getConnectionStatus({ data: { profile_id: profileId! } }),
    enabled: !!profileId && !!me,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["conn-status", profileId] });
    qc.invalidateQueries({ queryKey: ["my-connections"] });
  };

  const connect = useMutation({
    mutationFn: () => sendConnectionRequest({ data: { addressee_id: profileId! } }),
    onSuccess: () => { toast.success("Request sent"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const accept = useMutation({
    mutationFn: () => respondConnection({ data: { requester_id: profileId!, accept: true } }),
    onSuccess: () => { toast.success("Connection accepted"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const unconnect = useMutation({
    mutationFn: () => removeConnection({ data: { other_id: profileId! } }),
    onSuccess: invalidateAll,
  });
  const follow = useMutation({
    mutationFn: (v: boolean) => toggleFollow({ data: { profile_id: profileId!, follow: v } }),
    onSuccess: invalidateAll,
  });

  if (isLoading) return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="mx-auto max-w-4xl p-6">Profile not found.</div>;

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.username;
  const isSelf = status?.status === "self";
  const refetchExtras = () => qc.invalidateQueries({ queryKey: ["profile-extras", profileId] });
  const refetchProfile = () => qc.invalidateQueries({ queryKey: ["profile", username] });

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <Link to="/feed" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>

      {/* Cover + identity card */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div
          className="h-36 bg-gradient-to-r from-primary/40 to-primary/20"
          style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <UserAvatar url={profile.avatar_url} name={fullName} className="h-24 w-24 border-4 border-card" />
            {me && (
              <div className="flex flex-wrap gap-2">
                {isSelf ? (
                  <Link to="/settings/profile"><Button variant="outline"><Pencil className="mr-1 h-4 w-4" />Edit profile</Button></Link>
                ) : (
                  <>
                    {status?.status === "accepted" && (
                      <Button variant="outline" onClick={() => unconnect.mutate()}><UserCheck className="mr-1 h-4 w-4" /> Connected</Button>
                    )}
                    {status?.status === "none" && (
                      <Button onClick={() => connect.mutate()} disabled={connect.isPending}><UserPlus className="mr-1 h-4 w-4" /> Connect</Button>
                    )}
                    {status?.status === "pending_out" && (
                      <Button variant="outline" disabled><Clock className="mr-1 h-4 w-4" /> Pending</Button>
                    )}
                    {status?.status === "pending_in" && (
                      <Button onClick={() => accept.mutate()} disabled={accept.isPending}><UserCheck className="mr-1 h-4 w-4" /> Accept</Button>
                    )}
                    {(status?.status as string) !== "self" && (
                      <Button variant={status?.is_following ? "outline" : "secondary"} onClick={() => follow.mutate(!status?.is_following)}>
                        {status?.is_following ? "Following" : "Follow"}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => toast("Messaging coming soon")}><MessageSquare className="mr-1 h-4 w-4" /> Message</Button>
                    {status?.status === "accepted" && (
                      <Button variant="ghost" size="icon" onClick={() => unconnect.mutate()} title="Remove connection">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold">{fullName}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.headline && <p className="mt-1 text-base">{profile.headline}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-3 w-3" /> Website</a>}
            {profile.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Github className="h-3 w-3" /> GitHub</a>}
            {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Linkedin className="h-3 w-3" /> LinkedIn</a>}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span><strong>{data.stats.connections}</strong> <span className="text-muted-foreground">connections</span></span>
            <span><strong>{data.stats.followers}</strong> <span className="text-muted-foreground">followers</span></span>
            <span><strong>{data.stats.following}</strong> <span className="text-muted-foreground">following</span></span>
          </div>
        </div>
      </div>

      {/* About */}
      {(profile.about || isSelf) && (
        <Section title="About">
          {profile.about
            ? <p className="whitespace-pre-wrap text-sm">{profile.about}</p>
            : <p className="text-sm text-muted-foreground">Add an About section from Settings.</p>}
        </Section>
      )}

      {/* Experience */}
      <Section
        title="Experience"
        icon={<Briefcase className="h-4 w-4" />}
        action={isSelf && <ExperienceDialog onSaved={refetchProfile} />}
      >
        {data.experiences.length === 0 && <Empty msg="No experience added yet." />}
        <ul className="space-y-4">
          {data.experiences.map((e: any) => (
            <li key={e.id} className="group flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm">{e.company}{e.location ? ` • ${e.location}` : ""}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.start_date)} – {e.is_current ? "Present" : fmt(e.end_date)}</p>
                {e.description && <p className="mt-1 whitespace-pre-wrap text-sm">{e.description}</p>}
              </div>
              {isSelf && (
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <ExperienceDialog onSaved={refetchProfile} initial={e} />
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteExperience({ data: { id: e.id } }); refetchProfile(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Education */}
      <Section
        title="Education"
        icon={<GraduationCap className="h-4 w-4" />}
        action={isSelf && <EducationDialog onSaved={refetchProfile} />}
      >
        {data.educations.length === 0 && <Empty msg="No education added yet." />}
        <ul className="space-y-4">
          {data.educations.map((e: any) => (
            <li key={e.id} className="group flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{e.school}</p>
                <p className="text-sm">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.start_date)} – {fmt(e.end_date)}</p>
                {e.description && <p className="mt-1 whitespace-pre-wrap text-sm">{e.description}</p>}
              </div>
              {isSelf && (
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <EducationDialog onSaved={refetchProfile} initial={e} />
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteEducation({ data: { id: e.id } }); refetchProfile(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Skills */}
      <Section title="Skills" action={isSelf && <SkillDialog onSaved={refetchProfile} />}>
        {data.skills.length === 0 && <Empty msg="No skills added yet." />}
        <div className="flex flex-wrap gap-2">
          {data.skills.map((s: any) => (
            <Badge key={s.id} variant="secondary" className="group relative pr-2">
              {s.name}
              {isSelf && (
                <button
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  onClick={async () => { await deleteSkill({ data: { id: s.id } }); refetchProfile(); }}
                  title="Remove"
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
        </div>
      </Section>

      {/* Projects */}
      <Section
        title="Projects"
        icon={<FolderGit2 className="h-4 w-4" />}
        action={isSelf && <ProjectDialog onSaved={refetchExtras} />}
      >
        {(extras?.projects.length ?? 0) === 0 && <Empty msg="No projects added yet." />}
        <ul className="space-y-4">
          {(extras?.projects ?? []).map((p: any) => (
            <li key={p.id} className="group flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold">{p.title}</p>
                {p.description && <p className="mt-0.5 whitespace-pre-wrap text-sm">{p.description}</p>}
                {p.tech_stack?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tech_stack.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                )}
                <div className="mt-2 flex gap-3 text-xs">
                  {p.live_url && <a href={p.live_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Live ↗</a>}
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub ↗</a>}
                </div>
              </div>
              {isSelf && (
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <ProjectDialog onSaved={refetchExtras} initial={p} />
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteProject({ data: { id: p.id } }); refetchExtras(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Certifications */}
      <Section
        title="Certifications"
        icon={<Award className="h-4 w-4" />}
        action={isSelf && <CertificationDialog onSaved={refetchExtras} />}
      >
        {(extras?.certifications.length ?? 0) === 0 && <Empty msg="No certifications added yet." />}
        <ul className="space-y-4">
          {(extras?.certifications ?? []).map((c: any) => (
            <li key={c.id} className="group flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{c.name}</p>
                {c.issuer && <p className="text-sm">{c.issuer}</p>}
                {c.issue_date && <p className="text-xs text-muted-foreground">Issued {fmt(c.issue_date)}</p>}
                {c.credential_url && <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View credential ↗</a>}
              </div>
              {isSelf && (
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <CertificationDialog onSaved={refetchExtras} initial={c} />
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteCertification({ data: { id: c.id } }); refetchExtras(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Posts */}
      <Section title={`Posts by ${profile.first_name || profile.username}`}>
        {(extras?.posts.length ?? 0) === 0 && <Empty msg="No posts yet." />}
        <ul className="space-y-3">
          {(extras?.posts ?? []).map((p: any) => (
            <li key={p.id} className="rounded-lg border p-3">
              <p className="whitespace-pre-wrap text-sm">{p.content}</p>
              {p.image_url && <img src={p.image_url} alt="" className="mt-2 max-h-72 rounded-md object-cover" />}
              <p className="mt-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children, action, icon }: { title: string; children: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">{icon}{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground">{msg}</p>;
}

function fmt(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
  catch { return d; }
}

function AddBtn({ label }: { label: string }) {
  return <Button size="sm" variant="ghost"><Plus className="mr-1 h-4 w-4" />{label}</Button>;
}

function EditIconBtn() {
  return <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>;
}

// --- Dialogs ---

function SkillDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><AddBtn label="Add skill" /></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add skill</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TypeScript" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={async () => { await addSkill({ data: { name: name.trim() } }); setName(""); setOpen(false); onSaved(); toast.success("Skill added"); }}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExperienceDialog({ onSaved, initial }: { onSaved: () => void; initial?: any }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(initial ?? { title: "", company: "", location: "", start_date: "", end_date: "", is_current: false, description: "" });
  const save = async () => {
    try {
      await upsertExperience({ data: { ...f, id: initial?.id } });
      setOpen(false);
      onSaved();
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && initial) setF(initial); }}>
      <DialogTrigger asChild>{initial ? <EditIconBtn /> : <AddBtn label="Add experience" />}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} experience</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Job title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="Location"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" value={f.start_date ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={f.end_date ?? ""} disabled={f.is_current} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.is_current} onCheckedChange={(v) => setF({ ...f, is_current: !!v })} /> I currently work here
          </label>
          <Field label="Description"><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.title || !f.company || !f.start_date}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EducationDialog({ onSaved, initial }: { onSaved: () => void; initial?: any }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(initial ?? { school: "", degree: "", field: "", start_date: "", end_date: "", description: "" });
  const save = async () => {
    try { await upsertEducation({ data: { ...f, id: initial?.id } }); setOpen(false); onSaved(); toast.success("Saved"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && initial) setF(initial); }}>
      <DialogTrigger asChild>{initial ? <EditIconBtn /> : <AddBtn label="Add education" />}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} education</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="School"><Input value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} /></Field>
          <Field label="Degree"><Input value={f.degree} onChange={(e) => setF({ ...f, degree: e.target.value })} /></Field>
          <Field label="Field of study"><Input value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" value={f.start_date ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={f.end_date ?? ""} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.school}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDialog({ onSaved, initial }: { onSaved: () => void; initial?: any }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(initial ?? { title: "", description: "", tech_stack: [], live_url: "", github_url: "" });
  const [techInput, setTechInput] = useState("");
  const addTech = () => {
    const v = techInput.trim();
    if (v && !f.tech_stack.includes(v)) setF({ ...f, tech_stack: [...f.tech_stack, v] });
    setTechInput("");
  };
  const save = async () => {
    try { await upsertProject({ data: { ...f, id: initial?.id } }); setOpen(false); onSaved(); toast.success("Saved"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && initial) setF(initial); }}>
      <DialogTrigger asChild>{initial ? <EditIconBtn /> : <AddBtn label="Add project" />}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} project</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Tech stack">
            <div className="flex gap-2">
              <Input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech())} placeholder="React, Node…" />
              <Button type="button" variant="outline" onClick={addTech}>Add</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {f.tech_stack.map((t: string) => (
                <Badge key={t} variant="secondary" className="pr-2">{t}
                  <button className="ml-1 text-muted-foreground hover:text-destructive" onClick={() => setF({ ...f, tech_stack: f.tech_stack.filter((x: string) => x !== t) })}>×</button>
                </Badge>
              ))}
            </div>
          </Field>
          <Field label="Live URL"><Input value={f.live_url} onChange={(e) => setF({ ...f, live_url: e.target.value })} placeholder="https://" /></Field>
          <Field label="GitHub URL"><Input value={f.github_url} onChange={(e) => setF({ ...f, github_url: e.target.value })} placeholder="https://github.com/…" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.title}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CertificationDialog({ onSaved, initial }: { onSaved: () => void; initial?: any }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(initial ?? { name: "", issuer: "", issue_date: "", credential_url: "" });
  const save = async () => {
    try { await upsertCertification({ data: { ...f, id: initial?.id } }); setOpen(false); onSaved(); toast.success("Saved"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && initial) setF(initial); }}>
      <DialogTrigger asChild>{initial ? <EditIconBtn /> : <AddBtn label="Add certificate" />}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} certification</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Issuing organization"><Input value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} /></Field>
          <Field label="Issue date"><Input type="date" value={f.issue_date ?? ""} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></Field>
          <Field label="Credential URL"><Input value={f.credential_url} onChange={(e) => setF({ ...f, credential_url: e.target.value })} placeholder="https://" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/app/UserAvatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ConnectSphere" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });
  const [form, setForm] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (me && !form) {
      setForm({
        username: me.username,
        first_name: me.first_name,
        last_name: me.last_name,
        headline: me.headline,
        about: me.about,
        location: me.location,
        website: me.website ?? "",
        github_url: me.github_url ?? "",
        linkedin_url: me.linkedin_url ?? "",
        avatar_url: me.avatar_url ?? "",
        cover_url: me.cover_url ?? "",
      });
    }
  }, [me, form]);

  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: form }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["me-profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${me.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f: any) => ({ ...f, avatar_url: data.publicUrl }));
    setUploading(false);
  };

  if (!form) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const fullName = `${form.first_name} ${form.last_name}`.trim() || form.username;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Edit profile</h1>
      <div className="mt-6 space-y-6 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <UserAvatar url={form.avatar_url} name={fullName} className="h-20 w-20" />
          <div>
            <Label className="cursor-pointer">
              <Button variant="outline" size="sm" type="button" disabled={uploading} asChild>
                <span>{uploading ? "Uploading…" : "Change photo"}</span>
              </Button>
              <input type="file" accept="image/*" hidden onChange={uploadAvatar} />
            </Label>
          </div>
        </div>

        <Grid2>
          <Field label="First name"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Last name"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
        </Grid2>
        <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} /></Field>
        <Field label="Headline"><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Senior Engineer at Acme" /></Field>
        <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="About"><Textarea rows={5} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /></Field>
        <Grid2>
          <Field label="Website"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></Field>
          <Field label="LinkedIn"><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://" /></Field>
        </Grid2>
        <Field label="GitHub"><Input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://" /></Field>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => navigate({ to: "/u/$username", params: { username: me!.username } })}>View profile</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

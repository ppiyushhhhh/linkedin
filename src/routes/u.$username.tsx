import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfileByUsername } from "@/lib/profile.functions";
import {
  getConnectionStatus,
  removeConnection,
  sendConnectionRequest,
  toggleFollow,
} from "@/lib/network.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Github, Linkedin, UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ConnectSphere` },
      { name: "description", content: `View ${params.username}'s profile on ConnectSphere.` },
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

  const { data: status } = useQuery({
    queryKey: ["conn-status", profileId],
    queryFn: () => getConnectionStatus({ data: { profile_id: profileId! } }),
    enabled: !!profileId && !!me,
  });

  const connect = useMutation({
    mutationFn: () => sendConnectionRequest({ data: { addressee_id: profileId! } }),
    onSuccess: () => { toast.success("Request sent"); qc.invalidateQueries({ queryKey: ["conn-status", profileId] }); },
  });
  const unconnect = useMutation({
    mutationFn: () => removeConnection({ data: { other_id: profileId! } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conn-status", profileId] }),
  });
  const follow = useMutation({
    mutationFn: (v: boolean) => toggleFollow({ data: { profile_id: profileId!, follow: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conn-status", profileId] }),
  });

  if (isLoading) return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="mx-auto max-w-4xl p-6">Profile not found.</div>;

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.username;
  const isSelf = status?.status === "self";

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 py-4">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="h-32 bg-gradient-to-r from-primary/40 to-primary/20" style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between">
            <UserAvatar url={profile.avatar_url} name={fullName} className="h-24 w-24 border-4 border-card" />
            {me && (
              <div className="flex gap-2">
                {isSelf ? (
                  <Link to="/settings"><Button variant="outline">Edit profile</Button></Link>
                ) : (
                  <>
                    {status?.status === "accepted" && (
                      <Button variant="outline" onClick={() => unconnect.mutate()}><UserMinus className="mr-1 h-4 w-4" /> Connected</Button>
                    )}
                    {status?.status === "none" && (
                      <Button onClick={() => connect.mutate()}><UserPlus className="mr-1 h-4 w-4" /> Connect</Button>
                    )}
                    {status?.status === "pending_out" && (
                      <Button variant="outline" disabled><Clock className="mr-1 h-4 w-4" /> Pending</Button>
                    )}
                    {status?.status === "pending_in" && (
                      <Button onClick={() => connect.mutate()}><UserCheck className="mr-1 h-4 w-4" /> Accept</Button>
                    )}
                    <Button variant={status?.is_following ? "outline" : "secondary"} onClick={() => follow.mutate(!status?.is_following)}>
                      {status?.is_following ? "Following" : "Follow"}
                    </Button>
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
          <div className="mt-3 flex gap-4 text-sm">
            <span><strong>{data.stats.connections}</strong> <span className="text-muted-foreground">connections</span></span>
            <span><strong>{data.stats.followers}</strong> <span className="text-muted-foreground">followers</span></span>
            <span><strong>{data.stats.following}</strong> <span className="text-muted-foreground">following</span></span>
          </div>
        </div>
      </div>

      {profile.about && (
        <Section title="About"><p className="whitespace-pre-wrap text-sm">{profile.about}</p></Section>
      )}

      {data.experiences.length > 0 && (
        <Section title="Experience">
          <ul className="space-y-4">
            {data.experiences.map((e: any) => (
              <li key={e.id}>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm">{e.company}{e.location ? ` • ${e.location}` : ""}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.start_date)} – {e.is_current ? "Present" : fmt(e.end_date)}</p>
                {e.description && <p className="mt-1 whitespace-pre-wrap text-sm">{e.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.educations.length > 0 && (
        <Section title="Education">
          <ul className="space-y-4">
            {data.educations.map((e: any) => (
              <li key={e.id}>
                <p className="font-semibold">{e.school}</p>
                <p className="text-sm">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.start_date)} – {fmt(e.end_date)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s: any) => (
              <Badge key={s.id} variant="secondary">{s.name}</Badge>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function fmt(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
  catch { return d; }
}

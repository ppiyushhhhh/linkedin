import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyConnections,
  getSuggestions,
  respondConnection,
  sendConnectionRequest,
  removeConnection,
} from "@/lib/network.functions";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, UserPlus, UserMinus } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({ meta: [{ title: "My Network — LinkUp World" }] }),
  component: NetworkPage,
});

function NetworkPage() {
  const qc = useQueryClient();
  const { data: conns } = useQuery({ queryKey: ["my-connections"], queryFn: () => getMyConnections() });
  const { data: suggestions } = useQuery({ queryKey: ["suggestions"], queryFn: () => getSuggestions() });

  const respond = useMutation({
    mutationFn: (v: { requester_id: string; accept: boolean }) => respondConnection({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-connections"] }),
  });
  const connect = useMutation({
    mutationFn: (id: string) => sendConnectionRequest({ data: { addressee_id: id } }),
    onSuccess: () => {
      toast.success("Request sent");
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["my-connections"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeConnection({ data: { other_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-connections"] }),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">My Network</h1>
      <Tabs defaultValue="invitations" className="mt-4">
        <TabsList>
          <TabsTrigger value="invitations">
            Invitations {conns?.incoming?.length ? `(${conns.incoming.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="connections">Connections ({conns?.accepted?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="suggestions">Discover</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="mt-4 space-y-2">
          {conns?.incoming?.length ? conns.incoming.map((c: any) => (
            <PersonRow key={c.requester_id} person={c.other}>
              <Button size="sm" variant="outline" onClick={() => respond.mutate({ requester_id: c.requester_id, accept: false })}>
                <X className="mr-1 h-4 w-4" /> Ignore
              </Button>
              <Button size="sm" onClick={() => respond.mutate({ requester_id: c.requester_id, accept: true })}>
                <Check className="mr-1 h-4 w-4" /> Accept
              </Button>
            </PersonRow>
          )) : <Empty msg="No pending invitations." />}
        </TabsContent>

        <TabsContent value="connections" className="mt-4 space-y-2">
          {conns?.accepted?.length ? conns.accepted.map((c: any) => (
            <PersonRow key={`${c.requester_id}-${c.addressee_id}`} person={c.other}>
              <Button size="sm" variant="outline" onClick={() => remove.mutate(c.other.id)}>
                <UserMinus className="mr-1 h-4 w-4" /> Remove
              </Button>
            </PersonRow>
          )) : <Empty msg="No connections yet — discover people below." />}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4 grid gap-3 sm:grid-cols-2">
          {(suggestions ?? []).map((p: any) => {
            const name = `${p.first_name} ${p.last_name}`.trim() || p.username;
            return (
              <div key={p.id} className="flex flex-col items-center rounded-xl border bg-card p-4 text-center">
                <UserAvatar url={p.avatar_url} name={name} className="h-16 w-16" />
                <Link to="/u/$username" params={{ username: p.username }} className="mt-2 font-semibold hover:underline">{name}</Link>
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.headline}</p>
                <Button size="sm" className="mt-3 w-full" onClick={() => connect.mutate(p.id)}>
                  <UserPlus className="mr-1 h-4 w-4" /> Connect
                </Button>
              </div>
            );
          })}
          {(!suggestions || suggestions.length === 0) && <Empty msg="No one new to suggest right now." />}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-2">
          {conns?.outgoing?.length ? conns.outgoing.map((c: any) => (
            <PersonRow key={c.addressee_id} person={c.other}>
              <Button size="sm" variant="outline" onClick={() => remove.mutate(c.other.id)}>Withdraw</Button>
            </PersonRow>
          )) : <Empty msg="No outgoing requests." />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PersonRow({ person, children }: { person: any; children: React.ReactNode }) {
  if (!person) return null;
  const name = `${person.first_name} ${person.last_name}`.trim() || person.username;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <UserAvatar url={person.avatar_url} name={name} />
      <div className="min-w-0 flex-1">
        <Link to="/u/$username" params={{ username: person.username }} className="block truncate font-semibold hover:underline">{name}</Link>
        <p className="truncate text-xs text-muted-foreground">{person.headline}</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}

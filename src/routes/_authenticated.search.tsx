import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { searchPeople } from "@/lib/network.functions";
import { UserAvatar } from "@/components/app/UserAvatar";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Search — ConnectSphere" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = useSearch({ from: "/_authenticated/search" });
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchPeople({ data: { q: q! } }),
    enabled: !!q,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">{q ? `Results for "${q}"` : "Search"}</h1>
      {!q && <p className="mt-2 text-sm text-muted-foreground">Use the search bar in the header.</p>}
      {q && isFetching && <p className="mt-4 text-sm text-muted-foreground">Searching…</p>}
      <ul className="mt-4 space-y-2">
        {(data ?? []).map((p: any) => {
          const name = `${p.first_name} ${p.last_name}`.trim() || p.username;
          return (
            <li key={p.id}>
              <Link to="/u/$username" params={{ username: p.username }} className="flex gap-3 rounded-xl border bg-card p-3 hover:border-primary/40">
                <UserAvatar url={p.avatar_url} name={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.headline}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.location}</p>
                </div>
              </Link>
            </li>
          );
        })}
        {q && !isFetching && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No people found.</p>
        )}
      </ul>
    </div>
  );
}

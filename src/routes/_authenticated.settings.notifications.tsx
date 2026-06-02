import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { getMyPreferences, updateMyPreferences } from "@/lib/settings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Settings" }] }),
  component: NotifPrefsPage,
});

function NotifPrefsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-prefs"],
    queryFn: () => getMyPreferences(),
  });

  const [form, setForm] = useState({ email_notifications: true, push_notifications: true });
  useEffect(() => {
    if (data) {
      setForm({
        email_notifications: data.email_notifications,
        push_notifications: data.push_notifications,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateMyPreferences({ data: form }),
    onSuccess: () => {
      toast.success("Notification preferences saved");
      qc.invalidateQueries({ queryKey: ["my-prefs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const rows: Array<{ key: keyof typeof form; label: string; desc: string }> = [
    { key: "email_notifications", label: "Email notifications", desc: "Get a digest of activity in your inbox." },
    { key: "push_notifications", label: "In-app notifications", desc: "Show the bell badge for new activity." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="divide-y rounded-md border">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                checked={form[r.key]}
                onCheckedChange={(v) => setForm((f) => ({ ...f, [r.key]: v }))}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

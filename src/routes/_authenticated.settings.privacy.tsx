import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { getMyPreferences, updateMyPreferences } from "@/lib/settings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  head: () => ({ meta: [{ title: "Privacy — Settings" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-prefs"],
    queryFn: () => getMyPreferences(),
  });

  const [form, setForm] = useState({
    profile_visibility: "public" as "public" | "private",
    show_email: false,
    show_location: true,
    allow_messages: true,
    allow_connection_requests: true,
  });

  useEffect(() => {
    if (data) {
      setForm({
        profile_visibility: data.profile_visibility,
        show_email: data.show_email,
        show_location: data.show_location,
        allow_messages: data.allow_messages,
        allow_connection_requests: data.allow_connection_requests,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateMyPreferences({ data: form }),
    onSuccess: () => {
      toast.success("Privacy preferences saved");
      qc.invalidateQueries({ queryKey: ["my-prefs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const rows: Array<{ key: keyof typeof form; label: string; desc: string }> = [
    { key: "show_email", label: "Show email", desc: "Display your email on your public profile." },
    { key: "show_location", label: "Show location", desc: "Display your city/region on your profile." },
    { key: "allow_messages", label: "Allow messages", desc: "Let connections send you direct messages." },
    {
      key: "allow_connection_requests",
      label: "Allow connection requests",
      desc: "Other members can ask to connect with you.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Profile visibility</Label>
          <Select
            value={form.profile_visibility}
            onValueChange={(v: "public" | "private") => setForm((f) => ({ ...f, profile_visibility: v }))}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public — anyone can view</SelectItem>
              <SelectItem value="private">Private — only connections</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y rounded-md border">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                checked={form[r.key] as boolean}
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

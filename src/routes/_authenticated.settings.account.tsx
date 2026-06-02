import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccountEmail } from "@/lib/settings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/account")({
  head: () => ({ meta: [{ title: "Account — Settings" }] }),
  component: AccountSettingsPage,
});

function AccountSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["account-email"],
    queryFn: () => getMyAccountEmail(),
  });
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (data?.email) setEmail(data.email);
  }, [data?.email]);

  const updateEmail = useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Confirmation email sent. Check your inbox to verify the change.");
      qc.invalidateQueries({ queryKey: ["account-email"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update email"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Member since</Label>
              <p className="text-sm">
                {data?.created_at ? new Date(data.created_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email && email !== data?.email) updateEmail.mutate(email);
              }}
              className="space-y-2"
            >
              <Label htmlFor="email">Email address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" disabled={updateEmail.isPending || email === data?.email || !email}>
                  {updateEmail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll receive a confirmation link at the new address before it takes effect.
              </p>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

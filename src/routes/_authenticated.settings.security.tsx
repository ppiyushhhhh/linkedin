import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/settings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({ meta: [{ title: "Security — Settings" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const changePw = useMutation({
    mutationFn: async () => {
      if (pw.length < 8) throw new Error("Password must be at least 8 characters");
      if (pw !== pw2) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => {
      setPw("");
      setPw2("");
      toast.success("Password updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update password"),
  });

  const deleteAcc = useMutation({
    mutationFn: () => deleteMyAccount(),
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/login" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete account"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              changePw.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pw2">Confirm new password</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changePw.isPending || !pw || !pw2}>
                {changePw.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Permanently delete your account, profile, posts, connections and all related data. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove your profile and all associated data. Type{" "}
                  <span className="font-mono font-semibold">DELETE</span> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText !== "DELETE" || deleteAcc.isPending}
                  onClick={() => deleteAcc.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAcc.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

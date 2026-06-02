import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — LinkedIn" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/feed" });
  };

  const onGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/feed" });
    if (res.error) toast.error(res.error.message);
  };

  return (
    <AuthShell title="Sign in to LinkedIn" subtitle="Stay updated on your professional world.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/reset-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
      <Divider />
      <Button variant="outline" className="w-full" onClick={onGoogle} type="button">
        Continue with Google
      </Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to LinkedIn?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:underline">Join now</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <img src={logo} alt="LinkedIn" className="h-8 w-8 rounded-md object-cover" />
            LinkedIn
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </main>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
    </div>
  );
}

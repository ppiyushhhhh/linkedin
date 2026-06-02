import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/app/BackButton";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LinkUp World" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <div className="mt-6 rounded-xl border bg-card p-10 text-center">
        <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-semibold">You're all caught up</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll let you know when someone reacts, comments, or sends you an invitation.
        </p>
      </div>
    </div>
  );
}

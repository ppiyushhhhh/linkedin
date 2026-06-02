import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/messages/")({
  component: MessagesEmpty,
});

function MessagesEmpty() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold">Select a conversation</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Pick a conversation from the left, or start a new one by visiting a connection's profile.
      </p>
      <Link to="/network" className="mt-4">
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" /> Find connections
        </Button>
      </Link>
    </div>
  );
}

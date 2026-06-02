import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ fallbackTo = "/feed" }: { fallbackTo?: string }) {
  const navigate = useNavigate();
  const handle = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: fallbackTo });
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={handle} className="-ml-2 mb-2 text-muted-foreground hover:text-foreground">
      <ArrowLeft className="mr-1 h-4 w-4" /> Back
    </Button>
  );
}

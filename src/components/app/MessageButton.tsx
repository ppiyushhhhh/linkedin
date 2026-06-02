import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getOrCreateConversation } from "@/lib/messages.functions";
import { toast } from "sonner";

type Props = {
  otherId: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
  iconOnly?: boolean;
};

export function MessageButton({ otherId, size = "sm", variant = "outline", className, label = "Message", iconOnly }: Props) {
  const navigate = useNavigate();
  const open = useMutation({
    mutationFn: () => getOrCreateConversation({ data: { other_id: otherId } }),
    onSuccess: (r) => navigate({ to: "/messages/$conversationId", params: { conversationId: r.id } }),
    onError: (e: any) => toast.error(e?.message ?? "Could not open conversation"),
  });
  return (
    <Button size={size} variant={variant} className={className} onClick={() => open.mutate()} disabled={open.isPending}>
      <MessageSquare className={iconOnly ? "h-4 w-4" : "mr-1 h-4 w-4"} />
      {!iconOnly && label}
    </Button>
  );
}

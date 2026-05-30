import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
  url?: string | null;
  name?: string;
  className?: string;
};

export function UserAvatar({ url, name, className }: Props) {
  const initials = (name ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {url ? <AvatarImage src={url} alt={name ?? ""} /> : null}
      <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
        {initials || "U"}
      </AvatarFallback>
    </Avatar>
  );
}

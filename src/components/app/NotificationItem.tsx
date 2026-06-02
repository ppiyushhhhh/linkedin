import { Link } from "@tanstack/react-router";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Check, UserPlus, UserCheck, Heart, MessageSquare, AtSign, Repeat2 } from "lucide-react";
import type { NotificationRow } from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

function actorName(n: NotificationRow) {
  const a = n.actor;
  if (!a) return "Someone";
  return `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.username;
}

export function notificationText(n: NotificationRow) {
  const name = actorName(n);
  switch (n.type) {
    case "connection_request": return `${name} sent you a connection request`;
    case "connection_accepted": return `${name} accepted your connection request`;
    case "follow": return `${name} started following you`;
    case "post_like": return `${name} liked your post`;
    case "post_comment": return `${name} commented on your post`;
    case "post_repost": return `${name} reposted your post`;
    case "comment_reply": return `${name} replied to your comment`;
    case "mention": return `${name} mentioned you in a ${n.entity_type ?? "post"}`;
    default: return n.message ?? `${name} sent you a notification`;
  }
}

export function notificationHref(n: NotificationRow): { to: any; params?: any } {
  switch (n.type) {
    case "connection_request":
      return { to: "/network" };
    case "connection_accepted":
    case "follow":
      return n.actor?.username
        ? { to: "/u/$username", params: { username: n.actor.username } }
        : { to: "/network" };
    case "post_like":
    case "post_comment":
    case "post_repost":
    case "comment_reply":
    case "mention":
      if (n.entity_type === "post" && n.entity_id) {
        return { to: "/post/$id", params: { id: n.entity_id } };
      }
      return n.actor?.username
        ? { to: "/u/$username", params: { username: n.actor.username } }
        : { to: "/feed" };
    default:
      return { to: "/feed" };
  }
}

function iconFor(type: string) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "connection_request": return <UserPlus className={cls} />;
    case "connection_accepted": return <UserCheck className={cls} />;
    case "follow": return <UserPlus className={cls} />;
    case "post_like": return <Heart className={cls} />;
    case "post_repost": return <Repeat2 className={cls} />;
    case "post_comment":
    case "comment_reply": return <MessageSquare className={cls} />;
    case "mention": return <AtSign className={cls} />;
    default: return <Check className={cls} />;
  }
}

export function NotificationItem({
  n,
  onOpen,
  onMarkRead,
  onDelete,
  compact,
}: {
  n: NotificationRow;
  onOpen?: (n: NotificationRow) => void;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}) {
  const href = notificationHref(n);
  const name = actorName(n);
  return (
    <div
      className={cn(
        "group relative flex gap-3 border-b px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/40",
        !n.is_read && "bg-primary/5 border-l-2 border-l-primary",
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar url={n.actor?.avatar_url ?? undefined} name={name} className={compact ? "h-9 w-9" : "h-11 w-11"} />
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {iconFor(n.type)}
        </span>
      </div>
      <Link
        to={href.to}
        params={href.params}
        onClick={() => {
          if (!n.is_read) onMarkRead?.(n.id);
          onOpen?.(n);
        }}
        className="min-w-0 flex-1"
      >
        <p className={cn("text-sm leading-snug", !n.is_read && "font-medium")}>
          {notificationText(n)}
        </p>
        {n.message && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.message}</p>}
        <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
      </Link>
      {(onMarkRead || onDelete) && !compact && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!n.is_read && onMarkRead && (
              <DropdownMenuItem onClick={() => onMarkRead(n.id)}>
                <Check className="mr-2 h-4 w-4" /> Mark as read
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={() => onDelete(n.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

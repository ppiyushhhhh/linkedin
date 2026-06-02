import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "follow"
  | "post_like"
  | "post_comment"
  | "mention"
  | "comment_reply";

type CreateInput = {
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  entity_type?: string | null;
  entity_id?: string | null;
  message?: string | null;
  /** When true, replace any prior unread notification with the same recipient/actor/type/entity. */
  dedupe?: boolean;
};

export async function createNotification(input: CreateInput) {
  if (input.recipient_id === input.actor_id) return; // never notify yourself

  if (input.dedupe) {
    let q = supabaseAdmin
      .from("notifications")
      .delete()
      .eq("recipient_id", input.recipient_id)
      .eq("actor_id", input.actor_id)
      .eq("type", input.type)
      .eq("is_read", false);
    if (input.entity_id) q = q.eq("entity_id", input.entity_id);
    await q;
  }

  await supabaseAdmin.from("notifications").insert({
    recipient_id: input.recipient_id,
    actor_id: input.actor_id,
    type: input.type,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    message: input.message ?? null,
  });
}

/** Extract unique @usernames from text. */
export function extractMentions(text: string): string[] {
  const set = new Set<string>();
  const re = /@([a-z0-9_]{2,30})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) set.add(m[1].toLowerCase());
  return Array.from(set);
}

export async function notifyMentions(opts: {
  text: string;
  actor_id: string;
  entity_type: "post" | "comment";
  entity_id: string;
  exclude?: string[];
}) {
  const handles = extractMentions(opts.text);
  if (handles.length === 0) return;
  const { data: rows } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .in("username", handles);
  const exclude = new Set([opts.actor_id, ...(opts.exclude ?? [])]);
  for (const r of rows ?? []) {
    if (exclude.has(r.id)) continue;
    await createNotification({
      recipient_id: r.id,
      actor_id: opts.actor_id,
      type: "mention",
      entity_type: opts.entity_type,
      entity_id: opts.entity_id,
    });
  }
}

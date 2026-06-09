import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createNotification } from "./notifications.server";

const PROFILE_LITE = "id, username, first_name, last_name, headline, avatar_url";

export type ParticipantLite = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  headline?: string | null;
  avatar_url?: string | null;
};

export type ConversationListItem = {
  id: string;
  other: ParticipantLite | null;
  last_message: { id: string; content: string; sender_id: string; created_at: string } | null;
  last_message_at: string;
  unread_count: number;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

async function assertConnected(userA: string, userB: string) {
  const { data } = await supabaseAdmin
    .from("connections")
    .select("status")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`,
    )
    .maybeSingle();
  if (!data) throw new Error("You can only message your connections.");
}

export const getOrCreateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ other_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const other = data.other_id;
    if (me === other) throw new Error("You can't message yourself.");
    await assertConnected(me, other);

    // Find existing 1:1 conversation
    const { data: myConvs } = await supabaseAdmin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", me);
    const myIds = (myConvs ?? []).map((r: any) => r.conversation_id);
    if (myIds.length) {
      const { data: shared } = await supabaseAdmin
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", other)
        .in("conversation_id", myIds);
      if (shared && shared.length) {
        return { id: shared[0].conversation_id };
      }
    }

    // Create new conversation + two participants
    const { data: conv, error: cErr } = await supabaseAdmin
      .from("conversations")
      .insert({})
      .select("id")
      .single();
    if (cErr || !conv) throw new Error(cErr?.message ?? "Failed to create conversation");

    const { error: pErr } = await supabaseAdmin
      .from("conversation_participants")
      .insert([
        { conversation_id: conv.id, user_id: me },
        { conversation_id: conv.id, user_id: other },
      ]);
    if (pErr) throw new Error(pErr.message);

    return { id: conv.id };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConversationListItem[]> => {
    const me = context.userId;
    const { data: myParts } = await supabaseAdmin
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", me);
    if (!myParts || myParts.length === 0) return [];
    const convIds = myParts.map((p: any) => p.conversation_id);
    const lastReadByConv = new Map<string, string>();
    for (const p of myParts) lastReadByConv.set(p.conversation_id, p.last_read_at);

    const [{ data: convs }, { data: allParts }, { data: msgs }] = await Promise.all([
      supabaseAdmin.from("conversations").select("id, last_message_at").in("id", convIds),
      supabaseAdmin.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", convIds),
      supabaseAdmin
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at, is_read")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false }),
    ]);

    const otherIds = new Set<string>();
    const otherByConv = new Map<string, string>();
    for (const r of allParts ?? []) {
      if (r.user_id !== me) {
        otherByConv.set(r.conversation_id, r.user_id);
        otherIds.add(r.user_id);
      }
    }
    const { data: profs } = otherIds.size
      ? await supabaseAdmin.from("profiles").select(PROFILE_LITE).in("id", Array.from(otherIds))
      : { data: [] as any[] };
    const profMap = new Map<string, any>();
    for (const p of profs ?? []) profMap.set(p.id, p);

    const lastByConv = new Map<string, any>();
    const unreadByConv = new Map<string, number>();
    for (const m of msgs ?? []) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      const lr = lastReadByConv.get(m.conversation_id);
      if (m.sender_id !== me && (!lr || new Date(m.created_at) > new Date(lr))) {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      }
    }

    const items: ConversationListItem[] = (convs ?? []).map((c: any) => {
      const otherId = otherByConv.get(c.id);
      return {
        id: c.id,
        other: otherId ? (profMap.get(otherId) ?? null) : null,
        last_message: lastByConv.get(c.id) ?? null,
        last_message_at: c.last_message_at,
        unread_count: unreadByConv.get(c.id) ?? 0,
      };
    });
    items.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    return items;
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const { data: parts } = await supabaseAdmin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", data.id);
    const userIds = (parts ?? []).map((p: any) => p.user_id);
    if (!userIds.includes(me)) throw new Error("Conversation not found");
    const otherId = userIds.find((u) => u !== me) ?? null;
    const { data: other } = otherId
      ? await supabaseAdmin.from("profiles").select(PROFILE_LITE).eq("id", otherId).maybeSingle()
      : { data: null as any };
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id, sender_id, content, is_read, created_at, updated_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    return { id: data.id, other, messages: (messages ?? []) as MessageRow[] };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ conversation_id: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const { data: parts } = await supabaseAdmin
      .from("conversation_participants")
      .select("user_id, last_read_at")
      .eq("conversation_id", data.conversation_id);
    const userIds = (parts ?? []).map((p: any) => p.user_id);
    if (!userIds.includes(me)) throw new Error("Not a participant");

    const { data: msg, error } = await supabaseAdmin
      .from("messages")
      .insert({ conversation_id: data.conversation_id, sender_id: me, content: data.content })
      .select("id, conversation_id, sender_id, content, is_read, created_at, updated_at")
      .single();
    if (error || !msg) throw new Error(error?.message ?? "Failed to send");

    await supabaseAdmin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.conversation_id);

    // Notify other participants who aren't currently viewing (best-effort: skip if their last_read_at within 5s)
    const now = Date.now();
    for (const p of parts ?? []) {
      if (p.user_id === me) continue;
      const lr = p.last_read_at ? new Date(p.last_read_at).getTime() : 0;
      if (now - lr < 5000) continue;
      await createNotification({
        recipient_id: p.user_id,
        actor_id: me,
        type: "message" as any,
        entity_type: "conversation",
        entity_id: data.conversation_id,
        message: data.content.slice(0, 120),
        dedupe: true,
      });
    }

    return msg as MessageRow;
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ conversation_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    // Verify caller is a participant before any writes
    const { data: part } = await supabaseAdmin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", data.conversation_id)
      .eq("user_id", me)
      .maybeSingle();
    if (!part) throw new Error("Not a participant");

    await supabaseAdmin
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .eq("user_id", me);
    await supabaseAdmin
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", data.conversation_id)
      .neq("sender_id", me)
      .eq("is_read", false);
    // Clear message notifications for this conversation
    await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("recipient_id", me)
      .eq("type", "message")
      .eq("entity_id", data.conversation_id);
    return { ok: true };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("messages").delete().eq("id", data.id).eq("sender_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const editMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("messages")
      .update({ content: data.content })
      .eq("id", data.id)
      .eq("sender_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUnreadMessageCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = context.userId;
    const { data: myParts } = await supabaseAdmin
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", me);
    if (!myParts || myParts.length === 0) return { count: 0 };
    const ids = myParts.map((p: any) => p.conversation_id);
    const { data: msgs } = await supabaseAdmin
      .from("messages")
      .select("conversation_id, sender_id, created_at")
      .in("conversation_id", ids)
      .neq("sender_id", me);
    const lr = new Map<string, string>();
    for (const p of myParts) lr.set(p.conversation_id, p.last_read_at);
    let count = 0;
    for (const m of msgs ?? []) {
      const last = lr.get(m.conversation_id);
      if (!last || new Date(m.created_at) > new Date(last)) count++;
    }
    return { count };
  });

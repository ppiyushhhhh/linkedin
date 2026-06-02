import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createNotification } from "./notifications.server";

const PROFILE_LITE = "id, username, first_name, last_name, headline, avatar_url, location, company";

export const getFollowGraph = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [{ data: followers }, { data: following }] = await Promise.all([
      supabaseAdmin.from("follows").select("follower_id").eq("following_id", userId),
      supabaseAdmin.from("follows").select("following_id").eq("follower_id", userId),
    ]);
    const followerIds = (followers ?? []).map((r: any) => r.follower_id);
    const followingIds = (following ?? []).map((r: any) => r.following_id);
    const all = Array.from(new Set([...followerIds, ...followingIds]));
    const { data: profiles } = all.length
      ? await supabaseAdmin.from("profiles").select(PROFILE_LITE).in("id", all)
      : { data: [] as any[] };
    const pmap = new Map<string, any>();
    for (const p of profiles ?? []) pmap.set(p.id, p);
    const followingSet = new Set(followingIds);
    return {
      followers: followerIds.map((id) => pmap.get(id)).filter(Boolean).map((p) => ({ ...p, i_follow: followingSet.has(p.id) })),
      following: followingIds.map((id) => pmap.get(id)).filter(Boolean),
    };
  });

export const getConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.profile_id === userId) return { status: "self" as const, is_following: false };
    const [{ data: conn }, { data: follow }] = await Promise.all([
      supabase
        .from("connections")
        .select("requester_id, addressee_id, status")
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${data.profile_id}),and(requester_id.eq.${data.profile_id},addressee_id.eq.${userId})`)
        .maybeSingle(),
      supabase.from("follows").select("follower_id").eq("follower_id", userId).eq("following_id", data.profile_id).maybeSingle(),
    ]);
    let status: "none" | "pending_out" | "pending_in" | "accepted" = "none";
    if (conn) {
      if (conn.status === "accepted") status = "accepted";
      else if (conn.requester_id === userId) status = "pending_out";
      else status = "pending_in";
    }
    return { status, is_following: !!follow };
  });

export const sendConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ addressee_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.addressee_id === context.userId) throw new Error("Cannot connect with yourself");
    const { error } = await context.supabase.from("connections").insert({ requester_id: context.userId, addressee_id: data.addressee_id, status: "pending" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    await createNotification({
      recipient_id: data.addressee_id,
      actor_id: context.userId,
      type: "connection_request",
      entity_type: "connection",
      dedupe: true,
    });
    return { ok: true };
  });

export const respondConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requester_id: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.accept) {
      const { error } = await context.supabase.from("connections").update({ status: "accepted" }).eq("requester_id", data.requester_id).eq("addressee_id", context.userId);
      if (error) throw new Error(error.message);
      await createNotification({
        recipient_id: data.requester_id,
        actor_id: context.userId,
        type: "connection_accepted",
        entity_type: "connection",
      });
    } else {
      const { error } = await context.supabase.from("connections").delete().eq("requester_id", data.requester_id).eq("addressee_id", context.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ other_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("connections")
      .delete()
      .or(`and(requester_id.eq.${context.userId},addressee_id.eq.${data.other_id}),and(requester_id.eq.${data.other_id},addressee_id.eq.${context.userId})`);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ profile_id: z.string().uuid(), follow: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.profile_id === context.userId) throw new Error("Cannot follow yourself");
    if (data.follow) {
      const { error } = await context.supabase.from("follows").insert({ follower_id: context.userId, following_id: data.profile_id });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      await createNotification({
        recipient_id: data.profile_id,
        actor_id: context.userId,
        type: "follow",
        entity_type: "profile",
        dedupe: true,
      });
    } else {
      const { error } = await context.supabase.from("follows").delete().eq("follower_id", context.userId).eq("following_id", data.profile_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });


export const getMyConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: conns, error } = await supabase
      .from("connections")
      .select("requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const accepted = (conns ?? []).filter((c) => c.status === "accepted");
    const incoming = (conns ?? []).filter((c) => c.status === "pending" && c.addressee_id === userId);
    const outgoing = (conns ?? []).filter((c) => c.status === "pending" && c.requester_id === userId);

    const otherIds = new Set<string>();
    for (const c of conns ?? []) otherIds.add(c.requester_id === userId ? c.addressee_id : c.requester_id);
    const { data: profiles } = otherIds.size
      ? await supabaseAdmin.from("profiles").select(PROFILE_LITE).in("id", Array.from(otherIds))
      : { data: [] as any[] };
    const pmap = new Map<string, any>();
    for (const p of profiles ?? []) pmap.set(p.id, p);

    const enrich = (c: any) => ({ ...c, other: pmap.get(c.requester_id === userId ? c.addressee_id : c.requester_id) });
    return {
      accepted: accepted.map(enrich),
      incoming: incoming.map(enrich),
      outgoing: outgoing.map(enrich),
    };
  });

export const getSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: conns } = await supabaseAdmin
      .from("connections")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const exclude = new Set<string>([userId]);
    for (const c of conns ?? []) {
      exclude.add(c.requester_id);
      exclude.add(c.addressee_id);
    }
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_LITE)
      .not("id", "in", `(${Array.from(exclude).map((id) => `"${id}"`).join(",")})`)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return profiles ?? [];
  });

export const searchPeople = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const term = `%${data.q.replace(/[%_]/g, "")}%`;
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_LITE)
      .or(`username.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},headline.ilike.${term}`)
      .limit(30);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type PeopleYouMayKnowItem = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  company: string | null;
  skills: string[];
  mutual_count: number;
  i_follow: boolean;
  connection_status: "none" | "pending_in";
  score: number;
};

export const getPeopleYouMayKnow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(50).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<PeopleYouMayKnowItem[]> => {
    const { userId } = context;
    const limit = data.limit ?? 12;

    const [{ data: me }, { data: conns }, { data: follows }, { data: mySkillsRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("location, company").eq("id", userId).maybeSingle(),
      supabaseAdmin
        .from("connections")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabaseAdmin.from("follows").select("following_id").eq("follower_id", userId),
      supabaseAdmin.from("skills").select("name").eq("profile_id", userId),
    ]);

    const exclude = new Set<string>([userId]);
    const myAcceptedConnIds = new Set<string>();
    const incomingPendingIds = new Set<string>();
    for (const c of (conns ?? []) as any[]) {
      const other = c.requester_id === userId ? c.addressee_id : c.requester_id;
      if (c.status === "accepted") { exclude.add(other); myAcceptedConnIds.add(other); }
      else if (c.status === "pending" && c.requester_id === userId) exclude.add(other);
      else if (c.status === "pending" && c.addressee_id === userId) incomingPendingIds.add(other);
    }
    const followingIds = new Set<string>(((follows ?? []) as any[]).map((f) => f.following_id));
    const mySkills = new Set<string>(((mySkillsRows ?? []) as any[]).map((s) => (s.name as string).toLowerCase()));

    const excludeList = Array.from(exclude).map((id) => `"${id}"`).join(",");
    const { data: candidates } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_LITE)
      .not("id", "in", `(${excludeList})`)
      .order("created_at", { ascending: false })
      .limit(60);

    const list = (candidates ?? []) as any[];
    if (list.length === 0) return [];
    const ids = list.map((p) => p.id);

    const [{ data: skillsRows }, { data: candConns }] = await Promise.all([
      supabaseAdmin.from("skills").select("profile_id, name").in("profile_id", ids),
      myAcceptedConnIds.size > 0
        ? supabaseAdmin
            .from("connections")
            .select("requester_id, addressee_id")
            .eq("status", "accepted")
            .or(
              `requester_id.in.(${ids.join(",")}),addressee_id.in.(${ids.join(",")})`,
            )
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const skillsByUser = new Map<string, string[]>();
    for (const s of (skillsRows ?? []) as any[]) {
      const arr = skillsByUser.get(s.profile_id) ?? [];
      arr.push(s.name);
      skillsByUser.set(s.profile_id, arr);
    }

    const idSet = new Set(ids);
    const mutualByUser = new Map<string, number>();
    for (const c of (candConns ?? []) as any[]) {
      const a = c.requester_id, b = c.addressee_id;
      const cand = idSet.has(a) ? a : b;
      const other = cand === a ? b : a;
      if (myAcceptedConnIds.has(other)) mutualByUser.set(cand, (mutualByUser.get(cand) ?? 0) + 1);
    }

    const myCompany = (me?.company ?? "").trim().toLowerCase();
    const myLocation = (me?.location ?? "").trim().toLowerCase();

    const enriched: PeopleYouMayKnowItem[] = list.map((p) => {
      const skills = skillsByUser.get(p.id) ?? [];
      const skillOverlap = mySkills.size
        ? skills.filter((s) => mySkills.has(s.toLowerCase())).length
        : 0;
      const mutual = mutualByUser.get(p.id) ?? 0;
      const sameCompany = myCompany && (p.company ?? "").toLowerCase() === myCompany ? 1 : 0;
      const sameLocation = myLocation && (p.location ?? "").toLowerCase() === myLocation ? 1 : 0;
      const score = mutual * 5 + skillOverlap * 3 + sameCompany * 4 + sameLocation * 2;
      return {
        id: p.id,
        username: p.username,
        first_name: p.first_name,
        last_name: p.last_name,
        headline: p.headline,
        avatar_url: p.avatar_url,
        location: p.location,
        company: p.company,
        skills,
        mutual_count: mutual,
        i_follow: followingIds.has(p.id),
        connection_status: incomingPendingIds.has(p.id) ? "pending_in" : "none",
        score,
      };
    });

    enriched.sort((a, b) => b.score - a.score);
    return enriched.slice(0, limit);
  });


import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createNotification, notifyMentions } from "./notifications.server";

const PROFILE_LITE = "id, username, first_name, last_name, headline, avatar_url";

export type FeedAuthor = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  headline: string;
  avatar_url: string | null;
};

export type FeedPost = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  author: FeedAuthor;
  reactions: { like: number; celebrate: number; support: number; insightful: number; funny: number; total: number };
  my_reaction: string | null;
  comment_count: number;
};

export const REACTION_TYPES = ["like", "celebrate", "support", "insightful", "funny"] as const;

export const getFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().min(1).max(50).default(20), cursor: z.string().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("posts")
      .select("id, content, image_url, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.cursor) q = q.lt("created_at", data.cursor);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const posts = (rows ?? []) as any[];
    const ids = posts.map((p) => p.id);
    if (ids.length === 0) return { posts: [] as FeedPost[], nextCursor: null as string | null };
    const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

    const [{ data: reactions }, { data: myReactions }, { data: comments }, { data: authors }] = await Promise.all([
      supabaseAdmin.from("reactions").select("post_id, type").in("post_id", ids),
      supabase.from("reactions").select("post_id, type").in("post_id", ids).eq("user_id", userId),
      supabaseAdmin.from("comments").select("post_id").in("post_id", ids),
      supabaseAdmin.from("profiles").select(PROFILE_LITE).in("id", authorIds),
    ]);
    const authorMap = new Map<string, FeedAuthor>();
    for (const a of (authors ?? []) as any[]) authorMap.set(a.id, a);

    const reactionMap = new Map<string, FeedPost["reactions"]>();
    for (const id of ids) reactionMap.set(id, { like: 0, celebrate: 0, support: 0, insightful: 0, funny: 0, total: 0 });
    for (const r of reactions ?? []) {
      const m = reactionMap.get(r.post_id)!;
      if ((REACTION_TYPES as readonly string[]).includes(r.type)) (m as any)[r.type] += 1;
      m.total += 1;
    }
    const myMap = new Map<string, string>();
    for (const r of myReactions ?? []) myMap.set(r.post_id, r.type as string);
    const commentMap = new Map<string, number>();
    for (const c of comments ?? []) commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1);

    const result: FeedPost[] = posts.map((p) => ({
      id: p.id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      author_id: p.author_id,
      author: authorMap.get(p.author_id)!,
      reactions: reactionMap.get(p.id)!,
      my_reaction: myMap.get(p.id) ?? null,
      comment_count: commentMap.get(p.id) ?? 0,
    }));
    return { posts: result, nextCursor: result.length === data.limit ? result[result.length - 1].created_at : null };
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ content: z.string().trim().min(1).max(3000), image_url: z.string().url().optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("posts")
      .insert({ author_id: context.userId, content: data.content, image_url: data.image_url ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyMentions({ text: data.content, actor_id: context.userId, entity_type: "post", entity_id: row.id });
    return { id: row.id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("posts").delete().eq("id", data.id).eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ post_id: z.string().uuid(), type: z.enum(REACTION_TYPES) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("reactions").select("type").eq("post_id", data.post_id).eq("user_id", userId).maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("reactions").insert({ post_id: data.post_id, user_id: userId, type: data.type });
      if (error) throw new Error(error.message);
      const { data: post } = await supabaseAdmin.from("posts").select("author_id").eq("id", data.post_id).maybeSingle();
      if (post?.author_id) {
        await createNotification({
          recipient_id: post.author_id,
          actor_id: userId,
          type: "post_like",
          entity_type: "post",
          entity_id: data.post_id,
          dedupe: true,
        });
      }
      return { reaction: data.type };
    }
    if (existing.type === data.type) {
      const { error } = await supabase.from("reactions").delete().eq("post_id", data.post_id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { reaction: null };
    }
    const { error } = await supabase.from("reactions").update({ type: data.type }).eq("post_id", data.post_id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { reaction: data.type };
  });

export const getComments = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("comments")
      .select("id, content, created_at, author_id")
      .eq("post_id", data.post_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rowsList = (rows ?? []) as any[];
    if (rowsList.length === 0) return [] as any[];
    const authorIds = Array.from(new Set(rowsList.map((r) => r.author_id)));
    const { data: authors } = await supabaseAdmin.from("profiles").select(PROFILE_LITE).in("id", authorIds);
    const amap = new Map<string, any>();
    for (const a of authors ?? []) amap.set(a.id, a);
    return rowsList.map((r) => ({ ...r, author: amap.get(r.author_id) }));
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ post_id: z.string().uuid(), content: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("comments").insert({ post_id: data.post_id, author_id: context.userId, content: data.content });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("comments").delete().eq("id", data.id).eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

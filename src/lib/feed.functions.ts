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

export type OriginalPost = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  author: FeedAuthor;
};

export type FeedPost = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  author: FeedAuthor;
  reactions: {
    like: number;
    celebrate: number;
    support: number;
    insightful: number;
    funny: number;
    total: number;
  };
  my_reaction: string | null;
  comment_count: number;
  is_saved: boolean;
  repost_count: number;
  repost_of_id: string | null;
  repost_of: OriginalPost | null;
};

export const REACTION_TYPES = [
  "like",
  "celebrate",
  "support",
  "insightful",
  "funny",
] as const;

async function enrichPosts(
  rawPosts: any[],
  userId: string,
): Promise<FeedPost[]> {
  if (rawPosts.length === 0) return [];
  const ids = rawPosts.map((p) => p.id);

  // Collect every author + every original-post-author we need
  const originalIds = Array.from(
    new Set(rawPosts.map((p) => p.repost_of_id).filter(Boolean)),
  ) as string[];

  const { data: originals } = originalIds.length
    ? await supabaseAdmin
        .from("posts")
        .select("id, content, image_url, created_at, author_id")
        .in("id", originalIds)
    : { data: [] as any[] };
  const originalMap = new Map<string, any>();
  for (const o of originals ?? []) originalMap.set(o.id, o);

  const authorIds = Array.from(
    new Set([
      ...rawPosts.map((p) => p.author_id),
      ...(originals ?? []).map((o: any) => o.author_id),
    ]),
  );

  const [
    { data: reactions },
    { data: myReactions },
    { data: comments },
    { data: authors },
    { data: reposts },
    { data: saved },
  ] = await Promise.all([
    supabaseAdmin.from("reactions").select("post_id, type").in("post_id", ids),
    userId
      ? supabaseAdmin
          .from("reactions")
          .select("post_id, type")
          .in("post_id", ids)
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin.from("comments").select("post_id").in("post_id", ids),
    supabaseAdmin.from("profiles").select(PROFILE_LITE).in("id", authorIds),
    supabaseAdmin
      .from("posts")
      .select("repost_of_id")
      .in("repost_of_id", ids),
    userId
      ? supabaseAdmin
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", ids)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const authorMap = new Map<string, FeedAuthor>();
  for (const a of (authors ?? []) as any[]) authorMap.set(a.id, a);

  const reactionMap = new Map<string, FeedPost["reactions"]>();
  for (const id of ids)
    reactionMap.set(id, {
      like: 0,
      celebrate: 0,
      support: 0,
      insightful: 0,
      funny: 0,
      total: 0,
    });
  for (const r of reactions ?? []) {
    const m = reactionMap.get(r.post_id);
    if (!m) continue;
    if ((REACTION_TYPES as readonly string[]).includes(r.type))
      (m as any)[r.type] += 1;
    m.total += 1;
  }
  const myMap = new Map<string, string>();
  for (const r of myReactions ?? []) myMap.set(r.post_id, r.type as string);
  const commentMap = new Map<string, number>();
  for (const c of comments ?? [])
    commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1);
  const repostMap = new Map<string, number>();
  for (const r of reposts ?? [])
    repostMap.set(
      r.repost_of_id,
      (repostMap.get(r.repost_of_id) ?? 0) + 1,
    );
  const savedSet = new Set<string>((saved ?? []).map((s: any) => s.post_id));

  return rawPosts.map((p) => {
    const orig = p.repost_of_id ? originalMap.get(p.repost_of_id) : null;
    return {
      id: p.id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      author_id: p.author_id,
      author: authorMap.get(p.author_id)!,
      reactions: reactionMap.get(p.id)!,
      my_reaction: myMap.get(p.id) ?? null,
      comment_count: commentMap.get(p.id) ?? 0,
      is_saved: savedSet.has(p.id),
      repost_count: repostMap.get(p.id) ?? 0,
      repost_of_id: p.repost_of_id ?? null,
      repost_of: orig
        ? {
            id: orig.id,
            content: orig.content,
            image_url: orig.image_url,
            created_at: orig.created_at,
            author_id: orig.author_id,
            author: authorMap.get(orig.author_id)!,
          }
        : null,
    };
  });
}

export const getFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullable().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let q = supabaseAdmin
      .from("posts")
      .select("id, content, image_url, created_at, author_id, repost_of_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.cursor) q = q.lt("created_at", data.cursor);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const posts = await enrichPosts(rows ?? [], userId);
    return {
      posts,
      nextCursor:
        posts.length === data.limit ? posts[posts.length - 1].created_at : null,
    };
  });

export const getPostById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("posts")
      .select("id, content, image_url, created_at, author_id, repost_of_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const [enriched] = await enrichPosts([row], context.userId);
    return enriched;
  });

export const getRelatedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: anchor } = await supabaseAdmin
      .from("posts")
      .select("author_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!anchor) return [];
    const { data: rows } = await supabaseAdmin
      .from("posts")
      .select("id, content, image_url, created_at, author_id, repost_of_id")
      .eq("author_id", anchor.author_id)
      .neq("id", data.id)
      .order("created_at", { ascending: false })
      .limit(3);
    return enrichPosts(rows ?? [], context.userId);
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        content: z.string().trim().min(1).max(3000),
        image_url: z.string().url().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("posts")
      .insert({
        author_id: context.userId,
        content: data.content,
        image_url: data.image_url ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyMentions({
      text: data.content,
      actor_id: context.userId,
      entity_type: "post",
      entity_id: row.id,
    });
    return { id: row.id };
  });

export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        content: z.string().trim().min(1).max(3000),
        image_url: z.string().url().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .update({
        content: data.content,
        image_url: data.image_url ?? null,
      })
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ post_id: z.string().uuid(), type: z.enum(REACTION_TYPES) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("reactions")
      .select("type")
      .eq("post_id", data.post_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase
        .from("reactions")
        .insert({ post_id: data.post_id, user_id: userId, type: data.type });
      if (error) throw new Error(error.message);
      const { data: post } = await supabaseAdmin
        .from("posts")
        .select("author_id")
        .eq("id", data.post_id)
        .maybeSingle();
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
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", data.post_id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { reaction: null };
    }
    const { error } = await supabase
      .from("reactions")
      .update({ type: data.type })
      .eq("post_id", data.post_id)
      .eq("user_id", userId);
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
    const { data: authors } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_LITE)
      .in("id", authorIds);
    const amap = new Map<string, any>();
    for (const a of authors ?? []) amap.set(a.id, a);
    return rowsList.map((r) => ({ ...r, author: amap.get(r.author_id) }));
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        post_id: z.string().uuid(),
        content: z.string().trim().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("comments")
      .insert({
        post_id: data.post_id,
        author_id: context.userId,
        content: data.content,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("author_id")
      .eq("id", data.post_id)
      .maybeSingle();
    if (post?.author_id) {
      await createNotification({
        recipient_id: post.author_id,
        actor_id: context.userId,
        type: "post_comment",
        entity_type: "post",
        entity_id: data.post_id,
      });
    }
    await notifyMentions({
      text: data.content,
      actor_id: context.userId,
      entity_type: "comment",
      entity_id: row.id,
      exclude: post?.author_id ? [post.author_id] : [],
    });
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("comments")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -- Save & repost --

export const toggleSavePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("saved_posts" as any)
      .select("id")
      .eq("user_id", context.userId)
      .eq("post_id", data.post_id)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("saved_posts" as any)
        .delete()
        .eq("user_id", context.userId)
        .eq("post_id", data.post_id);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await context.supabase
      .from("saved_posts" as any)
      .insert({ user_id: context.userId, post_id: data.post_id });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const getSavedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: rows, error } = await supabaseAdmin
      .from("saved_posts" as any)
      .select("post_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const postIds = (rows ?? []).map((r: any) => r.post_id);
    if (postIds.length === 0)
      return [] as Array<FeedPost & { saved_at: string }>;
    const { data: postRows } = await supabaseAdmin
      .from("posts")
      .select("id, content, image_url, created_at, author_id, repost_of_id")
      .in("id", postIds);
    const enriched = await enrichPosts(postRows ?? [], userId);
    const savedAt = new Map<string, string>();
    for (const r of rows ?? []) savedAt.set(r.post_id, r.created_at);
    return enriched
      .map((p) => ({ ...p, saved_at: savedAt.get(p.id) ?? p.created_at }))
      .sort(
        (a, b) =>
          new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime(),
      );
  });

export const createRepost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        original_post_id: z.string().uuid(),
        thoughts: z.string().trim().max(3000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: original } = await supabaseAdmin
      .from("posts")
      .select("id, author_id, repost_of_id")
      .eq("id", data.original_post_id)
      .maybeSingle();
    if (!original) throw new Error("Original post not found");
    // If reposting a repost, point to the root original
    const rootId = original.repost_of_id ?? original.id;

    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({
        author_id: context.userId,
        content: data.thoughts || "",
        image_url: null,
        repost_of_id: rootId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (original.author_id && original.author_id !== context.userId) {
      await createNotification({
        recipient_id: original.author_id,
        actor_id: context.userId,
        type: "post_repost",
        entity_type: "post",
        entity_id: rootId,
      });
    }
    if (data.thoughts) {
      await notifyMentions({
        text: data.thoughts,
        actor_id: context.userId,
        entity_type: "post",
        entity_id: row.id,
      });
    }
    return { id: row.id };
  });

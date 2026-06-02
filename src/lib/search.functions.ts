import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PROFILE_LITE =
  "id, username, first_name, last_name, headline, avatar_url, location, company";

export type SearchPerson = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  headline: string;
  avatar_url: string | null;
  location: string;
  company: string;
  skills: string[];
  connection_status: "self" | "none" | "pending_out" | "pending_in" | "accepted";
  is_following: boolean;
};

export type SearchPost = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    headline: string;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
  from_connection: boolean;
};

export type SearchProject = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  image_url: string | null;
  github_url: string | null;
  live_url: string | null;
  profile: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
};

export type SearchGroup = {
  key: string;
  count: number;
  people: Array<Pick<SearchPerson, "id" | "username" | "first_name" | "last_name" | "avatar_url" | "headline">>;
};

export const searchAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ q: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const raw = data.q.trim();
    const safe = raw.replace(/[%_,]/g, " ").trim();
    const term = `%${safe}%`;

    // 1. Profile matches via simple fields
    const orExpr = [
      `username.ilike.${term}`,
      `first_name.ilike.${term}`,
      `last_name.ilike.${term}`,
      `headline.ilike.${term}`,
      `company.ilike.${term}`,
      `location.ilike.${term}`,
    ].join(",");

    const [{ data: directProfiles }, { data: skillRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select(PROFILE_LITE).or(orExpr).limit(60),
      supabaseAdmin
        .from("skills")
        .select("profile_id, name")
        .ilike("name", term)
        .limit(120),
    ]);

    const peopleMap = new Map<string, any>();
    for (const p of directProfiles ?? []) peopleMap.set(p.id, p);

    const skillProfileIds = Array.from(
      new Set((skillRows ?? []).map((s: any) => s.profile_id)),
    ).filter((id) => !peopleMap.has(id));

    if (skillProfileIds.length) {
      const { data: skillProfiles } = await supabaseAdmin
        .from("profiles")
        .select(PROFILE_LITE)
        .in("id", skillProfileIds);
      for (const p of skillProfiles ?? []) peopleMap.set(p.id, p);
    }

    const peopleIds = Array.from(peopleMap.keys());

    // 2. All skills for matched people
    const { data: allSkills } = peopleIds.length
      ? await supabaseAdmin
          .from("skills")
          .select("profile_id, name")
          .in("profile_id", peopleIds)
      : { data: [] as any[] };
    const skillsByProfile = new Map<string, string[]>();
    for (const s of allSkills ?? []) {
      const arr = skillsByProfile.get(s.profile_id) ?? [];
      arr.push(s.name);
      skillsByProfile.set(s.profile_id, arr);
    }

    // 3. Relationships for current user
    const [{ data: connections }, { data: follows }] = await Promise.all([
      supabaseAdmin
        .from("connections")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabaseAdmin
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId),
    ]);
    const followingSet = new Set((follows ?? []).map((f: any) => f.following_id));
    const connMap = new Map<string, SearchPerson["connection_status"]>();
    const acceptedIds = new Set<string>();
    for (const c of connections ?? []) {
      const other = c.requester_id === userId ? c.addressee_id : c.requester_id;
      if (c.status === "accepted") {
        connMap.set(other, "accepted");
        acceptedIds.add(other);
      } else if (c.status === "pending") {
        connMap.set(other, c.requester_id === userId ? "pending_out" : "pending_in");
      }
    }

    const people: SearchPerson[] = peopleIds.map((id) => {
      const p = peopleMap.get(id);
      const status: SearchPerson["connection_status"] =
        id === userId ? "self" : connMap.get(id) ?? "none";
      return {
        ...p,
        skills: skillsByProfile.get(id) ?? [],
        connection_status: status,
        is_following: followingSet.has(id),
      } as SearchPerson;
    });

    // 4. Post search by content
    const { data: postRows } = await supabaseAdmin
      .from("posts")
      .select("id, content, image_url, created_at, author_id")
      .ilike("content", term)
      .order("created_at", { ascending: false })
      .limit(30);

    const postIds = (postRows ?? []).map((p: any) => p.id);
    const postAuthorIds = Array.from(
      new Set((postRows ?? []).map((p: any) => p.author_id)),
    );

    const [{ data: postAuthors }, { data: reactions }, { data: comments }] =
      postIds.length
        ? await Promise.all([
            supabaseAdmin
              .from("profiles")
              .select("id, username, first_name, last_name, headline, avatar_url")
              .in("id", postAuthorIds),
            supabaseAdmin.from("reactions").select("post_id").in("post_id", postIds),
            supabaseAdmin.from("comments").select("post_id").in("post_id", postIds),
          ])
        : [
            { data: [] as any[] },
            { data: [] as any[] },
            { data: [] as any[] },
          ];

    const authorMap = new Map<string, any>();
    for (const a of postAuthors ?? []) authorMap.set(a.id, a);
    const likeMap = new Map<string, number>();
    for (const r of reactions ?? [])
      likeMap.set(r.post_id, (likeMap.get(r.post_id) ?? 0) + 1);
    const commentMap = new Map<string, number>();
    for (const c of comments ?? [])
      commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1);

    const posts: SearchPost[] = (postRows ?? []).map((p: any) => ({
      id: p.id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      author: authorMap.get(p.author_id) ?? {
        id: p.author_id,
        username: "",
        first_name: "",
        last_name: "",
        headline: "",
        avatar_url: null,
      },
      like_count: likeMap.get(p.id) ?? 0,
      comment_count: commentMap.get(p.id) ?? 0,
      from_connection: acceptedIds.has(p.author_id),
    }));

    // 5. Project search by title / description / tech_stack
    const { data: projectRows } = await supabaseAdmin
      .from("projects")
      .select(
        "id, profile_id, title, description, tech_stack, image_url, github_url, live_url",
      )
      .or(`title.ilike.${term},description.ilike.${term}`)
      .limit(30);

    const projectAuthorIds = Array.from(
      new Set((projectRows ?? []).map((p: any) => p.profile_id)),
    ).filter((id) => !peopleMap.has(id));

    if (projectAuthorIds.length) {
      const { data: extra } = await supabaseAdmin
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url")
        .in("id", projectAuthorIds);
      for (const p of extra ?? []) {
        if (!peopleMap.has(p.id)) peopleMap.set(p.id, p);
      }
    }

    const projects: SearchProject[] = (projectRows ?? []).map((p: any) => {
      const pr = peopleMap.get(p.profile_id) ?? {};
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        tech_stack: p.tech_stack ?? [],
        image_url: p.image_url,
        github_url: p.github_url,
        live_url: p.live_url,
        profile: {
          id: p.profile_id,
          username: pr.username ?? "",
          first_name: pr.first_name ?? "",
          last_name: pr.last_name ?? "",
          avatar_url: pr.avatar_url ?? null,
        },
      };
    });

    // 6. Companies / Locations grouping (from profiles matching the term)
    const groupBy = (
      field: "company" | "location",
    ): SearchGroup[] => {
      const buckets = new Map<string, SearchPerson[]>();
      for (const p of people) {
        const raw = (p as any)[field];
        if (!raw || typeof raw !== "string") continue;
        const k = raw.trim();
        if (!k) continue;
        if (!k.toLowerCase().includes(safe.toLowerCase())) continue;
        const arr = buckets.get(k) ?? [];
        arr.push(p);
        buckets.set(k, arr);
      }
      return Array.from(buckets.entries())
        .map(([key, arr]) => ({
          key,
          count: arr.length,
          people: arr.slice(0, 5).map((p) => ({
            id: p.id,
            username: p.username,
            first_name: p.first_name,
            last_name: p.last_name,
            avatar_url: p.avatar_url,
            headline: p.headline,
          })),
        }))
        .sort((a, b) => b.count - a.count);
    };

    const companies = groupBy("company");
    const locations = groupBy("location");

    return { people, posts, projects, companies, locations };
  });

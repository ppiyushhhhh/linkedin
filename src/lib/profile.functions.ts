import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PROFILE_COLS =
  "id, username, first_name, last_name, headline, about, avatar_url, cover_url, location, website, github_url, linkedin_url, created_at";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const getProfileByUsername = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;

    const [{ data: experiences }, { data: educations }, { data: skills }, { count: followers }, { count: following }, { count: connections }] = await Promise.all([
      supabaseAdmin.from("experiences").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
      supabaseAdmin.from("educations").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false, nullsFirst: false }),
      supabaseAdmin.from("skills").select("*").eq("profile_id", profile.id).order("name"),
      supabaseAdmin.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
      supabaseAdmin.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
      supabaseAdmin.from("connections").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
    ]);

    return {
      profile,
      experiences: experiences ?? [],
      educations: educations ?? [],
      skills: skills ?? [],
      stats: { followers: followers ?? 0, following: following ?? 0, connections: connections ?? 0 },
    };
  });

const updateSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscore"),
  first_name: z.string().trim().max(60).default(""),
  last_name: z.string().trim().max(60).default(""),
  headline: z.string().trim().max(220).default(""),
  about: z.string().trim().max(2600).default(""),
  location: z.string().trim().max(120).default(""),
  website: z.string().trim().url().or(z.literal("")).optional(),
  github_url: z.string().trim().url().or(z.literal("")).optional(),
  linkedin_url: z.string().trim().url().or(z.literal("")).optional(),
  avatar_url: z.string().url().or(z.literal("")).optional(),
  cover_url: z.string().url().or(z.literal("")).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      ...data,
      website: data.website || null,
      github_url: data.github_url || null,
      linkedin_url: data.linkedin_url || null,
      avatar_url: data.avatar_url || null,
      cover_url: data.cover_url || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Experiences
const experienceSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).default(""),
  start_date: z.string().min(1),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().default(false),
  description: z.string().trim().max(2000).default(""),
});

export const upsertExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => experienceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      ...data,
      profile_id: userId,
      end_date: data.is_current ? null : data.end_date || null,
    };
    const { error } = data.id
      ? await supabase.from("experiences").update(row).eq("id", data.id).eq("profile_id", userId)
      : await supabase.from("experiences").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("experiences").delete().eq("id", data.id).eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Educations
const educationSchema = z.object({
  id: z.string().uuid().optional(),
  school: z.string().trim().min(1).max(160),
  degree: z.string().trim().max(120).default(""),
  field: z.string().trim().max(120).default(""),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  description: z.string().trim().max(2000).default(""),
});

export const upsertEducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => educationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      ...data,
      profile_id: context.userId,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    };
    const { error } = data.id
      ? await context.supabase.from("educations").update(row).eq("id", data.id).eq("profile_id", context.userId)
      : await context.supabase.from("educations").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("educations").delete().eq("id", data.id).eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Skills
export const addSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("skills").insert({ profile_id: context.userId, name: data.name });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("skills").delete().eq("id", data.id).eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

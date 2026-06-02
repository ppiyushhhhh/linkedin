import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Projects
const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  tech_stack: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  live_url: z.string().trim().url().or(z.literal("")).optional(),
  github_url: z.string().trim().url().or(z.literal("")).optional(),
  image_url: z.string().trim().url().or(z.literal("")).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export const upsertProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => projectSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      profile_id: context.userId,
      title: data.title,
      description: data.description,
      tech_stack: data.tech_stack,
      live_url: data.live_url || null,
      github_url: data.github_url || null,
      image_url: data.image_url || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    };
    const { error } = data.id
      ? await context.supabase.from("projects" as any).update(row).eq("id", data.id).eq("profile_id", context.userId)
      : await context.supabase.from("projects" as any).insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects" as any).delete().eq("id", data.id).eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Certifications
const certSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().max(160).default(""),
  issue_date: z.string().nullable().optional(),
  credential_url: z.string().trim().url().or(z.literal("")).optional(),
});

export const upsertCertification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => certSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      profile_id: context.userId,
      name: data.name,
      issuer: data.issuer,
      issue_date: data.issue_date || null,
      credential_url: data.credential_url || null,
    };
    const { error } = data.id
      ? await context.supabase.from("certifications" as any).update(row).eq("id", data.id).eq("profile_id", context.userId)
      : await context.supabase.from("certifications" as any).insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCertification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("certifications" as any).delete().eq("id", data.id).eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Read all profile extras + posts by author (public)
export const getProfileExtras = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const [{ data: projects }, { data: certifications }, { data: posts }] = await Promise.all([
      supabaseAdmin.from("projects" as any).select("*").eq("profile_id", data.profile_id).order("created_at", { ascending: false }),
      supabaseAdmin.from("certifications" as any).select("*").eq("profile_id", data.profile_id).order("issue_date", { ascending: false, nullsFirst: false }),
      supabaseAdmin.from("posts").select("id, content, image_url, created_at").eq("author_id", data.profile_id).order("created_at", { ascending: false }).limit(20),
    ]);
    return {
      projects: (projects as any[]) ?? [],
      certifications: (certifications as any[]) ?? [],
      posts: posts ?? [],
    };
  });

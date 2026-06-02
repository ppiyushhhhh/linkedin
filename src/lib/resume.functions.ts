import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ResumeData = {
  full_name: string;
  headline: string;
  email: string;
  location: string;
  website: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  about: string;
  experiences: Array<{
    id?: string;
    title: string;
    company: string;
    location?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    description?: string;
  }>;
  educations: Array<{
    id?: string;
    school: string;
    degree?: string;
    field?: string;
    start_date?: string | null;
    end_date?: string | null;
    description?: string;
  }>;
  skills: Array<{ id?: string; name: string; level?: string | null }>;
  projects: Array<{
    id?: string;
    title: string;
    description?: string;
    tech_stack?: string[];
    live_url?: string | null;
    github_url?: string | null;
  }>;
  certifications: Array<{
    id?: string;
    name: string;
    issuer?: string;
    issue_date?: string | null;
    credential_url?: string | null;
  }>;
};

export const getMyResumeData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const [{ data: profile }, { data: experiences }, { data: educations }, { data: skills }, { data: projects }, { data: certifications }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("id", userId).single(),
        supabaseAdmin.from("experiences").select("*").eq("profile_id", userId).order("start_date", { ascending: false }),
        supabaseAdmin.from("educations").select("*").eq("profile_id", userId).order("start_date", { ascending: false, nullsFirst: false }),
        supabaseAdmin.from("skills").select("*").eq("profile_id", userId).order("name"),
        supabaseAdmin.from("projects" as any).select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("certifications" as any).select("*").eq("profile_id", userId).order("issue_date", { ascending: false, nullsFirst: false }),
      ]);

    const p: any = profile ?? {};
    const data: ResumeData = {
      full_name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.username || "",
      headline: p.headline ?? "",
      email: (claims as any)?.email ?? "",
      location: p.location ?? "",
      website: p.website ?? "",
      github_url: p.github_url ?? "",
      linkedin_url: p.linkedin_url ?? "",
      portfolio_url: p.portfolio_url ?? "",
      about: p.about ?? "",
      experiences: (experiences as any[]) ?? [],
      educations: (educations as any[]) ?? [],
      skills: (skills as any[]) ?? [],
      projects: (projects as any[]) ?? [],
      certifications: (certifications as any[]) ?? [],
    };
    return data;
  });

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  template_name: z.string().min(1).max(60),
  title: z.string().trim().max(160).nullable().optional(),
  summary: z.string().trim().max(4000).nullable().optional(),
  resume_data: z.any(),
});

export const saveResumeDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => draftSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      template_name: data.template_name,
      title: data.title ?? null,
      summary: data.summary ?? null,
      resume_data: data.resume_data,
    };
    if (data.id) {
      const { error } = await context.supabase.from("resume_drafts" as any).update(row).eq("id", data.id).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase.from("resume_drafts" as any).insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id as string };
  });

export const getMyLatestDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("resume_drafts" as any)
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as any) ?? null;
  });

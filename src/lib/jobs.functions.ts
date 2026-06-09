import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createNotification } from "./notifications.server";

const jobInputSchema = z.object({
  title: z.string().trim().min(2).max(150),
  company_name: z.string().trim().min(1).max(150),
  company_logo_url: z.string().url().max(500).nullable().optional(),
  location: z.string().trim().max(150).default(""),
  workplace_type: z.enum(["Remote", "On-site", "Hybrid"]).default("On-site"),
  job_type: z
    .enum(["Full-time", "Part-time", "Internship", "Contract", "Freelance"])
    .default("Full-time"),
  experience_level: z
    .enum(["Fresher", "Junior", "Mid-level", "Senior"])
    .default("Mid-level"),
  salary_min: z.number().int().min(0).max(100_000_000).nullable().optional(),
  salary_max: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().trim().max(8).default("INR"),
  description: z.string().trim().min(10).max(10_000),
  responsibilities: z.string().trim().max(10_000).nullable().optional(),
  requirements: z.string().trim().max(10_000).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  application_email: z.string().email().max(255).nullable().optional(),
  external_apply_link: z.string().url().max(500).nullable().optional(),
});

const filtersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  workplace_type: z.string().optional(),
  job_type: z.string().optional(),
  experience_level: z.string().optional(),
  location: z.string().trim().max(150).optional(),
  salary_min: z.number().int().min(0).optional(),
  posted_within_days: z.number().int().min(1).max(365).optional(),
  sort: z.enum(["recent", "salary_high"]).default("recent"),
  limit: z.number().int().min(1).max(100).default(50),
}).partial();

export const listJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => filtersSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .limit(data.limit ?? 50);

    if (data.q) {
      const term = `%${data.q}%`;
      q = q.or(
        `title.ilike.${term},company_name.ilike.${term},location.ilike.${term},description.ilike.${term}`,
      );
    }
    if (data.workplace_type) q = q.eq("workplace_type", data.workplace_type);
    if (data.job_type) q = q.eq("job_type", data.job_type);
    if (data.experience_level) q = q.eq("experience_level", data.experience_level);
    if (data.location) q = q.ilike("location", `%${data.location}%`);
    if (data.salary_min) q = q.gte("salary_max", data.salary_min);
    if (data.posted_within_days) {
      const since = new Date(Date.now() - data.posted_within_days * 86400_000).toISOString();
      q = q.gte("created_at", since);
    }
    if (data.sort === "salary_high") {
      q = q.order("salary_max", { ascending: false, nullsFirst: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getJobById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) return null;

    const { data: poster } = await supabaseAdmin
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url, headline")
      .eq("id", job.posted_by)
      .maybeSingle();

    return { ...job, poster };
  });

export const getSimilarJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: base } = await supabaseAdmin
      .from("jobs")
      .select("job_type, experience_level, location")
      .eq("id", data.id)
      .maybeSingle();
    if (!base) return [];
    const { data: rows } = await supabaseAdmin
      .from("jobs")
      .select("id, title, company_name, location, workplace_type, job_type, created_at")
      .neq("id", data.id)
      .eq("is_active", true)
      .or(
        `job_type.eq.${base.job_type},experience_level.eq.${base.experience_level}`,
      )
      .order("created_at", { ascending: false })
      .limit(5);
    return rows ?? [];
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => jobInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("jobs")
      .insert({ ...data, posted_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    jobInputSchema.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("jobs").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleSaveJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("saved_jobs")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", data.job_id)
      .maybeSingle();
    if (existing) {
      await supabase.from("saved_jobs").delete().eq("id", existing.id);
      return { saved: false };
    }
    await supabase.from("saved_jobs").insert({ user_id: userId, job_id: data.job_id });
    return { saved: true };
  });

export const getSavedJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: saved } = await supabase
      .from("saved_jobs")
      .select("job_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!saved?.length) return [];
    const ids = saved.map((s) => s.job_id);
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .in("id", ids);
    const byId = new Map((jobs ?? []).map((j) => [j.id, j]));
    return saved
      .map((s) => {
        const j = byId.get(s.job_id);
        return j ? { ...j, saved_at: s.created_at } : null;
      })
      .filter(Boolean);
  });

export const getMyJobsAndSavedIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [savedRes, appliedRes] = await Promise.all([
      supabase.from("saved_jobs").select("job_id").eq("user_id", userId),
      supabase.from("job_applications").select("job_id").eq("applicant_id", userId),
    ]);
    return {
      saved: (savedRes.data ?? []).map((r) => r.job_id),
      applied: (appliedRes.data ?? []).map((r) => r.job_id),
    };
  });

export const applyToJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        job_id: z.string().uuid(),
        cover_note: z.string().trim().max(5000).optional(),
        resume_url: z.string().url().max(500).optional().or(z.literal("")),
        portfolio_url: z.string().url().max(500).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", data.job_id)
      .eq("applicant_id", userId)
      .maybeSingle();
    if (existing) throw new Error("You have already applied to this job.");

    const { error } = await supabase.from("job_applications").insert({
      job_id: data.job_id,
      applicant_id: userId,
      cover_note: data.cover_note || null,
      resume_url: data.resume_url || null,
      portfolio_url: data.portfolio_url || null,
    });
    if (error) throw new Error(error.message);

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("posted_by, title")
      .eq("id", data.job_id)
      .maybeSingle();
    if (job?.posted_by) {
      await createNotification({
        recipient_id: job.posted_by,
        actor_id: userId,
        type: "post_comment", // reuse existing type to avoid schema change
        entity_type: "job",
        entity_id: data.job_id,
        message: `applied to your job: ${job.title}`,
      });
    }
    return { ok: true };
  });

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: apps } = await supabase
      .from("job_applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false });
    if (!apps?.length) return [];
    const ids = Array.from(new Set(apps.map((a) => a.job_id)));
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id, title, company_name, location, workplace_type, job_type")
      .in("id", ids);
    const byId = new Map((jobs ?? []).map((j) => [j.id, j]));
    return apps.map((a) => ({ ...a, job: byId.get(a.job_id) ?? null }));
  });

export const getApplicationsForMyJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verify ownership
    const { data: job } = await supabase
      .from("jobs")
      .select("posted_by")
      .eq("id", data.job_id)
      .maybeSingle();
    if (!job || job.posted_by !== userId) throw new Error("Not authorized.");
    const { data: apps } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_id", data.job_id)
      .order("created_at", { ascending: false });
    if (!apps?.length) return [];
    const ids = Array.from(new Set(apps.map((a) => a.applicant_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url, headline")
      .in("id", ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return apps.map((a) => ({ ...a, applicant: byId.get(a.applicant_id) ?? null }));
  });

export const getMyPostedJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("posted_by", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

import type { ResumeData } from "@/lib/resume.functions";
import { Mail, MapPin, Globe, Github, Linkedin, Link as LinkIcon } from "lucide-react";

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function dateRange(start?: string | null, end?: string | null, current?: boolean) {
  const s = fmtDate(start);
  const e = current ? "Present" : fmtDate(end);
  if (!s && !e) return "";
  return [s, e].filter(Boolean).join(" – ");
}

type Props = { data: ResumeData };

/* ===== Template 1: Modern Professional ===== */
export function ModernTemplate({ data }: Props) {
  return (
    <div className="resume-doc font-sans text-[#1a1a1a]" style={{ fontFamily: "Inter, Arial, sans-serif" }}>
      <header className="border-b-4 border-[#0a66c2] pb-4">
        <h1 className="text-3xl font-bold tracking-tight">{data.full_name || "Your Name"}</h1>
        {data.headline && <p className="mt-1 text-base text-[#0a66c2]">{data.headline}</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#444]">
          {data.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{data.email}</span>}
          {data.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{data.location}</span>}
          {data.website && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{data.website}</span>}
          {data.linkedin_url && <span className="inline-flex items-center gap-1"><Linkedin className="h-3 w-3" />{data.linkedin_url}</span>}
          {data.github_url && <span className="inline-flex items-center gap-1"><Github className="h-3 w-3" />{data.github_url}</span>}
          {data.portfolio_url && <span className="inline-flex items-center gap-1"><LinkIcon className="h-3 w-3" />{data.portfolio_url}</span>}
        </div>
      </header>

      {data.about && (
        <Section title="Summary">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.about}</p>
        </Section>
      )}

      {data.experiences.length > 0 && (
        <Section title="Experience">
          {data.experiences.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{e.title} <span className="font-normal text-[#444]">· {e.company}</span></p>
                <p className="text-xs text-[#666]">{dateRange(e.start_date, e.end_date, e.is_current)}</p>
              </div>
              {e.location && <p className="text-xs text-[#666]">{e.location}</p>}
              {e.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-snug">{e.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {data.projects.length > 0 && (
        <Section title="Projects">
          {data.projects.map((p, i) => (
            <div key={i} className="mb-3">
              <p className="text-sm font-semibold">{p.title}</p>
              {p.description && <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug">{p.description}</p>}
              {p.tech_stack && p.tech_stack.length > 0 && (
                <p className="mt-0.5 text-xs text-[#666]">Tech: {p.tech_stack.join(", ")}</p>
              )}
              <p className="text-xs text-[#0a66c2]">
                {p.live_url && <span>{p.live_url}</span>}
                {p.live_url && p.github_url && " · "}
                {p.github_url && <span>{p.github_url}</span>}
              </p>
            </div>
          ))}
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills">
          <p className="text-sm">{data.skills.map((s) => s.name).join(" • ")}</p>
        </Section>
      )}

      {data.educations.length > 0 && (
        <Section title="Education">
          {data.educations.map((ed, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{ed.school}</p>
                <p className="text-xs text-[#666]">{dateRange(ed.start_date, ed.end_date)}</p>
              </div>
              <p className="text-xs text-[#444]">{[ed.degree, ed.field].filter(Boolean).join(", ")}</p>
            </div>
          ))}
        </Section>
      )}

      {data.certifications.length > 0 && (
        <Section title="Certifications">
          {data.certifications.map((c, i) => (
            <div key={i} className="mb-1.5 text-sm">
              <span className="font-semibold">{c.name}</span>
              {c.issuer && <span className="text-[#444]"> · {c.issuer}</span>}
              {c.issue_date && <span className="text-[#666]"> · {fmtDate(c.issue_date)}</span>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

/* ===== Template 2: Minimal ATS-Friendly ===== */
export function MinimalTemplate({ data }: Props) {
  return (
    <div className="resume-doc text-black" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <header className="text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider">{data.full_name || "Your Name"}</h1>
        {data.headline && <p className="text-sm">{data.headline}</p>}
        <p className="mt-1 text-xs">
          {[data.email, data.location, data.website, data.linkedin_url, data.github_url].filter(Boolean).join(" | ")}
        </p>
      </header>
      <hr className="my-3 border-black" />

      {data.about && (
        <MinSection title="SUMMARY"><p className="text-sm leading-snug">{data.about}</p></MinSection>
      )}

      {data.experiences.length > 0 && (
        <MinSection title="EXPERIENCE">
          {data.experiences.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{e.title}, {e.company}</span>
                <span>{dateRange(e.start_date, e.end_date, e.is_current)}</span>
              </div>
              {e.description && (
                <ul className="ml-5 list-disc text-sm leading-snug">
                  {e.description.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line.replace(/^[-•]\s*/, "")}</li>)}
                </ul>
              )}
            </div>
          ))}
        </MinSection>
      )}

      {data.educations.length > 0 && (
        <MinSection title="EDUCATION">
          {data.educations.map((ed, i) => (
            <div key={i} className="mb-1 flex justify-between text-sm">
              <span><span className="font-bold">{ed.school}</span>{ed.degree ? ` — ${ed.degree}${ed.field ? `, ${ed.field}` : ""}` : ""}</span>
              <span>{dateRange(ed.start_date, ed.end_date)}</span>
            </div>
          ))}
        </MinSection>
      )}

      {data.skills.length > 0 && (
        <MinSection title="SKILLS"><p className="text-sm">{data.skills.map((s) => s.name).join(", ")}</p></MinSection>
      )}

      {data.projects.length > 0 && (
        <MinSection title="PROJECTS">
          {data.projects.map((p, i) => (
            <div key={i} className="mb-1 text-sm">
              <span className="font-bold">{p.title}.</span>{" "}
              {p.description}
              {p.tech_stack && p.tech_stack.length > 0 && <span> ({p.tech_stack.join(", ")})</span>}
            </div>
          ))}
        </MinSection>
      )}

      {data.certifications.length > 0 && (
        <MinSection title="CERTIFICATIONS">
          {data.certifications.map((c, i) => (
            <div key={i} className="text-sm">
              {c.name}{c.issuer ? `, ${c.issuer}` : ""}{c.issue_date ? ` (${fmtDate(c.issue_date)})` : ""}
            </div>
          ))}
        </MinSection>
      )}
    </div>
  );
}

/* ===== Template 3: Developer Portfolio ===== */
export function DeveloperTemplate({ data }: Props) {
  return (
    <div className="resume-doc text-[#111]" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      <header className="rounded-md bg-[#0f172a] px-5 py-4 text-white">
        <h1 className="text-2xl font-bold">{data.full_name || "Your Name"}</h1>
        {data.headline && <p className="mt-0.5 text-sm text-[#94a3b8]">{data.headline}</p>}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#cbd5e1]">
          {data.email && <span>✉ {data.email}</span>}
          {data.location && <span>📍 {data.location}</span>}
          {data.github_url && <span>github: {data.github_url}</span>}
          {data.portfolio_url && <span>portfolio: {data.portfolio_url}</span>}
          {data.linkedin_url && <span>linkedin: {data.linkedin_url}</span>}
          {data.website && <span>web: {data.website}</span>}
        </div>
      </header>

      {data.about && (
        <DevSection title="// about"><p className="text-sm leading-relaxed">{data.about}</p></DevSection>
      )}

      {data.skills.length > 0 && (
        <DevSection title="// skills">
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s, i) => (
              <span key={i} className="rounded-md border border-[#0f172a] bg-[#f1f5f9] px-2 py-0.5 text-xs">{s.name}</span>
            ))}
          </div>
        </DevSection>
      )}

      {data.projects.length > 0 && (
        <DevSection title="// projects">
          {data.projects.map((p, i) => (
            <div key={i} className="mb-3">
              <p className="text-sm font-bold">{p.title}</p>
              {p.description && <p className="mt-0.5 text-sm leading-snug">{p.description}</p>}
              {p.tech_stack && p.tech_stack.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.tech_stack.map((t, j) => (
                    <span key={j} className="rounded bg-[#e0e7ff] px-1.5 py-0.5 text-[10px] text-[#3730a3]">{t}</span>
                  ))}
                </div>
              )}
              <p className="mt-0.5 text-xs text-[#0a66c2]">
                {[p.github_url, p.live_url].filter(Boolean).join("  ·  ")}
              </p>
            </div>
          ))}
        </DevSection>
      )}

      {data.experiences.length > 0 && (
        <DevSection title="// experience">
          {data.experiences.map((e, i) => (
            <div key={i} className="mb-2">
              <p className="text-sm font-semibold">
                {e.title} @ {e.company}
                <span className="float-right text-xs font-normal text-[#666]">{dateRange(e.start_date, e.end_date, e.is_current)}</span>
              </p>
              {e.description && <p className="text-sm leading-snug">{e.description}</p>}
            </div>
          ))}
        </DevSection>
      )}

      {data.educations.length > 0 && (
        <DevSection title="// education">
          {data.educations.map((ed, i) => (
            <p key={i} className="text-sm">
              <span className="font-semibold">{ed.school}</span>
              {ed.degree && <span> — {ed.degree}{ed.field ? `, ${ed.field}` : ""}</span>}
              <span className="text-xs text-[#666]"> · {dateRange(ed.start_date, ed.end_date)}</span>
            </p>
          ))}
        </DevSection>
      )}

      {data.certifications.length > 0 && (
        <DevSection title="// certifications">
          {data.certifications.map((c, i) => (
            <p key={i} className="text-sm">{c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.issue_date ? ` (${fmtDate(c.issue_date)})` : ""}</p>
          ))}
        </DevSection>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 text-xs font-bold uppercase tracking-widest text-[#0a66c2]">{title}</h2>
      {children}
    </section>
  );
}
function MinSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <h2 className="mb-1 border-b border-black pb-0.5 text-sm font-bold tracking-wide">{title}</h2>
      {children}
    </section>
  );
}
function DevSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 text-sm font-bold text-[#0f172a]">{title}</h2>
      {children}
    </section>
  );
}

export const TEMPLATES = [
  { id: "modern", name: "Modern Professional", Component: ModernTemplate },
  { id: "minimal", name: "Minimal ATS-Friendly", Component: MinimalTemplate },
  { id: "developer", name: "Developer Portfolio", Component: DeveloperTemplate },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

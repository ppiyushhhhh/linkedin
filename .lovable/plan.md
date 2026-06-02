# LinkUp World — Upgrade Plan

Your request is large (~15 features across navigation, profile, feed, network, search, notifications, settings, DB). To ship quality, I'll split into 3 phases. **Phase 1 below is what I'll build now** — confirm or re-order.

## Phase 1 — Navigation + Profile polish + Accept-request bug fix (this turn)

**Navigation**
- Rebrand to "LinkUp World" everywhere (header, login, signup, meta).
- Top navbar (desktop): Logo → /feed, Home, My Network, Post (opens composer), Notifications, Search, Profile dropdown (View profile / Settings / Logout). Active route highlighted.
- Mobile: collapse top nav + add bottom tab bar (Home, Network, Post, Notifications, Profile).
- Add Back button on `/u/:username`, `/settings`, `/network`, `/post/:id` (uses `history.back()` → fallback `/feed`).
- Logo + Home both go to `/feed`. After login → `/feed` (already done).

**Profile page (`/u/$username`)**
- Polished LinkedIn-style layout: cover banner (edit own), avatar (edit own), name, @username, headline, location, website/links row, counts (connections / followers / following).
- Sections: About, Experience, Education, Skills, **Projects (new)**, **Certifications (new)**, **Posts by user (new)**.
- Own profile buttons: Edit profile, Add experience/education/skill/project/certificate.
- Other profile: Connect / Follow / Message (UI only) / already-connected states.

**Bug fix — Accept incoming request**
- Currently `Accept` calls `sendConnectionRequest` which inserts a new row. Fix: when `status === "pending_in"`, call a new `acceptConnectionRequest` server fn that updates the existing row to `accepted`.

**DB additions (migration)**
- `projects` table (title, description, tech_stack[], live_url, github_url, profile_id)
- `certifications` table (name, issuer, issue_date, credential_url, profile_id)
- `notifications` table (recipient_id, actor_id, type, entity_id, read_at)
- `saved_posts` table (user_id, post_id)
- All with GRANTs + RLS scoped to owner.

## Phase 2 — Feed, Composer, Posts, Notifications (next turn)

- Feed page redesign: 3-col desktop (mini profile / feed / suggestions), single-col mobile.
- PostComposer modal: text + image upload to `post-media` bucket, jpg/png/webp ≤5MB validation, preview, disabled-while-uploading.
- PostCard: edit/delete own, reactions, inline comments, share/save UI stubs, skeleton loader, empty state.
- Notifications: triggers (DB) to create notification rows on like/comment/connect/follow/accept. Dropdown in navbar + `/notifications` page with mark-read / mark-all-read.
- `/post/$id` detail route.

## Phase 3 — Network, Search, Settings polish (final turn)

- `/network`: tabs for Incoming / Sent / Connections / Suggestions / Followers / Following with all action buttons.
- `/search`: filters (name, headline, company, location, skill), card grid with Connect/Follow.
- `/settings`: tabs (Account / Profile / Privacy / Notifications / Security / Delete). Privacy fields → new columns on `profiles`.

## Technical notes
- Reuses existing Supabase tables; only additive migrations.
- All new server fns use `requireSupabaseAuth`; admin client only for cross-user reads.
- Uses semantic tokens in `src/styles.css` (LinkedIn-blue palette already in place).
- Image uploads via existing `avatars` / `post-media` public buckets.
- No removal of existing auth/routes/DB.

---

**Reply "go" to start Phase 1**, or tell me to re-prioritize (e.g. "do feed first" or "ship everything in one shot — I'll wait").

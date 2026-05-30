
# ConnectSphere — v1 plan (Core social MVP)

A LinkedIn-style professional network. v1 ships the core social loop end-to-end; messaging, jobs, companies, notifications-fanout, premium, learning, events, admin land in later iterations.

## What's in v1

1. **Auth**
   - Email/password + Google OAuth (via Lovable broker)
   - Protected routes via `_authenticated` layout + session hydration gate
   - Logout, session persistence

2. **Profile**
   - Avatar + cover banner upload (Lovable Cloud Storage)
   - Headline, about, location, contact links (website, GitHub, LinkedIn)
   - Experience, Education, Skills (full CRUD)
   - Public profile page at `/u/$username` (SSR-friendly, server fn with admin client + safe column projection)
   - Edit own profile

3. **Feed**
   - Create post: text + optional image
   - Personalized feed: posts from self + connections + followed users, newest first, infinite scroll
   - Reactions (like / celebrate / support / insightful / funny)
   - Comments with one level of replies, edit/delete own
   - Edit/delete own post
   - Post detail page `/post/$id`

4. **Network**
   - Send / accept / reject / withdraw connection request
   - Remove connection
   - Follow / unfollow (separate from connections)
   - "People you may know" suggestions (mutual-connection based)
   - Connections list, pending requests inbox

5. **Search**
   - Global search bar: users (by name / headline / skills) and posts (by content)
   - Results page with tabs

6. **UI shell**
   - 3-column layout (left: profile card + nav, center: feed/page, right: suggestions/trending)
   - Mobile: bottom nav + single column
   - Light + dark mode
   - Skeletons, toasts, Framer Motion transitions
   - LinkedIn-familiar blue/white palette

## Stack

- **Frontend**: TanStack Start (React 19, Vite, TS), Tailwind v4, ShadCN, TanStack Query, Zustand (UI state only), React Hook Form + Zod, Framer Motion
- **Backend**: `createServerFn` handlers in the same app (no separate Express server)
- **DB / Auth / Storage**: Lovable Cloud (Postgres + RLS, Auth, Storage buckets)
- **Realtime** (for later iterations): Lovable Cloud Realtime

## Database schema (v1 migration)

Tables, all with RLS + proper GRANTs:

- `profiles` (id → auth.users, username unique, first/last name, headline, about, avatar_url, cover_url, location, website, github_url, linkedin_url)
- `experiences` (profile_id, title, company, location, start/end dates, current, description)
- `educations` (profile_id, school, degree, field, start/end dates, description)
- `skills` (profile_id, name) — unique per profile
- `posts` (id, author_id, content, image_url, created_at, updated_at)
- `reactions` (post_id, user_id, type enum) — unique (post_id, user_id)
- `comments` (id, post_id, author_id, parent_comment_id nullable, content, created_at)
- `connections` (requester_id, addressee_id, status enum: pending/accepted/rejected, created_at) — unique pair
- `follows` (follower_id, following_id) — unique pair

Indexes on FK columns + `posts.created_at desc`, `posts.author_id`, trigram index for search on profiles/posts.

DB trigger to auto-create a `profiles` row on `auth.users` insert.

## Storage

Two public buckets: `avatars`, `post-media`. RLS on `storage.objects` so users only write to their own folder.

## Routing

```
/                          public landing → redirects to /feed if signed in
/login, /signup, /reset-password
/_authenticated/
  feed                     personalized feed
  network                  requests + suggestions
  network.connections      my connections
  search                   ?q=... with tabs
  settings                 account
  me                       my profile (editor)
  post.$id                 post detail
u.$username                public profile (SSR, no auth required)
```

## Out of scope for v1 (explicit)

Messaging, Jobs, Companies, Notifications system, Premium/Stripe, Learning, Events, News, Creator mode, Admin dashboard, Docker/Nginx/GitHub Actions, separate Express backend, Cloudinary, standalone Socket.io. These are real follow-ups, not cut features — each will get its own scoped iteration.

---

## Technical notes

- All user-scoped reads/writes go through `createServerFn` with `requireSupabaseAuth`; public profile + public feed views go through server fns using `supabaseAdmin` with explicit safe-column projection (no broad anon RLS policies).
- Feed query uses a single SQL with `UNION` of self + accepted connections + follows, paginated by `(created_at, id)` cursor.
- Reactions/comments aggregated server-side and returned with each post page.
- `onAuthStateChange` listener at root invalidates queries + router on sign-in/out.
- Search: Postgres `pg_trgm` + `ILIKE` with GIN indexes on `profiles.first_name||last_name||headline` and `posts.content`.
- No mock data: a small seed script creates 1 demo user with sample posts so the empty state isn't jarring on first login (optional, can skip).

## Delivery

Single iteration, but I'll build in this order so the app is usable at each checkpoint:
1. Migration + storage + auth pages + protected shell
2. Profile (view + edit + sections)
3. Feed (create + list + reactions + comments)
4. Network (connections + follows + suggestions)
5. Search + polish (dark mode, mobile nav, skeletons)

After v1 lands and you've used it, pick the next module (Messaging or Jobs/Companies are the natural next steps) and we scope that as its own plan.

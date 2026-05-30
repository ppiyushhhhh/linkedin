
-- Extensions
create extension if not exists pg_trgm;

-- Enums
create type public.reaction_type as enum ('like','celebrate','support','insightful','funny');
create type public.connection_status as enum ('pending','accepted','rejected');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  first_name text not null default '',
  last_name text not null default '',
  headline text not null default '',
  about text not null default '',
  avatar_url text,
  cover_url text,
  location text not null default '',
  website text,
  github_url text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_search_idx on public.profiles using gin ((coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(headline,'')) gin_trgm_ops);

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles update self" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);

-- experiences
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null,
  location text default '',
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  description text default '',
  created_at timestamptz not null default now()
);
create index experiences_profile_idx on public.experiences(profile_id);
grant select, insert, update, delete on public.experiences to authenticated;
grant select on public.experiences to anon;
grant all on public.experiences to service_role;
alter table public.experiences enable row level security;
create policy "experiences read all" on public.experiences for select using (true);
create policy "experiences write own" on public.experiences for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- educations
create table public.educations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  school text not null,
  degree text default '',
  field text default '',
  start_date date,
  end_date date,
  description text default '',
  created_at timestamptz not null default now()
);
create index educations_profile_idx on public.educations(profile_id);
grant select, insert, update, delete on public.educations to authenticated;
grant select on public.educations to anon;
grant all on public.educations to service_role;
alter table public.educations enable row level security;
create policy "educations read all" on public.educations for select using (true);
create policy "educations write own" on public.educations for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- skills
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, name)
);
create index skills_profile_idx on public.skills(profile_id);
grant select, insert, update, delete on public.skills to authenticated;
grant select on public.skills to anon;
grant all on public.skills to service_role;
alter table public.skills enable row level security;
create policy "skills read all" on public.skills for select using (true);
create policy "skills write own" on public.skills for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_created_idx on public.posts(created_at desc);
create index posts_author_idx on public.posts(author_id);
create index posts_content_idx on public.posts using gin (content gin_trgm_ops);
grant select, insert, update, delete on public.posts to authenticated;
grant select on public.posts to anon;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts read all" on public.posts for select using (true);
create policy "posts insert own" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts update own" on public.posts for update using (auth.uid() = author_id);
create policy "posts delete own" on public.posts for delete using (auth.uid() = author_id);

-- reactions
create table public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index reactions_post_idx on public.reactions(post_id);
grant select, insert, update, delete on public.reactions to authenticated;
grant select on public.reactions to anon;
grant all on public.reactions to service_role;
alter table public.reactions enable row level security;
create policy "reactions read all" on public.reactions for select using (true);
create policy "reactions write own" on public.reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id);
create index comments_parent_idx on public.comments(parent_comment_id);
grant select, insert, update, delete on public.comments to authenticated;
grant select on public.comments to anon;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments read all" on public.comments for select using (true);
create policy "comments insert own" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments update own" on public.comments for update using (auth.uid() = author_id);
create policy "comments delete own" on public.comments for delete using (auth.uid() = author_id);

-- connections
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index connections_requester_idx on public.connections(requester_id);
create index connections_addressee_idx on public.connections(addressee_id);
grant select, insert, update, delete on public.connections to authenticated;
grant all on public.connections to service_role;
alter table public.connections enable row level security;
create policy "connections read involved" on public.connections for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections insert as requester" on public.connections for insert with check (auth.uid() = requester_id);
create policy "connections update involved" on public.connections for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections delete involved" on public.connections for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- follows
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows(following_id);
grant select, insert, update, delete on public.follows to authenticated;
grant select on public.follows to anon;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows read all" on public.follows for select using (true);
create policy "follows insert self" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows delete self" on public.follows for delete using (auth.uid() = follower_id);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
create trigger comments_updated before update on public.comments for each row execute function public.set_updated_at();
create trigger connections_updated before update on public.connections for each row execute function public.set_updated_at();

-- auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  i int := 0;
begin
  base_username := coalesce(
    nullif(regexp_replace(lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1))), '[^a-z0-9_]', '', 'g'), ''),
    'user'
  );
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    i := i + 1;
    final_username := base_username || i::text;
  end loop;
  insert into public.profiles (id, username, first_name, last_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.raw_user_meta_data->>'full_name',''), ' ', 1), ''),
    coalesce(new.raw_user_meta_data->>'last_name',  nullif(substr(coalesce(new.raw_user_meta_data->>'full_name',''), strpos(coalesce(new.raw_user_meta_data->>'full_name','') || ' ', ' ')+1), ''), ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Storage buckets
insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('post-media','post-media',true) on conflict do nothing;

create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars user write" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars user update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars user delete" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "post-media public read" on storage.objects for select using (bucket_id = 'post-media');
create policy "post-media user write" on storage.objects for insert with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "post-media user update" on storage.objects for update using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "post-media user delete" on storage.objects for delete using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

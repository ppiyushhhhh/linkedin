
-- handle_new_user already has search_path set; revoke public execute (only triggers should call it)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Replace public bucket SELECT policies with owner-scoped listing
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "post-media public read" on storage.objects;

-- Only owners can LIST/SELECT via API (public URLs still work because buckets are public)
create policy "avatars owner list" on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "post-media owner list" on storage.objects for select
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- FitConnect OS Product Media Storage
-- Run this file once in Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public storefront may read product images.
drop policy if exists "public reads product media" on storage.objects;
create policy "public reads product media"
on storage.objects
for select
to public
using (bucket_id = 'product-media');

-- Only authenticated FitConnect admins may upload product images.
drop policy if exists "admins upload product media" on storage.objects;
create policy "admins upload product media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-media'
  and public.is_admin()
);

-- Only authenticated FitConnect admins may replace product images.
drop policy if exists "admins update product media" on storage.objects;
create policy "admins update product media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-media'
  and public.is_admin()
)
with check (
  bucket_id = 'product-media'
  and public.is_admin()
);

-- Only authenticated FitConnect admins may delete product images.
drop policy if exists "admins delete product media" on storage.objects;
create policy "admins delete product media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-media'
  and public.is_admin()
);

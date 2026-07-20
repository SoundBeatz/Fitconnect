-- FitConnect product media storage
-- Public reads are intentional: product images are displayed in the public shop.
-- Writes remain restricted to authenticated FitConnect administrators.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-media',
  'product-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product media" on storage.objects;
create policy "Public can view product media"
on storage.objects for select
to public
using (bucket_id = 'product-media');

drop policy if exists "Admins can upload product media" on storage.objects;
create policy "Admins can upload product media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update product media" on storage.objects;
create policy "Admins can update product media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete product media" on storage.objects;
create policy "Admins can delete product media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "admin inserts profiles" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "customers create own customer profile"
on public.profiles for insert to authenticated
with check ((select auth.uid())=id and role='customer');

create policy "users update safe own profile"
on public.profiles for update to authenticated
using ((select auth.uid())=id or public.is_admin())
with check (((select auth.uid())=id and role=(select p.role from public.profiles p where p.id=(select auth.uid()))) or public.is_admin());

create policy "admin inserts profiles"
on public.profiles for insert to authenticated
with check (public.is_admin());

-- Bootstrap the first administrator only after creating that user in Authentication > Users.
-- Replace the email below, then run once:
-- insert into public.profiles (id,full_name,role)
-- select id,'Paul Roelofs','admin' from auth.users where email='YOUR_ADMIN_EMAIL'
-- on conflict (id) do update set full_name=excluded.full_name, role='admin';
-- Commerce combination deals: tenant-safe bundles with server-authoritative pricing.
create table if not exists public.commerce_bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  name text not null,
  slug text not null,
  short_description text not null default '',
  description text not null default '',
  image_url text,
  bundle_price numeric(14,2) not null check (bundle_price > 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  allow_discount_codes boolean not null default false,
  featured boolean not null default false,
  display_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.commerce_bundle_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  bundle_id uuid not null references public.commerce_bundles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1 check (quantity between 1 and 99),
  position integer not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (bundle_id, product_id)
);

create index if not exists commerce_bundles_public_idx
  on public.commerce_bundles (status, featured desc, display_order, created_at desc);
create index if not exists commerce_bundle_items_bundle_idx
  on public.commerce_bundle_items (bundle_id, position);

alter table public.commerce_bundles enable row level security;
alter table public.commerce_bundle_items enable row level security;

drop policy if exists commerce_bundles_public_read on public.commerce_bundles;
create policy commerce_bundles_public_read on public.commerce_bundles
  for select to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists commerce_bundles_admin_write on public.commerce_bundles;
create policy commerce_bundles_admin_write on public.commerce_bundles
  for all to authenticated
  using (public.command_center_is_admin() and public.commerce_is_member(organization_id))
  with check (public.command_center_is_admin() and public.commerce_is_member(organization_id));

drop policy if exists commerce_bundle_items_public_read on public.commerce_bundle_items;
create policy commerce_bundle_items_public_read on public.commerce_bundle_items
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.commerce_bundles bundle
      where bundle.id = bundle_id
        and bundle.status = 'active'
        and (bundle.starts_at is null or bundle.starts_at <= now())
        and (bundle.ends_at is null or bundle.ends_at > now())
    )
  );

drop policy if exists commerce_bundle_items_admin_write on public.commerce_bundle_items;
create policy commerce_bundle_items_admin_write on public.commerce_bundle_items
  for all to authenticated
  using (public.command_center_is_admin() and public.commerce_is_member(organization_id))
  with check (public.command_center_is_admin() and public.commerce_is_member(organization_id));

create or replace function public.commerce_current_organization()
returns uuid
language plpgsql stable security definer set search_path=public
as $$
declare result uuid;
begin
  if to_regclass('public.organization_memberships') is not null then
    execute 'select organization_id from public.organization_memberships where user_id=$1 and status=''active'' order by organization_id limit 1'
      into result using auth.uid();
  elsif to_regclass('public.organization_members') is not null then
    select organization_id into result
    from public.organization_members
    where user_id=auth.uid() and status='active'
    order by created_at
    limit 1;
  end if;
  return result;
end
$$;

revoke all on function public.commerce_current_organization() from public, anon;
grant execute on function public.commerce_current_organization() to authenticated, service_role;
grant select on public.commerce_bundles, public.commerce_bundle_items to anon;
grant select, insert, update, delete on public.commerce_bundles, public.commerce_bundle_items to authenticated;
grant select, insert, update, delete on public.commerce_bundles, public.commerce_bundle_items to service_role;

notify pgrst, 'reload schema';

-- FitConnect Product & Inventory Management v1
-- Multi-tenant warehouse stock, reservations, movements, serial numbers and batches.

create extension if not exists pgcrypto;

create table if not exists public.commerce_warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  name text not null,
  code text not null,
  warehouse_type text not null default 'internal'
    check (warehouse_type in ('internal','showroom','external','supplier','dropship','service')),
  address jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.commerce_inventory_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  warehouse_id uuid not null references public.commerce_warehouses(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  physical_quantity numeric(14,3) not null default 0 check (physical_quantity >= 0),
  reserved_quantity numeric(14,3) not null default 0 check (reserved_quantity >= 0),
  incoming_quantity numeric(14,3) not null default 0 check (incoming_quantity >= 0),
  rented_quantity numeric(14,3) not null default 0 check (rented_quantity >= 0),
  repair_quantity numeric(14,3) not null default 0 check (repair_quantity >= 0),
  demo_quantity numeric(14,3) not null default 0 check (demo_quantity >= 0),
  showroom_quantity numeric(14,3) not null default 0 check (showroom_quantity >= 0),
  damaged_quantity numeric(14,3) not null default 0 check (damaged_quantity >= 0),
  rejected_quantity numeric(14,3) not null default 0 check (rejected_quantity >= 0),
  minimum_quantity numeric(14,3) not null default 0 check (minimum_quantity >= 0),
  reorder_quantity numeric(14,3) not null default 0 check (reorder_quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_id, variant_id)
);

create table if not exists public.commerce_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  warehouse_id uuid not null references public.commerce_warehouses(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  source_type text not null check (source_type in ('cart','quote','order','rental','manual')),
  source_id uuid,
  quantity numeric(14,3) not null check (quantity > 0),
  status text not null default 'active'
    check (status in ('active','released','converted','expired','cancelled')),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  warehouse_id uuid not null references public.commerce_warehouses(id) on delete restrict,
  product_id uuid not null,
  variant_id uuid,
  movement_type text not null check (movement_type in (
    'purchase_receipt','sale','reservation','reservation_release','rental_out','rental_return',
    'transfer_in','transfer_out','return_in','return_out','repair_in','repair_out','demo_in','demo_out',
    'showroom_in','showroom_out','damage','reject','correction','stock_count'
  )),
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  reference_type text,
  reference_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.commerce_inventory_serials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  warehouse_id uuid references public.commerce_warehouses(id) on delete set null,
  product_id uuid not null,
  variant_id uuid,
  serial_number text not null,
  status text not null default 'available' check (status in (
    'incoming','available','reserved','sold','rented','demo','showroom','repair','returned','damaged','rejected'
  )),
  customer_id uuid,
  sales_order_id uuid,
  invoice_id uuid,
  installed_at timestamptz,
  warranty_starts_at date,
  warranty_ends_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, serial_number)
);

create table if not exists public.commerce_inventory_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  warehouse_id uuid not null references public.commerce_warehouses(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  batch_number text not null,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  received_at date,
  expires_at date,
  supplier_id uuid,
  purchase_order_id uuid,
  status text not null default 'available'
    check (status in ('incoming','available','quarantine','expired','recalled','depleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_id, variant_id, batch_number)
);

create index if not exists commerce_warehouses_org_active_idx
  on public.commerce_warehouses (organization_id, is_active);
create index if not exists commerce_inventory_levels_org_product_idx
  on public.commerce_inventory_levels (organization_id, product_id);
create index if not exists commerce_inventory_levels_reorder_idx
  on public.commerce_inventory_levels (organization_id, minimum_quantity, physical_quantity);
create index if not exists commerce_inventory_reservations_source_idx
  on public.commerce_inventory_reservations (source_type, source_id, status);
create index if not exists commerce_inventory_movements_product_created_idx
  on public.commerce_inventory_movements (organization_id, product_id, created_at desc);
create index if not exists commerce_inventory_serials_product_status_idx
  on public.commerce_inventory_serials (organization_id, product_id, status);
create index if not exists commerce_inventory_batches_expiry_idx
  on public.commerce_inventory_batches (organization_id, expires_at) where status = 'available';

alter table public.commerce_warehouses enable row level security;
alter table public.commerce_inventory_levels enable row level security;
alter table public.commerce_inventory_reservations enable row level security;
alter table public.commerce_inventory_movements enable row level security;
alter table public.commerce_inventory_serials enable row level security;
alter table public.commerce_inventory_batches enable row level security;

-- Reuse the tenant membership helper from Commerce Core.
do $policies$
begin
  if to_regprocedure('public.commerce_is_member(uuid)') is null then
    raise exception 'Commerce Core must be installed before Product Inventory Management';
  end if;
end $policies$;

drop policy if exists commerce_warehouses_tenant on public.commerce_warehouses;
create policy commerce_warehouses_tenant on public.commerce_warehouses
  for all to authenticated
  using (public.commerce_is_member(organization_id))
  with check (public.commerce_is_member(organization_id));

drop policy if exists commerce_inventory_levels_tenant on public.commerce_inventory_levels;
create policy commerce_inventory_levels_tenant on public.commerce_inventory_levels
  for all to authenticated
  using (public.commerce_is_member(organization_id))
  with check (public.commerce_is_member(organization_id));

drop policy if exists commerce_inventory_reservations_tenant on public.commerce_inventory_reservations;
create policy commerce_inventory_reservations_tenant on public.commerce_inventory_reservations
  for all to authenticated
  using (public.commerce_is_member(organization_id))
  with check (public.commerce_is_member(organization_id));

drop policy if exists commerce_inventory_movements_tenant_read on public.commerce_inventory_movements;
create policy commerce_inventory_movements_tenant_read on public.commerce_inventory_movements
  for select to authenticated
  using (public.commerce_is_member(organization_id));

drop policy if exists commerce_inventory_movements_tenant_insert on public.commerce_inventory_movements;
create policy commerce_inventory_movements_tenant_insert on public.commerce_inventory_movements
  for insert to authenticated
  with check (public.commerce_is_member(organization_id));

drop policy if exists commerce_inventory_serials_tenant on public.commerce_inventory_serials;
create policy commerce_inventory_serials_tenant on public.commerce_inventory_serials
  for all to authenticated
  using (public.commerce_is_member(organization_id))
  with check (public.commerce_is_member(organization_id));

drop policy if exists commerce_inventory_batches_tenant on public.commerce_inventory_batches;
create policy commerce_inventory_batches_tenant on public.commerce_inventory_batches
  for all to authenticated
  using (public.commerce_is_member(organization_id))
  with check (public.commerce_is_member(organization_id));

create or replace function public.commerce_inventory_available(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_variant_id uuid default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $available$
  select greatest(
    coalesce(l.physical_quantity, 0)
    - coalesce(l.reserved_quantity, 0)
    - coalesce(l.rented_quantity, 0)
    - coalesce(l.repair_quantity, 0)
    - coalesce(l.demo_quantity, 0)
    - coalesce(l.showroom_quantity, 0)
    - coalesce(l.damaged_quantity, 0)
    - coalesce(l.rejected_quantity, 0),
    0
  )
  from public.commerce_inventory_levels l
  where l.warehouse_id = p_warehouse_id
    and l.product_id = p_product_id
    and l.variant_id is not distinct from p_variant_id
    and public.commerce_is_member(l.organization_id)
$available$;

create or replace function public.commerce_inventory_apply_movement(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_movement_type text,
  p_quantity_delta numeric,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.commerce_inventory_levels
language plpgsql
security definer
set search_path = public
as $movement$
declare
  v_org_id uuid;
  v_level public.commerce_inventory_levels%rowtype;
begin
  select organization_id into v_org_id
  from public.commerce_warehouses
  where id = p_warehouse_id;

  if v_org_id is null or not public.commerce_is_member(v_org_id) then
    raise exception 'Warehouse not found or access denied';
  end if;

  if p_quantity_delta = 0 then
    raise exception 'Quantity delta cannot be zero';
  end if;

  insert into public.commerce_inventory_levels (
    organization_id, warehouse_id, product_id, variant_id, physical_quantity
  ) values (
    v_org_id, p_warehouse_id, p_product_id, p_variant_id, greatest(p_quantity_delta, 0)
  )
  on conflict (warehouse_id, product_id, variant_id)
  do update set
    physical_quantity = public.commerce_inventory_levels.physical_quantity + p_quantity_delta,
    updated_at = now()
  returning * into v_level;

  if v_level.physical_quantity < 0 then
    raise exception 'Insufficient physical inventory';
  end if;

  insert into public.commerce_inventory_movements (
    organization_id, warehouse_id, product_id, variant_id, movement_type,
    quantity_delta, reference_type, reference_id, note, metadata, created_by
  ) values (
    v_org_id, p_warehouse_id, p_product_id, p_variant_id, p_movement_type,
    p_quantity_delta, p_reference_type, p_reference_id, p_note,
    coalesce(p_metadata, '{}'::jsonb), auth.uid()
  );

  return v_level;
end
$movement$;

revoke all on function public.commerce_inventory_available(uuid, uuid, uuid) from public, anon;
revoke all on function public.commerce_inventory_apply_movement(uuid, uuid, uuid, text, numeric, text, uuid, text, jsonb) from public, anon;
grant execute on function public.commerce_inventory_available(uuid, uuid, uuid) to authenticated;
grant execute on function public.commerce_inventory_apply_movement(uuid, uuid, uuid, text, numeric, text, uuid, text, jsonb) to authenticated;

grant select, insert, update, delete on public.commerce_warehouses to authenticated;
grant select, insert, update, delete on public.commerce_inventory_levels to authenticated;
grant select, insert, update, delete on public.commerce_inventory_reservations to authenticated;
grant select, insert on public.commerce_inventory_movements to authenticated;
grant select, insert, update, delete on public.commerce_inventory_serials to authenticated;
grant select, insert, update, delete on public.commerce_inventory_batches to authenticated;

comment on table public.commerce_inventory_levels is 'Current stock state per tenant, warehouse, product and optional variant.';
comment on table public.commerce_inventory_movements is 'Append-only auditable stock movement journal.';
comment on function public.commerce_inventory_apply_movement is 'Tenant-safe atomic physical stock mutation with immutable audit entry.';

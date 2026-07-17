create extension if not exists pgcrypto;

create table if not exists public.inventory_warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.business_organizations(id) on delete cascade,
  workspace_id uuid references public.business_workspaces(id) on delete set null,
  name text not null,
  code text not null,
  address_line1 text,
  postal_code text,
  city text,
  country text not null default 'NL',
  status text not null default 'active' check (status in ('active','inactive')),
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.business_organizations(id) on delete cascade,
  workspace_id uuid references public.business_workspaces(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  variant_id uuid references public.catalog_variants(id) on delete cascade,
  quantity_on_hand numeric(14,3) not null default 0,
  quantity_reserved numeric(14,3) not null default 0,
  quantity_available numeric(14,3) generated always as (quantity_on_hand-quantity_reserved) stored,
  reorder_level numeric(14,3) not null default 0,
  average_cost numeric(14,4) not null default 0,
  updated_at timestamptz not null default now()
);
create unique index if not exists inventory_stock_unique on public.inventory_stock(organization_id,warehouse_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.business_organizations(id) on delete cascade,
  workspace_id uuid references public.business_workspaces(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  variant_id uuid references public.catalog_variants(id) on delete cascade,
  type text not null check(type in ('receipt','issue','adjustment','transfer_in','transfer_out','count')),
  quantity numeric(14,3) not null check(quantity<>0),
  unit_cost numeric(14,4) not null default 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.business_organizations(id) on delete cascade,
  workspace_id uuid references public.business_workspaces(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  variant_id uuid references public.catalog_variants(id) on delete cascade,
  quantity numeric(14,3) not null check(quantity>0),
  status text not null default 'active' check(status in ('active','released','fulfilled','expired')),
  reference_type text,
  reference_id uuid,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.business_organizations(id) on delete cascade,
  workspace_id uuid references public.business_workspaces(id) on delete set null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete cascade,
  name text not null,
  status text not null default 'open' check(status in ('open','completed','cancelled')),
  notes text,
  created_by uuid,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_count_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.business_organizations(id) on delete cascade,
  count_id uuid not null references public.inventory_counts(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  variant_id uuid references public.catalog_variants(id) on delete cascade,
  expected_quantity numeric(14,3) not null default 0,
  counted_quantity numeric(14,3) not null default 0,
  notes text
);
create unique index if not exists inventory_count_lines_unique on public.inventory_count_lines(count_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.inventory_post_movement(p_movement jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row inventory_stock; v_movement inventory_movements;
begin
  insert into inventory_movements(organization_id,workspace_id,warehouse_id,product_id,variant_id,type,quantity,unit_cost,reference_type,reference_id,notes,created_by)
  values((p_movement->>'organization_id')::uuid,(p_movement->>'workspace_id')::uuid,(p_movement->>'warehouse_id')::uuid,(p_movement->>'product_id')::uuid,nullif(p_movement->>'variant_id','')::uuid,p_movement->>'type',(p_movement->>'quantity')::numeric,coalesce((p_movement->>'unit_cost')::numeric,0),p_movement->>'reference_type',nullif(p_movement->>'reference_id','')::uuid,p_movement->>'notes',nullif(p_movement->>'created_by','')::uuid) returning * into v_movement;
  insert into inventory_stock(organization_id,workspace_id,warehouse_id,product_id,variant_id,quantity_on_hand,average_cost)
  values(v_movement.organization_id,v_movement.workspace_id,v_movement.warehouse_id,v_movement.product_id,v_movement.variant_id,v_movement.quantity,v_movement.unit_cost)
  on conflict (organization_id,warehouse_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)) do update set quantity_on_hand=inventory_stock.quantity_on_hand+excluded.quantity_on_hand,average_cost=case when excluded.unit_cost>0 then excluded.unit_cost else inventory_stock.average_cost end,updated_at=now()
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.inventory_create_reservation(p_reservation jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_stock inventory_stock; v_res inventory_reservations;
begin
  select * into v_stock from inventory_stock where organization_id=(p_reservation->>'organization_id')::uuid and warehouse_id=(p_reservation->>'warehouse_id')::uuid and product_id=(p_reservation->>'product_id')::uuid and variant_id is not distinct from nullif(p_reservation->>'variant_id','')::uuid for update;
  if v_stock.id is null or v_stock.quantity_available < (p_reservation->>'quantity')::numeric then raise exception 'Onvoldoende beschikbare voorraad'; end if;
  insert into inventory_reservations(organization_id,workspace_id,warehouse_id,product_id,variant_id,quantity,status,reference_type,reference_id,expires_at,created_by)
  values((p_reservation->>'organization_id')::uuid,(p_reservation->>'workspace_id')::uuid,(p_reservation->>'warehouse_id')::uuid,(p_reservation->>'product_id')::uuid,nullif(p_reservation->>'variant_id','')::uuid,(p_reservation->>'quantity')::numeric,'active',p_reservation->>'reference_type',nullif(p_reservation->>'reference_id','')::uuid,nullif(p_reservation->>'expires_at','')::timestamptz,nullif(p_reservation->>'created_by','')::uuid) returning * into v_res;
  update inventory_stock set quantity_reserved=quantity_reserved+v_res.quantity,updated_at=now() where id=v_stock.id;
  return to_jsonb(v_res);
end $$;

create or replace function public.inventory_release_reservation(p_organization_id uuid,p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_res inventory_reservations;
begin
  select * into v_res from inventory_reservations where id=p_reservation_id and organization_id=p_organization_id for update;
  if v_res.id is null then raise exception 'Reservering niet gevonden'; end if;
  if v_res.status='active' then update inventory_stock set quantity_reserved=greatest(0,quantity_reserved-v_res.quantity),updated_at=now() where organization_id=v_res.organization_id and warehouse_id=v_res.warehouse_id and product_id=v_res.product_id and variant_id is not distinct from v_res.variant_id; end if;
  update inventory_reservations set status='released',updated_at=now() where id=v_res.id returning * into v_res;
  return to_jsonb(v_res);
end $$;

create or replace function public.inventory_complete_count(p_organization_id uuid,p_count_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_count inventory_counts; v_line record; v_diff numeric;
begin
  select * into v_count from inventory_counts where id=p_count_id and organization_id=p_organization_id for update;
  if v_count.id is null then raise exception 'Telling niet gevonden'; end if;
  for v_line in select * from inventory_count_lines where count_id=p_count_id loop
    v_diff:=v_line.counted_quantity-v_line.expected_quantity;
    if v_diff<>0 then perform inventory_post_movement(jsonb_build_object('organization_id',v_count.organization_id,'workspace_id',v_count.workspace_id,'warehouse_id',v_count.warehouse_id,'product_id',v_line.product_id,'variant_id',v_line.variant_id,'type','count','quantity',v_diff,'reference_type','inventory_count','reference_id',v_count.id)); end if;
  end loop;
  update inventory_counts set status='completed',completed_at=now() where id=p_count_id returning * into v_count;
  return to_jsonb(v_count);
end $$;

alter table inventory_warehouses enable row level security;
alter table inventory_stock enable row level security;
alter table inventory_movements enable row level security;
alter table inventory_reservations enable row level security;
alter table inventory_counts enable row level security;
alter table inventory_count_lines enable row level security;

do $$ declare t text; begin foreach t in array array['inventory_warehouses','inventory_stock','inventory_movements','inventory_reservations','inventory_counts','inventory_count_lines'] loop execute format('drop policy if exists inventory_tenant_access on public.%I',t); execute format('create policy inventory_tenant_access on public.%I for all using (exists (select 1 from public.business_memberships m where m.organization_id=%I.organization_id and m.user_id=auth.uid() and m.status=''active'')) with check (exists (select 1 from public.business_memberships m where m.organization_id=%I.organization_id and m.user_id=auth.uid() and m.status=''active''))',t,t,t); end loop; end $$;

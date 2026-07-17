create extension if not exists pgcrypto;

create table if not exists public.purchasing_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  name text not null,
  code text,
  email text,
  phone text,
  website text,
  vat_number text,
  currency text not null default 'EUR',
  payment_terms_days integer not null default 0 check (payment_terms_days >= 0),
  delivery_terms text,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists purchasing_suppliers_org_code_uq on public.purchasing_suppliers(organization_id,code) where code is not null and deleted_at is null;

create table if not exists public.purchasing_supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  supplier_id uuid not null references public.purchasing_suppliers(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.purchasing_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  supplier_id uuid not null references public.purchasing_suppliers(id),
  warehouse_id uuid not null references public.inventory_warehouses(id),
  order_number text not null,
  order_date date not null default current_date,
  expected_date date,
  currency text not null default 'EUR',
  status text not null default 'draft' check (status in ('draft','sent','partially_received','received','cancelled')),
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists purchasing_orders_org_number_uq on public.purchasing_orders(organization_id,order_number) where deleted_at is null;

create table if not exists public.purchasing_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  purchase_order_id uuid not null references public.purchasing_orders(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id),
  variant_id uuid references public.catalog_variants(id),
  description text,
  quantity numeric(14,3) not null check (quantity > 0),
  received_quantity numeric(14,3) not null default 0 check (received_quantity >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  tax_rate numeric(7,4) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchasing_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  purchase_order_id uuid not null references public.purchasing_orders(id),
  warehouse_id uuid not null references public.inventory_warehouses(id),
  reference text,
  notes text,
  received_at timestamptz not null default now(),
  received_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.purchasing_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  receipt_id uuid not null references public.purchasing_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchasing_order_lines(id),
  product_id uuid not null references public.catalog_products(id),
  variant_id uuid references public.catalog_variants(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  batch_number text,
  serial_numbers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.purchasing_cost_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  supplier_id uuid references public.purchasing_suppliers(id),
  receipt_id uuid references public.purchasing_receipts(id),
  product_id uuid not null references public.catalog_products(id),
  variant_id uuid references public.catalog_variants(id),
  quantity numeric(14,3) not null,
  unit_cost numeric(14,4) not null,
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create or replace function public.purchasing_create_order(p_order jsonb,p_lines jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_order_id uuid; v_line jsonb;
begin
  insert into purchasing_orders(organization_id,workspace_id,supplier_id,warehouse_id,order_number,order_date,expected_date,currency,status,notes,metadata,created_by,updated_by)
  values ((p_order->>'organization_id')::uuid,nullif(p_order->>'workspace_id','')::uuid,(p_order->>'supplier_id')::uuid,(p_order->>'warehouse_id')::uuid,p_order->>'order_number',coalesce((p_order->>'order_date')::date,current_date),nullif(p_order->>'expected_date','')::date,coalesce(p_order->>'currency','EUR'),coalesce(p_order->>'status','draft'),p_order->>'notes',coalesce(p_order->'metadata','{}'::jsonb),nullif(p_order->>'created_by','')::uuid,nullif(p_order->>'updated_by','')::uuid)
  returning id into v_order_id;
  for v_line in select * from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) loop
    insert into purchasing_order_lines(organization_id,purchase_order_id,product_id,variant_id,description,quantity,unit_cost,tax_rate,line_total)
    values ((p_order->>'organization_id')::uuid,v_order_id,(v_line->>'product_id')::uuid,nullif(v_line->>'variant_id','')::uuid,v_line->>'description',(v_line->>'quantity')::numeric,coalesce((v_line->>'unit_cost')::numeric,0),coalesce((v_line->>'tax_rate')::numeric,0),round(((v_line->>'quantity')::numeric*coalesce((v_line->>'unit_cost')::numeric,0))::numeric,2));
  end loop;
  update purchasing_orders o set subtotal=x.subtotal,tax_total=x.tax_total,total=x.subtotal+x.tax_total from (select purchase_order_id,sum(line_total) subtotal,sum(line_total*tax_rate/100) tax_total from purchasing_order_lines where purchase_order_id=v_order_id group by purchase_order_id)x where o.id=v_order_id;
  return v_order_id;
end$$;

create or replace function public.purchasing_receive_order(p_order_id uuid,p_warehouse_id uuid,p_reference text,p_notes text,p_lines jsonb,p_user_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_receipt uuid; v_org uuid; v_supplier uuid; v_line jsonb; v_order_line purchasing_order_lines%rowtype; v_remaining numeric; v_received numeric;
begin
  select organization_id,supplier_id into v_org,v_supplier from purchasing_orders where id=p_order_id for update;
  if v_org is null then raise exception 'Inkooporder niet gevonden'; end if;
  insert into purchasing_receipts(organization_id,purchase_order_id,warehouse_id,reference,notes,received_by) values(v_org,p_order_id,p_warehouse_id,p_reference,p_notes,p_user_id) returning id into v_receipt;
  for v_line in select * from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) loop
    select * into v_order_line from purchasing_order_lines where id=(v_line->>'purchase_order_line_id')::uuid and purchase_order_id=p_order_id for update;
    v_received:=(v_line->>'quantity')::numeric; v_remaining:=v_order_line.quantity-v_order_line.received_quantity;
    if v_received<=0 or v_received>v_remaining then raise exception 'Ongeldige ontvangsthoeveelheid'; end if;
    insert into purchasing_receipt_lines(organization_id,receipt_id,purchase_order_line_id,product_id,variant_id,quantity,unit_cost,batch_number,serial_numbers)
    values(v_org,v_receipt,v_order_line.id,v_order_line.product_id,v_order_line.variant_id,v_received,coalesce((v_line->>'unit_cost')::numeric,v_order_line.unit_cost),v_line->>'batch_number',coalesce(v_line->'serial_numbers','[]'::jsonb));
    update purchasing_order_lines set received_quantity=received_quantity+v_received,updated_at=now() where id=v_order_line.id;
    perform inventory_post_movement(v_org,p_warehouse_id,v_order_line.product_id,v_order_line.variant_id,'receipt',v_received,coalesce((v_line->>'unit_cost')::numeric,v_order_line.unit_cost),'purchase_receipt',v_receipt::text,p_user_id,p_notes);
    insert into purchasing_cost_history(organization_id,supplier_id,receipt_id,product_id,variant_id,quantity,unit_cost,currency)
    select v_org,v_supplier,v_receipt,v_order_line.product_id,v_order_line.variant_id,v_received,coalesce((v_line->>'unit_cost')::numeric,v_order_line.unit_cost),currency from purchasing_orders where id=p_order_id;
    update catalog_products set cost_price=coalesce((v_line->>'unit_cost')::numeric,v_order_line.unit_cost),updated_at=now() where id=v_order_line.product_id and organization_id=v_org;
  end loop;
  update purchasing_orders set status=case when exists(select 1 from purchasing_order_lines where purchase_order_id=p_order_id and received_quantity<quantity) then 'partially_received' else 'received' end,updated_at=now() where id=p_order_id;
  return v_receipt;
end$$;

alter table purchasing_suppliers enable row level security;
alter table purchasing_supplier_contacts enable row level security;
alter table purchasing_orders enable row level security;
alter table purchasing_order_lines enable row level security;
alter table purchasing_receipts enable row level security;
alter table purchasing_receipt_lines enable row level security;
alter table purchasing_cost_history enable row level security;

do $$ declare t text; begin
  foreach t in array array['purchasing_suppliers','purchasing_supplier_contacts','purchasing_orders','purchasing_order_lines','purchasing_receipts','purchasing_receipt_lines','purchasing_cost_history'] loop
    execute format('drop policy if exists %I_member_access on public.%I',t,t);
    execute format('create policy %I_member_access on public.%I for all using (exists (select 1 from public.business_memberships bm where bm.organization_id=%I.organization_id and bm.user_id=auth.uid() and bm.status=''active'')) with check (exists (select 1 from public.business_memberships bm where bm.organization_id=%I.organization_id and bm.user_id=auth.uid() and bm.status=''active''))',t,t,t,t);
  end loop;
end $$;
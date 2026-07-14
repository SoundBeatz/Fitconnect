create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'customer' check (role in ('admin','customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  model text,
  name text not null,
  category text not null default 'Kracht',
  price numeric(12,2) not null default 0,
  vat integer not null default 21,
  stock integer not null default 0,
  delivery text,
  warranty text,
  status text not null default 'draft' check (status in ('active','draft','archived')),
  short_description text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  exercises jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  serial_number text,
  purchase_date date,
  warranty_until date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.customer_training_plans (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (customer_id, training_plan_id)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid references public.customer_equipment(id) on delete set null,
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','waiting','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'published' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customer_equipment enable row level security;
alter table public.training_plans enable row level security;
alter table public.customer_training_plans enable row level security;
alter table public.service_requests enable row level security;
alter table public.community_posts enable row level security;

create policy "public reads active products" on public.products for select to anon, authenticated using (status='active' or public.is_admin());
create policy "admin manages products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "users read own profile" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "admin inserts profiles" on public.profiles for insert to authenticated with check (public.is_admin() or id=auth.uid());
create policy "equipment owner or admin" on public.customer_equipment for select to authenticated using (customer_id=auth.uid() or public.is_admin());
create policy "admin manages equipment" on public.customer_equipment for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated reads training plans" on public.training_plans for select to authenticated using (true);
create policy "admin manages training plans" on public.training_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "assigned training owner or admin" on public.customer_training_plans for select to authenticated using (customer_id=auth.uid() or public.is_admin());
create policy "admin manages assignments" on public.customer_training_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "service owner or admin reads" on public.service_requests for select to authenticated using (customer_id=auth.uid() or public.is_admin());
create policy "customer creates own service" on public.service_requests for insert to authenticated with check (customer_id=auth.uid() or public.is_admin());
create policy "admin updates service" on public.service_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "published community readable" on public.community_posts for select to authenticated using (status='published' or author_id=auth.uid() or public.is_admin());
create policy "users create own posts" on public.community_posts for insert to authenticated with check (author_id=auth.uid());
create policy "authors update own posts" on public.community_posts for update to authenticated using (author_id=auth.uid() or public.is_admin()) with check (author_id=auth.uid() or public.is_admin());

insert into public.products (slug,brand,model,name,category,price,vat,stock,delivery,warranty,status,short_description,description,specifications,benefits,exercises,images,featured)
values ('technogym-pa04','Technogym','PA04','Technogym PA04 verstelbare fitnessbank','Kracht',1400,21,2,'2–5 werkdagen','2 jaar','active','Professionele verstelbare fitnessbank voor dumbbell- en haltertraining.','Compacte, stabiele en ergonomische trainingsbank met 7 rugstanden, 3 zitstanden, geïntegreerde wielen en transportgreep.',
'{"Lengte":"119,8 cm","Breedte":"69,7 cm","Hoogte":"131,2 cm","Gewicht":"36 kg","Platformhoogte":"48,1 cm","Rugleuning":"7 standen: 0°, 15°, 30°, 45°, 60°, 75°, 85°","Zitting":"3 standen: 0°, 15°, 30°"}',
'["Compact professioneel ontwerp","Met één hand verstelbaar","Hoge dichtheid foam","Geïntegreerde wielen en handgreep","Inclusief btw en levering"]',
'["Flat bench press","Incline press","Shoulder press","Dumbbell fly","One-arm row","Bulgarian split squat","Hip thrust","Core training"]',
'["IMG_6234.JPG","IMG_6235.JPG","IMG_6236.JPG","IMG_6237.JPG","IMG_6238.JPG"]',true)
on conflict (slug) do update set price=excluded.price, stock=excluded.stock, updated_at=now();
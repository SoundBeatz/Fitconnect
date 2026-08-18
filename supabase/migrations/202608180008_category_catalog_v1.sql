-- Category catalogue v1
-- Central admin-selectable taxonomy. Storefront visibility remains product-driven.

create table if not exists public.commerce_categories (
  id text primary key,
  name text not null,
  slug text not null,
  parent_id text references public.commerce_categories(id) on delete cascade,
  type text not null check (type in ('main','sub')),
  shop_key text not null default 'fitness',
  status text not null default 'active' check (status in ('active','draft','archived')),
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(parent_id, slug)
);

alter table public.commerce_categories enable row level security;

drop policy if exists "Authenticated can view category catalogue" on public.commerce_categories;
create policy "Authenticated can view category catalogue"
on public.commerce_categories for select
to authenticated
using (true);

drop policy if exists "Admins can manage category catalogue" on public.commerce_categories;
create policy "Admins can manage category catalogue"
on public.commerce_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.commerce_categories (id,name,slug,parent_id,type,shop_key,display_order)
values
('kracht','Kracht','kracht',null,'main','fitness',10),
('cardio','Cardio','cardio',null,'main','fitness',20),
('gewichten','Gewichten','gewichten',null,'main','fitness',30),
('opslag','Opslag','opslag',null,'main','fitness',40),
('boksen','Boksen','boksen',null,'main','fitness',50),
('vloer','Vloer','vloer',null,'main','fitness',60),
('voeding','Voeding','voeding',null,'main','nutrition',70),
('training-sessies','Training sessies','training-sessies',null,'main','services',80),
('mental-coaching','Mental coaching','mental-coaching',null,'main','services',90),
('weerbaarheidstraining','Weerbaarheidstraining','weerbaarheidstraining',null,'main','services',100),
('massage','Massage','massage',null,'main','services',110),
('kracht:racks-en-banken','Racks en banken','racks-en-banken','kracht','sub','fitness',10),
('kracht:kabelstations-en-krachtstations','Kabelstations en krachtstations','kabelstations-en-krachtstations','kracht','sub','fitness',20),
('kracht:squatracks-en-pull-up-bars','Squatracks en pull-up bars','squatracks-en-pull-up-bars','kracht','sub','fitness',30),
('kracht:stackmachines-en-plate-loaded','Stackmachines en plate-loaded','stackmachines-en-plate-loaded','kracht','sub','fitness',40),
('kracht:power-racks-en-power-towers','Power racks en power towers','power-racks-en-power-towers','kracht','sub','fitness',50),
('kracht:bio-strength-en-circuittraining','Bio-strength en circuittraining','bio-strength-en-circuittraining','kracht','sub','fitness',60),
('cardio:loopbanden','Loopbanden','loopbanden','cardio','sub','fitness',10),
('cardio:bikes','Bikes','bikes','cardio','sub','fitness',20),
('cardio:roeitrainers','Roeitrainers','roeitrainers','cardio','sub','fitness',30),
('cardio:crosstrainers','Crosstrainers','crosstrainers','cardio','sub','fitness',40),
('cardio:step-machines','Step machines','step-machines','cardio','sub','fitness',50),
('cardio:traplopers','Traplopers','traplopers','cardio','sub','fitness',60),
('gewichten:dumbbells','Dumbbells','dumbbells','gewichten','sub','fitness',10),
('gewichten:kettlebells','Kettlebells','kettlebells','gewichten','sub','fitness',20),
('gewichten:clubbells','Clubbells','clubbells','gewichten','sub','fitness',30),
('gewichten:schijven','Schijven','schijven','gewichten','sub','fitness',40),
('gewichten:bars','Bars','bars','gewichten','sub','fitness',50),
('opslag:wandrekken','Wandrekken','wandrekken','opslag','sub','fitness',10),
('opslag:plate-storage','Plate storage','plate-storage','opslag','sub','fitness',20),
('opslag:ophangsystemen','Ophangsystemen','ophangsystemen','opslag','sub','fitness',30),
('boksen:bokszakken','Bokszakken','bokszakken','boksen','sub','fitness',10),
('boksen:trapkussens','Trapkussens','trapkussens','boksen','sub','fitness',20),
('boksen:pads','Pads','pads','boksen','sub','fitness',30),
('boksen:bokspalen','Bokspalen','bokspalen','boksen','sub','fitness',40),
('vloer:rubber-tegels','Rubber tegels','rubber-tegels','vloer','sub','fitness',10),
('vloer:gras-tegels-sprinttracks','Gras tegels / sprinttracks','gras-tegels-sprinttracks','vloer','sub','fitness',20),
('vloer:platformen','Platformen','platformen','vloer','sub','fitness',30),
('vloer:ondervloeren','Ondervloeren','ondervloeren','vloer','sub','fitness',40),
('vloer:dojo-vloeren','Dojo vloeren','dojo-vloeren','vloer','sub','fitness',50)
on conflict (id) do update set
  name=excluded.name,
  slug=excluded.slug,
  parent_id=excluded.parent_id,
  type=excluded.type,
  shop_key=excluded.shop_key,
  display_order=excluded.display_order,
  updated_at=now();

notify pgrst, 'reload schema';

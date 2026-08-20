-- FitConnect Sports & Training Taxonomy v1
-- Global reference taxonomy: SPORT -> GOAL -> BODY -> MUSCLE -> EXERCISE -> EQUIPMENT -> PRODUCT
create extension if not exists pgcrypto;

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_goals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_regions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.body_regions(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  body_region_id uuid references public.body_regions(id) on delete set null,
  slug text not null unique,
  name text not null,
  anatomical_name text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  movement_pattern text,
  description text,
  difficulty text check (difficulty is null or difficulty in ('beginner','intermediate','advanced')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  equipment_group text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_exercises (
  sport_id uuid not null references public.sports(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  relevance smallint not null default 100 check (relevance between 0 and 100),
  primary key (sport_id, exercise_id)
);

create table if not exists public.exercise_goals (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  goal_id uuid not null references public.training_goals(id) on delete cascade,
  relevance smallint not null default 100 check (relevance between 0 and 100),
  primary key (exercise_id, goal_id)
);

create table if not exists public.exercise_muscles (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups(id) on delete cascade,
  role text not null default 'primary' check (role in ('primary','secondary','stabilizer')),
  relevance smallint not null default 100 check (relevance between 0 and 100),
  primary key (exercise_id, muscle_group_id, role)
);

create table if not exists public.exercise_equipment (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  equipment_type_id uuid not null references public.equipment_types(id) on delete cascade,
  suitability smallint not null default 100 check (suitability between 0 and 100),
  primary key (exercise_id, equipment_type_id)
);

create table if not exists public.product_exercises (
  product_id uuid not null references public.products(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  suitability smallint not null default 100 check (suitability between 0 and 100),
  primary key (product_id, exercise_id)
);

create table if not exists public.product_equipment_types (
  product_id uuid not null references public.products(id) on delete cascade,
  equipment_type_id uuid not null references public.equipment_types(id) on delete cascade,
  primary key (product_id, equipment_type_id)
);

create index if not exists body_regions_parent_idx on public.body_regions(parent_id, sort_order);
create index if not exists muscle_groups_region_idx on public.muscle_groups(body_region_id, sort_order);
create index if not exists sport_exercises_exercise_idx on public.sport_exercises(exercise_id);
create index if not exists exercise_goals_goal_idx on public.exercise_goals(goal_id);
create index if not exists exercise_muscles_muscle_idx on public.exercise_muscles(muscle_group_id, role);
create index if not exists exercise_equipment_type_idx on public.exercise_equipment(equipment_type_id);
create index if not exists product_exercises_exercise_idx on public.product_exercises(exercise_id);
create index if not exists product_equipment_type_idx on public.product_equipment_types(equipment_type_id);

alter table public.sports enable row level security;
alter table public.training_goals enable row level security;
alter table public.body_regions enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.equipment_types enable row level security;
alter table public.sport_exercises enable row level security;
alter table public.exercise_goals enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.product_exercises enable row level security;
alter table public.product_equipment_types enable row level security;

drop policy if exists sports_public_read on public.sports;
create policy sports_public_read on public.sports for select to anon,authenticated using (is_active);
drop policy if exists training_goals_public_read on public.training_goals;
create policy training_goals_public_read on public.training_goals for select to anon,authenticated using (is_active);
drop policy if exists body_regions_public_read on public.body_regions;
create policy body_regions_public_read on public.body_regions for select to anon,authenticated using (is_active);
drop policy if exists muscle_groups_public_read on public.muscle_groups;
create policy muscle_groups_public_read on public.muscle_groups for select to anon,authenticated using (is_active);
drop policy if exists exercises_public_read on public.exercises;
create policy exercises_public_read on public.exercises for select to anon,authenticated using (is_active);
drop policy if exists equipment_types_public_read on public.equipment_types;
create policy equipment_types_public_read on public.equipment_types for select to anon,authenticated using (is_active);
drop policy if exists sport_exercises_public_read on public.sport_exercises;
create policy sport_exercises_public_read on public.sport_exercises for select to anon,authenticated using (true);
drop policy if exists exercise_goals_public_read on public.exercise_goals;
create policy exercise_goals_public_read on public.exercise_goals for select to anon,authenticated using (true);
drop policy if exists exercise_muscles_public_read on public.exercise_muscles;
create policy exercise_muscles_public_read on public.exercise_muscles for select to anon,authenticated using (true);
drop policy if exists exercise_equipment_public_read on public.exercise_equipment;
create policy exercise_equipment_public_read on public.exercise_equipment for select to anon,authenticated using (true);
drop policy if exists product_exercises_public_read on public.product_exercises;
create policy product_exercises_public_read on public.product_exercises for select to anon,authenticated using (true);
drop policy if exists product_equipment_types_public_read on public.product_equipment_types;
create policy product_equipment_types_public_read on public.product_equipment_types for select to anon,authenticated using (true);

grant select on public.sports,public.training_goals,public.body_regions,public.muscle_groups,public.exercises,public.equipment_types,public.sport_exercises,public.exercise_goals,public.exercise_muscles,public.exercise_equipment,public.product_exercises,public.product_equipment_types to anon,authenticated;
grant select,insert,update,delete on public.sports,public.training_goals,public.body_regions,public.muscle_groups,public.exercises,public.equipment_types,public.sport_exercises,public.exercise_goals,public.exercise_muscles,public.exercise_equipment,public.product_exercises,public.product_equipment_types to service_role;

insert into public.sports(slug,name,sort_order) values
 ('strength-training','Krachttraining',10),('bodybuilding','Bodybuilding',20),('powerlifting','Powerlifting',30),('weightlifting','Weightlifting',40),('functional-training','Functional Training',50),('cross-training','Cross Training',60),('calisthenics','Calisthenics',70),('boxing','Boksen',80),('kickboxing-muay-thai','Kickboxing / Muay Thai',90),('martial-arts','Martial Arts',100),('running','Running',110),('cycling','Cycling',120),('rowing','Rowing',130),('hyrox','Hyrox',140),('conditioning','Conditioning',150),('mobility','Mobility',160)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.training_goals(slug,name,sort_order) values
 ('hypertrophy','Spiermassa / hypertrofie',10),('max-strength','Maximale kracht',20),('general-strength','Algemene kracht',30),('power','Explosiviteit',40),('endurance','Uithoudingsvermogen',50),('fat-loss','Vetverlies',60),('conditioning','Conditie',70),('mobility','Mobiliteit',80),('stability','Stabiliteit',90),('sport-performance','Sportprestatie',100),('recovery','Herstel',110)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.body_regions(slug,name,sort_order) values
 ('chest','Borst',10),('back','Rug',20),('shoulders','Schouders',30),('arms','Armen',40),('legs','Benen',50),('glutes','Billen',60),('core','Core',70),('full-body','Full Body',80)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'upper-chest','Bovenkant borst',11 from public.body_regions where slug='chest'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'mid-chest','Midden borst',12 from public.body_regions where slug='chest'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'lower-chest','Onderkant borst',13 from public.body_regions where slug='chest'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'quadriceps','Quadriceps / voorkant bovenbenen',51 from public.body_regions where slug='legs'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'hamstrings','Hamstrings / achterkant bovenbenen',52 from public.body_regions where slug='legs'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'front-delts','Voorste schouder',31 from public.body_regions where slug='shoulders'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'side-delts','Middelste schouder',32 from public.body_regions where slug='shoulders'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
insert into public.body_regions(parent_id,slug,name,sort_order)
select id,'rear-delts','Achterste schouder',33 from public.body_regions where slug='shoulders'
on conflict(slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.muscle_groups(body_region_id,slug,name,anatomical_name,sort_order)
select id,'pectoralis-clavicular','Bovenste borst','Pectoralis major – clavicular head',10 from public.body_regions where slug='upper-chest'
on conflict(slug) do update set body_region_id=excluded.body_region_id,name=excluded.name,anatomical_name=excluded.anatomical_name,is_active=true,updated_at=now();
insert into public.muscle_groups(body_region_id,slug,name,anatomical_name,sort_order)
select id,'pectoralis-sternocostal','Onderste/middelste borst','Pectoralis major – sternocostal fibres',20 from public.body_regions where slug='lower-chest'
on conflict(slug) do update set body_region_id=excluded.body_region_id,name=excluded.name,anatomical_name=excluded.anatomical_name,is_active=true,updated_at=now();
insert into public.muscle_groups(body_region_id,slug,name,anatomical_name,sort_order)
select id,'quadriceps-group','Quadriceps','Quadriceps femoris',30 from public.body_regions where slug='quadriceps'
on conflict(slug) do update set body_region_id=excluded.body_region_id,name=excluded.name,anatomical_name=excluded.anatomical_name,is_active=true,updated_at=now();
insert into public.muscle_groups(body_region_id,slug,name,anatomical_name,sort_order)
select id,'anterior-deltoid','Voorste schouderkop','Deltoideus anterior',40 from public.body_regions where slug='front-delts'
on conflict(slug) do update set body_region_id=excluded.body_region_id,name=excluded.name,anatomical_name=excluded.anatomical_name,is_active=true,updated_at=now();
insert into public.muscle_groups(body_region_id,slug,name,anatomical_name,sort_order)
select id,'lateral-deltoid','Middelste schouderkop','Deltoideus lateralis',50 from public.body_regions where slug='side-delts'
on conflict(slug) do update set body_region_id=excluded.body_region_id,name=excluded.name,anatomical_name=excluded.anatomical_name,is_active=true,updated_at=now();
insert into public.muscle_groups(body_region_id,slug,name,anatomical_name,sort_order)
select id,'posterior-deltoid','Achterste schouderkop','Deltoideus posterior',60 from public.body_regions where slug='rear-delts'
on conflict(slug) do update set body_region_id=excluded.body_region_id,name=excluded.name,anatomical_name=excluded.anatomical_name,is_active=true,updated_at=now();

insert into public.exercises(slug,name,movement_pattern,difficulty,sort_order) values
 ('decline-bench-press','Decline Bench Press','horizontal press','intermediate',10),
 ('high-to-low-cable-fly','High-to-Low Cable Fly','horizontal adduction','intermediate',20),
 ('chest-dip','Chest Dip','vertical press','intermediate',30),
 ('hack-squat','Hack Squat','squat','intermediate',40),
 ('leg-press','Leg Press','squat/press','beginner',50),
 ('leg-extension','Leg Extension','knee extension','beginner',60),
 ('shoulder-press','Shoulder Press','vertical press','beginner',70),
 ('lateral-raise','Lateral Raise','shoulder abduction','beginner',80),
 ('reverse-fly','Reverse Fly','horizontal abduction','beginner',90)
on conflict(slug) do update set name=excluded.name,movement_pattern=excluded.movement_pattern,difficulty=excluded.difficulty,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.equipment_types(slug,name,equipment_group,sort_order) values
 ('decline-chest-press','Decline Chest Press','strength-machine',10),
 ('adjustable-decline-bench','Adjustable Decline Bench','bench',20),
 ('functional-trainer','Functional Trainer','cable',30),
 ('dip-station','Dip Station','bodyweight',40),
 ('hack-squat-machine','Hack Squat','strength-machine',50),
 ('leg-press-machine','Leg Press','strength-machine',60),
 ('leg-extension-machine','Leg Extension','strength-machine',70),
 ('shoulder-press-machine','Shoulder Press','strength-machine',80),
 ('lateral-raise-machine','Lateral Raise Machine','strength-machine',90),
 ('reverse-fly-machine','Reverse Fly / Rear Delt Machine','strength-machine',100),
 ('power-rack','Power Rack','rack',110),('barbell','Barbell','free-weight',120),('dumbbells','Dumbbells','free-weight',130)
on conflict(slug) do update set name=excluded.name,equipment_group=excluded.equipment_group,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.sport_exercises(sport_id,exercise_id,relevance)
select s.id,e.id,100 from public.sports s cross join public.exercises e where s.slug='strength-training'
on conflict do nothing;
insert into public.sport_exercises(sport_id,exercise_id,relevance)
select s.id,e.id,100 from public.sports s cross join public.exercises e where s.slug='bodybuilding'
on conflict do nothing;

insert into public.exercise_goals(exercise_id,goal_id,relevance)
select e.id,g.id,100 from public.exercises e cross join public.training_goals g where g.slug='hypertrophy'
on conflict do nothing;
insert into public.exercise_goals(exercise_id,goal_id,relevance)
select e.id,g.id,80 from public.exercises e cross join public.training_goals g where g.slug='general-strength'
on conflict do nothing;

insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',100 from public.exercises e join public.muscle_groups m on m.slug='pectoralis-sternocostal' where e.slug in ('decline-bench-press','high-to-low-cable-fly','chest-dip')
on conflict do nothing;
insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',100 from public.exercises e join public.muscle_groups m on m.slug='quadriceps-group' where e.slug in ('hack-squat','leg-press','leg-extension')
on conflict do nothing;
insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',100 from public.exercises e join public.muscle_groups m on m.slug='anterior-deltoid' where e.slug='shoulder-press'
on conflict do nothing;
insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',100 from public.exercises e join public.muscle_groups m on m.slug='lateral-deltoid' where e.slug='lateral-raise'
on conflict do nothing;
insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',100 from public.exercises e join public.muscle_groups m on m.slug='posterior-deltoid' where e.slug='reverse-fly'
on conflict do nothing;

insert into public.exercise_equipment(exercise_id,equipment_type_id,suitability)
select e.id,t.id,100 from public.exercises e join public.equipment_types t on
 (e.slug='decline-bench-press' and t.slug in ('decline-chest-press','adjustable-decline-bench','power-rack','barbell','dumbbells')) or
 (e.slug='high-to-low-cable-fly' and t.slug='functional-trainer') or
 (e.slug='chest-dip' and t.slug='dip-station') or
 (e.slug='hack-squat' and t.slug='hack-squat-machine') or
 (e.slug='leg-press' and t.slug='leg-press-machine') or
 (e.slug='leg-extension' and t.slug='leg-extension-machine') or
 (e.slug='shoulder-press' and t.slug in ('shoulder-press-machine','power-rack','barbell','dumbbells')) or
 (e.slug='lateral-raise' and t.slug in ('lateral-raise-machine','functional-trainer','dumbbells')) or
 (e.slug='reverse-fly' and t.slug in ('reverse-fly-machine','functional-trainer','dumbbells'))
on conflict do nothing;

create or replace function public.training_configurator_options(
  p_sport_slug text default null,
  p_goal_slug text default null,
  p_body_region_slug text default null
)
returns table(
  exercise_slug text,
  exercise_name text,
  equipment_slug text,
  equipment_name text,
  equipment_group text,
  score integer
)
language sql stable security invoker set search_path=public as $fn$
  select e.slug,e.name,et.slug,et.name,et.equipment_group,
         (coalesce(se.relevance,0)+coalesce(eg.relevance,0)+coalesce(em.relevance,0)+ee.suitability)::integer as score
  from public.exercises e
  join public.exercise_equipment ee on ee.exercise_id=e.id
  join public.equipment_types et on et.id=ee.equipment_type_id and et.is_active
  left join public.sports s on s.slug=p_sport_slug and s.is_active
  left join public.sport_exercises se on se.exercise_id=e.id and se.sport_id=s.id
  left join public.training_goals g on g.slug=p_goal_slug and g.is_active
  left join public.exercise_goals eg on eg.exercise_id=e.id and eg.goal_id=g.id
  left join public.body_regions br on br.slug=p_body_region_slug and br.is_active
  left join public.muscle_groups mg on (mg.body_region_id=br.id or mg.body_region_id in (select id from public.body_regions where parent_id=br.id)) and mg.is_active
  left join public.exercise_muscles em on em.exercise_id=e.id and em.muscle_group_id=mg.id and em.role='primary'
  where e.is_active
    and (p_sport_slug is null or se.exercise_id is not null)
    and (p_goal_slug is null or eg.exercise_id is not null)
    and (p_body_region_slug is null or em.exercise_id is not null)
  order by score desc,e.sort_order,et.sort_order;
$fn$;

grant execute on function public.training_configurator_options(text,text,text) to anon,authenticated,service_role;
comment on function public.training_configurator_options(text,text,text) is 'Public read-only recommendation engine for Sports -> Goal -> Body -> Exercise -> Equipment.';

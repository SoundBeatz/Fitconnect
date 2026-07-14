-- FitConnect database health check (read-only)

-- 1. Expected public tables
select
  expected.table_name,
  case when actual.table_name is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('leads'),
    ('profiles'),
    ('products'),
    ('customer_equipment'),
    ('training_plans'),
    ('customer_training_plans'),
    ('service_requests'),
    ('community_posts')
) as expected(table_name)
left join information_schema.tables actual
  on actual.table_schema = 'public'
 and actual.table_name = expected.table_name
order by expected.table_name;

-- 2. RLS status on FitConnect tables
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles','products','customer_equipment','training_plans',
    'customer_training_plans','service_requests','community_posts'
  )
order by c.relname;

-- 3. Policies per table
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles','products','customer_equipment','training_plans',
    'customer_training_plans','service_requests','community_posts'
  )
order by tablename, policyname;

-- 4. is_admin function exists
select
  routine_name,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'is_admin';

-- 5. PA04 seed product
select
  slug,
  brand,
  model,
  name,
  price,
  vat,
  stock,
  delivery,
  warranty,
  status,
  featured
from public.products
where slug = 'technogym-pa04';

-- 6. Admin profiles currently present
select
  p.id,
  p.full_name,
  p.role,
  u.email
from public.profiles p
left join auth.users u on u.id = p.id
where p.role = 'admin';

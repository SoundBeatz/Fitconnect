-- Normalize the canonical identity of every FitConnect platform module.
-- module_key remains the immutable business key; visible labels and routes are repaired idempotently.

insert into public.platform_modules (
  module_key,
  name,
  description,
  enabled,
  route,
  accent_color,
  surface_style,
  display_order,
  settings,
  category,
  version,
  lifecycle_status,
  is_core,
  is_billable,
  default_enabled,
  icon_key
)
values
  ('core_engine','Core Engine','Tenant identity, organizations, workspaces, permissions and platform foundations.',true,'','#1f2937','dark',1,'{}'::jsonb,'core','1.0.0','active',true,false,true,'settings'),
  ('command_center','Command Center','Operational control, analytics, administration, monitoring and audit.',true,'/admin/','#1f2937','dark',5,'{}'::jsonb,'command_center','1.0.0','active',true,false,true,'layout-dashboard'),
  ('commerce','Commerce Shop','Productcatalogus, winkelmand en checkout.',true,'/shop/','#f36f21','light',10,'{}'::jsonb,'commerce','1.0.0','active',false,true,true,'shopping-cart'),
  ('combination_deals','Combination Deals','Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',true,'/admin/#combination-deals','#f36f21','premium',15,'{}'::jsonb,'commerce','1.0.0','active',false,true,false,'package'),
  ('unified_invoicing','Unified Invoicing','Facturen, creditnota’s, nummering, belastingen en levering.',true,'/admin/#invoicing','#f36f21','light',16,'{}'::jsonb,'commerce','1.0.0','active',false,true,false,'receipt'),
  ('nutrition','Nutrition Shop','Gezonde voeding en supplementen als aparte winkelmodule.',false,'/nutrition/','#236451','natural',20,'{}'::jsonb,'commerce','1.0.0','active',false,true,false,'salad'),
  ('rewards','FitCoins & FitKado','Beloningen sparen en inwisselen.',false,'/rewards/','#e4a800','premium',30,'{}'::jsonb,'commerce','1.0.0','active',false,true,false,'gift'),
  ('customer_portal','Customer Portal','Klantzelfservice voor bestellingen, facturen, profielen, service en documenten.',true,'/portal/','#f36f21','light',40,'{}'::jsonb,'portal','1.0.0','active',false,true,true,'user-round'),
  ('gym_platform','Gym Platform','Ledenbeheer, coaching, planning, metingen en gymoperaties.',false,'/gym/','#236451','natural',50,'{}'::jsonb,'gym','1.0.0','active',false,true,false,'dumbbell'),
  ('ai_services','AI Services','Beheerde AI-diensten, gebruiksbeleid, prompts, tools en auditing.',false,'/admin/#ai','#6d28d9','premium',60,'{}'::jsonb,'ai','1.0.0','active',false,true,false,'sparkles')
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  route = excluded.route,
  accent_color = excluded.accent_color,
  surface_style = excluded.surface_style,
  display_order = excluded.display_order,
  category = excluded.category,
  version = excluded.version,
  lifecycle_status = excluded.lifecycle_status,
  is_core = excluded.is_core,
  is_billable = excluded.is_billable,
  default_enabled = excluded.default_enabled,
  icon_key = excluded.icon_key,
  settings = coalesce(public.platform_modules.settings, excluded.settings),
  updated_at = now();

-- Enforce the immutable canonical business key at database level.
create unique index if not exists platform_modules_module_key_unique_idx
  on public.platform_modules (module_key);

-- Fail deployment when a duplicate key or duplicate canonical display identity remains.
do $$
declare
  duplicate_key_count integer;
  duplicate_canonical_name_count integer;
begin
  select count(*) into duplicate_key_count
  from (
    select module_key
    from public.platform_modules
    group by module_key
    having count(*) > 1
  ) duplicates;

  if duplicate_key_count <> 0 then
    raise exception 'Module Registry contains % duplicate module_key groups', duplicate_key_count;
  end if;

  select count(*) into duplicate_canonical_name_count
  from (
    select lower(name)
    from public.platform_modules
    where module_key in (
      'core_engine','command_center','commerce','combination_deals','unified_invoicing',
      'nutrition','rewards','customer_portal','gym_platform','ai_services'
    )
    group by lower(name)
    having count(*) > 1
  ) duplicates;

  if duplicate_canonical_name_count <> 0 then
    raise exception 'Module Registry contains % duplicate canonical display-name groups', duplicate_canonical_name_count;
  end if;
end
$$;

notify pgrst, 'reload schema';
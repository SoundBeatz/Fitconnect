-- Enforce and verify the four canonical FitConnect modules.
-- This migration is idempotent and intentionally fails when the registry
-- cannot contain the required records after repair.

insert into public.platform_modules (
  module_key,
  name,
  description,
  enabled,
  route,
  accent_color,
  surface_style,
  display_order,
  settings
)
values
  ('commerce','Commerce Shop','Productcatalogus, winkelmand en checkout.',true,'/shop/','#f36f21','light',10,'{}'::jsonb),
  ('combination_deals','Combination Deals','Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',true,'/admin/#combination-deals','#f36f21','premium',15,'{}'::jsonb),
  ('nutrition','Nutrition Shop','Gezonde voeding en supplementen als aparte winkelmodule.',false,'/nutrition/','#236451','natural',20,'{}'::jsonb),
  ('rewards','FitCoins & FitKado','Beloningen sparen en inwisselen.',false,'/rewards/','#e4a800','premium',30,'{}'::jsonb)
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  route = excluded.route,
  accent_color = excluded.accent_color,
  surface_style = excluded.surface_style,
  display_order = excluded.display_order,
  settings = coalesce(public.platform_modules.settings, excluded.settings),
  updated_at = now();

delete from public.platform_modules
where module_key = 'commerce.combination_deals';

do $$
declare
  canonical_count integer;
begin
  select count(*)
    into canonical_count
  from public.platform_modules
  where module_key in ('commerce','combination_deals','nutrition','rewards');

  if canonical_count <> 4 then
    raise exception 'Canonical Module Registry verification failed: expected 4 modules, found %', canonical_count;
  end if;

  if not exists (
    select 1
    from public.platform_modules
    where module_key = 'combination_deals'
      and route = '/admin/#combination-deals'
  ) then
    raise exception 'Combination Deals canonical record is missing or has an invalid route';
  end if;
end
$$;
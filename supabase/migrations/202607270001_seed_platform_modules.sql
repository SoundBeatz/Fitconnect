-- Canonical FitConnect platform module registry.
-- The database is the single source of truth; frontend code must not seed modules.

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
  (
    'commerce',
    'Commerce Shop',
    'Productcatalogus, winkelmand en checkout.',
    true,
    '/shop/',
    '#f36f21',
    'light',
    10,
    '{}'::jsonb
  ),
  (
    'commerce.combination_deals',
    'Combination Deals',
    'Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',
    true,
    '/admin/#combination-deals',
    '#f36f21',
    'premium',
    15,
    '{}'::jsonb
  ),
  (
    'nutrition',
    'Nutrition Shop',
    'Gezonde voeding en supplementen als aparte winkelmodule.',
    false,
    '/nutrition/',
    '#236451',
    'natural',
    20,
    '{}'::jsonb
  ),
  (
    'rewards',
    'FitCoins & FitKado',
    'Beloningen sparen en inwisselen.',
    false,
    '/rewards/',
    '#e4a800',
    'premium',
    30,
    '{}'::jsonb
  )
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

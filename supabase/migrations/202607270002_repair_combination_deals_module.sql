-- Repair migration: ensure Combination Deals exists in the canonical Module Registry.
-- This is intentionally a new migration because the original seed may already
-- be recorded as applied in production and therefore will not be re-executed.

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
values (
  'commerce.combination_deals',
  'Combination Deals',
  'Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',
  true,
  '/admin/#combination-deals',
  '#f36f21',
  'premium',
  15,
  '{}'::jsonb
)
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  enabled = true,
  route = excluded.route,
  accent_color = excluded.accent_color,
  surface_style = excluded.surface_style,
  display_order = excluded.display_order,
  settings = coalesce(public.platform_modules.settings, excluded.settings),
  updated_at = now();

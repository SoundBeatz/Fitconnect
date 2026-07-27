-- Normalize Combination Deals to the same top-level module-key pattern used by
-- Commerce Shop, Nutrition Shop and FitCoins & FitKado.
--
-- Existing settings are preserved from commerce.combination_deals when present.

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
select
  'combination_deals',
  coalesce(old.name, 'Combination Deals'),
  coalesce(old.description, 'Professionele productbundels met pakketprijs, planning en Bundle Intelligence.'),
  coalesce(old.enabled, true),
  coalesce(nullif(old.route, ''), '/admin/#combination-deals'),
  coalesce(nullif(old.accent_color, ''), '#f36f21'),
  coalesce(nullif(old.surface_style, ''), 'premium'),
  coalesce(old.display_order, 15),
  coalesce(old.settings, '{}'::jsonb)
from (select 1) seed
left join public.platform_modules old
  on old.module_key = 'commerce.combination_deals'
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  enabled = excluded.enabled,
  route = excluded.route,
  accent_color = excluded.accent_color,
  surface_style = excluded.surface_style,
  display_order = excluded.display_order,
  settings = excluded.settings,
  updated_at = now();

delete from public.platform_modules
where module_key = 'commerce.combination_deals';

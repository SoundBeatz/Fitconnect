alter table public.site_theme_settings
  add column if not exists font_family text not null default 'Arial, Helvetica, sans-serif',
  add column if not exists font_style text not null default 'normal',
  add column if not exists body_size numeric not null default 16,
  add column if not exists body_weight integer not null default 400,
  add column if not exists body_line_height numeric not null default 1.6,
  add column if not exists body_letter_spacing numeric not null default 0,
  add column if not exists body_transform text not null default 'none',
  add column if not exists body_decoration text not null default 'none',
  add column if not exists h1_size numeric not null default 24,
  add column if not exists h1_weight integer not null default 700,
  add column if not exists h1_line_height numeric not null default 1.24,
  add column if not exists h1_letter_spacing numeric not null default -0.02,
  add column if not exists h1_transform text not null default 'none',
  add column if not exists h1_decoration text not null default 'none',
  add column if not exists h2_size numeric not null default 20,
  add column if not exists h2_weight integer not null default 700,
  add column if not exists h2_line_height numeric not null default 1.3,
  add column if not exists h2_letter_spacing numeric not null default -0.015,
  add column if not exists h2_transform text not null default 'none',
  add column if not exists h2_decoration text not null default 'none',
  add column if not exists h3_size numeric not null default 18,
  add column if not exists h3_weight integer not null default 600,
  add column if not exists h3_line_height numeric not null default 1.35,
  add column if not exists h3_letter_spacing numeric not null default 0,
  add column if not exists h3_transform text not null default 'none',
  add column if not exists h3_decoration text not null default 'none';

insert into public.site_theme_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.site_theme_settings enable row level security;

drop policy if exists "Public can read site theme" on public.site_theme_settings;
create policy "Public can read site theme"
on public.site_theme_settings
for select
to anon, authenticated
using (id = 'default');

drop policy if exists "Admins manage site theme" on public.site_theme_settings;
create policy "Admins manage site theme"
on public.site_theme_settings
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

grant select on public.site_theme_settings to anon, authenticated;
grant insert, update, delete on public.site_theme_settings to authenticated;
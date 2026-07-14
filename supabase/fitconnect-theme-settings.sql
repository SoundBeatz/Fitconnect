create table if not exists public.site_theme_settings (
  id text primary key default 'default',
  accent text not null default '#f36f21',
  heading_size integer not null default 36 check (heading_size between 28 and 72),
  content_width integer not null default 1440 check (content_width between 960 and 1920),
  density text not null default 'comfortable' check (density in ('comfortable','compact')),
  radius integer not null default 18 check (radius between 0 and 32),
  updated_at timestamptz not null default now()
);

insert into public.site_theme_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.site_theme_settings enable row level security;

drop policy if exists "public reads theme settings" on public.site_theme_settings;
create policy "public reads theme settings"
on public.site_theme_settings
for select
to anon, authenticated
using (id = 'default');

drop policy if exists "admin manages theme settings" on public.site_theme_settings;
create policy "admin manages theme settings"
on public.site_theme_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on table public.site_theme_settings to anon, authenticated;
grant insert, update, delete on table public.site_theme_settings to authenticated;

notify pgrst, 'reload schema';

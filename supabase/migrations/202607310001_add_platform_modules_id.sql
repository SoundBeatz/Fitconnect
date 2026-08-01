-- Add a stable surrogate UUID to the existing canonical module registry.
-- module_key remains the business key and existing frontend/API behavior is preserved.

do $$
begin
  if to_regclass('public.platform_modules') is null then
    raise exception 'platform_modules must exist before adding its surrogate identifier';
  end if;
end
$$;

alter table public.platform_modules
  add column if not exists id uuid;

update public.platform_modules
set id = gen_random_uuid()
where id is null;

alter table public.platform_modules
  alter column id set default gen_random_uuid(),
  alter column id set not null;

create unique index if not exists platform_modules_id_unique_idx
  on public.platform_modules (id);

comment on column public.platform_modules.id is
  'Stable surrogate UUID for relational references; module_key remains the canonical business identifier.';

notify pgrst, 'reload schema';

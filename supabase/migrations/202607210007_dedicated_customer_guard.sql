-- Permanently keep the dedicated end-to-end identity customer-only.

create or replace function public.enforce_dedicated_customer_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (
    select 1
    from auth.users u
    where u.id = new.id
      and lower(u.email) = 'service@fit360.nl'
  ) then
    new.role := 'customer';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_dedicated_customer_role() from public;

drop trigger if exists profiles_dedicated_customer_role_guard on public.profiles;
create trigger profiles_dedicated_customer_role_guard
before insert or update of role on public.profiles
for each row execute function public.enforce_dedicated_customer_role();

update public.profiles p
set role = 'customer'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'service@fit360.nl'
  and p.role is distinct from 'customer';

notify pgrst, 'reload schema';

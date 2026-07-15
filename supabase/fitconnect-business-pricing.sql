alter table public.profiles
  add column if not exists account_type text not null default 'personal'
    check (account_type in ('personal','business')),
  add column if not exists company_name text,
  add column if not exists chamber_of_commerce text,
  add column if not exists vat_number text,
  add column if not exists customer_tier text not null default 'standard'
    check (customer_tier in ('standard','silver','gold','custom')),
  add column if not exists discount_percent numeric(5,2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  add column if not exists price_display text not null default 'gross'
    check (price_display in ('gross','net'));

update public.profiles
set price_display = case when account_type = 'business' then 'net' else 'gross' end
where price_display is null
   or price_display not in ('gross','net');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_type text;
begin
  requested_type := coalesce(new.raw_user_meta_data->>'account_type', 'personal');
  if requested_type not in ('personal','business') then
    requested_type := 'personal';
  end if;

  insert into public.profiles (
    id,
    full_name,
    phone,
    role,
    account_type,
    company_name,
    chamber_of_commerce,
    vat_number,
    customer_tier,
    discount_percent,
    price_display
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'phone',''),
    'customer',
    requested_type,
    nullif(new.raw_user_meta_data->>'company_name',''),
    nullif(new.raw_user_meta_data->>'chamber_of_commerce',''),
    nullif(new.raw_user_meta_data->>'vat_number',''),
    'standard',
    0,
    case when requested_type = 'business' then 'net' else 'gross' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

notify pgrst, 'reload schema';
-- Bind authenticated checkout profiles to the checkout organization and block silent cross-tenant reassignment.
create or replace function public.commerce_checkout_sync_profile_account_type()
returns trigger
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_existing_org uuid;
begin
  if new.user_id is not null then
    select organization_id into v_existing_org
    from public.profiles
    where id = new.user_id
    for update;

    if found and v_existing_org is not null and v_existing_org is distinct from new.organization_id then
      raise exception 'Profile organization mismatch';
    end if;

    update public.profiles
       set organization_id = coalesce(organization_id,new.organization_id),
           account_type = coalesce(new.account_type,'private'),
           company_name = case when new.account_type='business' then new.company_name else null end,
           chamber_of_commerce = case when new.account_type='business' then new.chamber_of_commerce else null end,
           vat_number = case when new.account_type='business' then new.vat_number else null end,
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$function$;

revoke all on function public.commerce_checkout_sync_profile_account_type() from public,anon,authenticated;

comment on function public.commerce_checkout_sync_profile_account_type() is
  'Internal checkout trigger: synchronizes account type and binds an unscoped customer profile to the checkout organization; rejects cross-tenant reassignment.';

notify pgrst,'reload schema';

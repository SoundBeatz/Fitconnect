-- Customer Credit Package Manager v1
create or replace function public.customer_admin_upsert_credit_package(
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_credit_amount numeric,
  p_active boolean,
  p_sort_order integer
)
returns public.customer_credit_packages
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_row public.customer_credit_packages%rowtype;
begin
  if auth.uid() is null or not public.command_center_is_admin() then
    raise exception 'Admin authorization required';
  end if;
  v_org := public.commerce_current_organization();
  if v_org is null then raise exception 'Organization unavailable'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Package name is required'; end if;
  if p_price is null or p_price <= 0 or p_price > 100000 then raise exception 'Invalid package price'; end if;
  if p_credit_amount is null or p_credit_amount <= 0 or p_credit_amount > 1000000 then raise exception 'Invalid credit amount'; end if;

  if p_id is null then
    insert into public.customer_credit_packages(organization_id,name,description,price,credit_amount,currency,active,sort_order)
    values(v_org,trim(p_name),nullif(trim(coalesce(p_description,'')),''),round(p_price,2),round(p_credit_amount,2),'EUR',coalesce(p_active,false),coalesce(p_sort_order,100))
    returning * into v_row;
  else
    update public.customer_credit_packages
       set name=trim(p_name),
           description=nullif(trim(coalesce(p_description,'')),''),
           price=round(p_price,2),
           credit_amount=round(p_credit_amount,2),
           active=coalesce(p_active,false),
           sort_order=coalesce(p_sort_order,100),
           updated_at=now()
     where id=p_id and organization_id=v_org
     returning * into v_row;
    if not found then raise exception 'Package not found'; end if;
  end if;
  return v_row;
end;
$$;

create or replace function public.customer_admin_set_credit_package_active(p_id uuid,p_active boolean)
returns public.customer_credit_packages
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_row public.customer_credit_packages%rowtype;
begin
  if auth.uid() is null or not public.command_center_is_admin() then raise exception 'Admin authorization required'; end if;
  v_org:=public.commerce_current_organization();
  update public.customer_credit_packages set active=coalesce(p_active,false),updated_at=now()
   where id=p_id and organization_id=v_org returning * into v_row;
  if not found then raise exception 'Package not found'; end if;
  return v_row;
end;
$$;

revoke all on function public.customer_admin_upsert_credit_package(uuid,text,text,numeric,numeric,boolean,integer) from public,anon;
revoke all on function public.customer_admin_set_credit_package_active(uuid,boolean) from public,anon;
grant execute on function public.customer_admin_upsert_credit_package(uuid,text,text,numeric,numeric,boolean,integer) to authenticated;
grant execute on function public.customer_admin_set_credit_package_active(uuid,boolean) to authenticated;

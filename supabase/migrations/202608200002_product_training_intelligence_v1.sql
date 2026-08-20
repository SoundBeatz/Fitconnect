-- FitConnect Product Training Intelligence v1
-- Admin-safe product tagging + public product recommendations.

create or replace function public.training_admin_is_allowed()
returns boolean
language sql
stable
security invoker
set search_path=public
as $$
  select coalesce((select p.role='admin' from public.profiles p where p.id=auth.uid()), false)
$$;

revoke all on function public.training_admin_is_allowed() from public,anon;
grant execute on function public.training_admin_is_allowed() to authenticated;

create or replace function public.training_product_taxonomy(p_product_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path=public
as $$
  select jsonb_build_object(
    'equipment', coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'slug',e.slug,'name',e.name,'group',e.equipment_group) order by e.equipment_group,e.sort_order,e.name)
      from public.product_equipment_types pe join public.equipment_types e on e.id=pe.equipment_type_id where pe.product_id=p_product_id), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'slug',x.slug,'name',x.name,'suitability',px.suitability) order by x.sort_order,x.name)
      from public.product_exercises px join public.exercises x on x.id=px.exercise_id where px.product_id=p_product_id), '[]'::jsonb)
  )
$$;

grant execute on function public.training_product_taxonomy(uuid) to authenticated;

create or replace function public.training_admin_set_product_taxonomy(
  p_product_id uuid,
  p_equipment_ids uuid[] default '{}'::uuid[],
  p_exercise_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.training_admin_is_allowed() then
    raise exception 'Admin access required';
  end if;
  if not exists(select 1 from public.products where id=p_product_id) then
    raise exception 'Product not found';
  end if;

  delete from public.product_equipment_types where product_id=p_product_id;
  insert into public.product_equipment_types(product_id,equipment_type_id)
  select p_product_id,id from public.equipment_types where id=any(coalesce(p_equipment_ids,'{}'::uuid[])) and is_active
  on conflict do nothing;

  delete from public.product_exercises where product_id=p_product_id;
  insert into public.product_exercises(product_id,exercise_id,suitability)
  select p_product_id,id,100 from public.exercises where id=any(coalesce(p_exercise_ids,'{}'::uuid[])) and is_active
  on conflict do nothing;

  return public.training_product_taxonomy(p_product_id);
end
$$;

revoke all on function public.training_admin_set_product_taxonomy(uuid,uuid[],uuid[]) from public,anon;
grant execute on function public.training_admin_set_product_taxonomy(uuid,uuid[],uuid[]) to authenticated;

create or replace function public.training_products_for_equipment(p_equipment_slug text, p_limit integer default 12)
returns table(
  product_id uuid,
  slug text,
  name text,
  brand text,
  model text,
  price numeric,
  vat integer,
  image_url text,
  equipment_slug text,
  equipment_name text
)
language sql
stable
security invoker
set search_path=public
as $$
  select p.id,p.slug,p.name,p.brand,p.model,p.price,p.vat,
    case when jsonb_typeof(p.images)='array' and jsonb_array_length(p.images)>0 then p.images->>0 else null end,
    e.slug,e.name
  from public.product_equipment_types pe
  join public.equipment_types e on e.id=pe.equipment_type_id
  join public.products p on p.id=pe.product_id
  where e.slug=p_equipment_slug and e.is_active and p.status='active'
  order by p.featured desc,p.updated_at desc,p.name
  limit greatest(1,least(coalesce(p_limit,12),48))
$$;

grant execute on function public.training_products_for_equipment(text,integer) to anon,authenticated;

drop policy if exists product_exercises_admin_write on public.product_exercises;
create policy product_exercises_admin_write on public.product_exercises for all to authenticated
using (public.training_admin_is_allowed()) with check (public.training_admin_is_allowed());
drop policy if exists product_equipment_types_admin_write on public.product_equipment_types;
create policy product_equipment_types_admin_write on public.product_equipment_types for all to authenticated
using (public.training_admin_is_allowed()) with check (public.training_admin_is_allowed());

grant insert,update,delete on public.product_exercises,public.product_equipment_types to authenticated;

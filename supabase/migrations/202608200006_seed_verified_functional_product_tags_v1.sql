-- Verified functional catalog tags only.
-- BruForce Wallball 12 is explicitly a wall ball product.

insert into public.product_equipment_types(product_id,equipment_type_id)
select p.id,e.id
from public.products p
join public.equipment_types e on e.slug='wall-ball'
where p.status='active'
  and lower(coalesce(p.name,'')) like '%wallball%'
on conflict do nothing;

insert into public.product_exercises(product_id,exercise_id,suitability)
select p.id,x.id,100
from public.products p
join public.exercises x on x.slug='wall-ball-shot'
where p.status='active'
  and lower(coalesce(p.name,'')) like '%wallball%'
on conflict do nothing;

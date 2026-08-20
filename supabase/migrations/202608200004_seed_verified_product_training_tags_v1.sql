-- Seed only product taxonomy that is externally/verifiably supported.
-- Technogym PA04 is an adjustable bench with 0-85 degree backrest positions; no decline classification.

with products_to_tag as (
  select id from public.products
  where status='active' and (model='PA04' or lower(name) like '%pa04%')
), equipment as (
  select id from public.equipment_types where slug='adjustable-incline-bench'
)
insert into public.product_equipment_types(product_id,equipment_type_id)
select p.id,e.id from products_to_tag p cross join equipment e
on conflict do nothing;

with products_to_tag as (
  select id from public.products
  where status='active' and (model='PA04' or lower(name) like '%pa04%')
), exercises_to_tag as (
  select id from public.exercises where slug in ('dumbbell-bench-press','incline-bench-press','shoulder-press')
)
insert into public.product_exercises(product_id,exercise_id,suitability)
select p.id,e.id,100 from products_to_tag p cross join exercises_to_tag e
on conflict do nothing;

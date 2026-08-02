-- Keep exactly one canonical Combination Deals module in platform_modules.
-- Canonical identity: module_key = 'combination_deals'.
--
-- This migration is intentionally narrow:
--   * it does not touch any other module;
--   * it preserves the canonical record and its settings;
--   * it removes only legacy aliases that identify themselves as Combination Deals.

begin;

-- Fail safely if the canonical module is absent. We never delete aliases without
-- first proving that the canonical replacement exists.
do $$
begin
  if not exists (
    select 1
    from public.platform_modules
    where module_key = 'combination_deals'
  ) then
    raise exception 'Canonical module combination_deals is missing; deduplication aborted.';
  end if;
end
$$;

-- Remove every non-canonical legacy record whose functional identity is
-- Combination Deals. This covers old dotted, dashed and renamed aliases while
-- leaving all unrelated modules untouched.
delete from public.platform_modules
where module_key <> 'combination_deals'
  and (
    lower(trim(coalesce(name, ''))) = 'combination deals'
    or lower(trim(module_key)) in (
      'commerce.combination_deals',
      'commerce_combination_deals',
      'combination-deals',
      'combination.deals',
      'combinationdeals'
    )
    or lower(trim(coalesce(route, ''))) in (
      '/admin/#combination-deals',
      '#combination-deals'
    )
  );

-- Postcondition: exactly one functional Combination Deals registration remains.
do $$
declare
  duplicate_count integer;
begin
  select count(*)
    into duplicate_count
  from public.platform_modules
  where module_key = 'combination_deals'
     or lower(trim(coalesce(name, ''))) = 'combination deals'
     or lower(trim(module_key)) in (
       'commerce.combination_deals',
       'commerce_combination_deals',
       'combination-deals',
       'combination.deals',
       'combinationdeals'
     )
     or lower(trim(coalesce(route, ''))) in (
       '/admin/#combination-deals',
       '#combination-deals'
     );

  if duplicate_count <> 1 then
    raise exception 'Combination Deals registry postcondition failed: expected 1 record, found %.', duplicate_count;
  end if;
end
$$;

commit;

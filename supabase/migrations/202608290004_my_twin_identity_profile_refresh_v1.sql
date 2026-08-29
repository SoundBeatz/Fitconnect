create or replace function public.my_twin_identity_profile_touch()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.source_sha256 is distinct from old.source_sha256 then
    new.identity_revision := old.identity_revision + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_my_twin_identity_profile_touch on public.my_twin_identity_profiles;
create trigger trg_my_twin_identity_profile_touch
before update on public.my_twin_identity_profiles
for each row execute function public.my_twin_identity_profile_touch();

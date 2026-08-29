revoke all on public.my_twin_identity_profiles from service_role;
revoke all on public.my_twin_generation_jobs from service_role;
grant select, insert, update, delete on public.my_twin_identity_profiles to service_role;
grant select, insert, update, delete on public.my_twin_generation_jobs to service_role;

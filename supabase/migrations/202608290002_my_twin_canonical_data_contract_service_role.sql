-- My Twin canonical data contract backend rights.
-- Browser access remains constrained by existing RLS policies.

grant select, insert, update on table public.user_avatars to service_role;
grant select, insert, delete on table public.avatar_versions to service_role;

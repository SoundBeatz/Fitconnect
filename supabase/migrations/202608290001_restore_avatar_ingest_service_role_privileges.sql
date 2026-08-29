-- My Twin ingest audit/rate-limit table is server-only.
-- Client roles remain fully denied; the Edge Function service role needs only
-- the minimum privileges required for count/insert/cleanup.

grant select, insert, delete on table public.avatar_ingest_attempts to service_role;
grant usage, select on sequence public.avatar_ingest_attempts_id_seq to service_role;

revoke all on table public.avatar_ingest_attempts from anon, authenticated;
revoke all on sequence public.avatar_ingest_attempts_id_seq from anon, authenticated;

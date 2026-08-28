drop policy if exists avatar_ingest_attempts_client_deny on public.avatar_ingest_attempts;

create policy avatar_ingest_attempts_client_deny
on public.avatar_ingest_attempts
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

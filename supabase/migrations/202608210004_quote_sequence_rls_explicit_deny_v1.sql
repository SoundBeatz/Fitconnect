-- Make the internal-only quote number sequence contract explicit to the RLS linter.
-- Client roles already have no table privileges; this policy is defense-in-depth
-- and prevents accidental exposure if grants are changed later.

alter table public.commerce_quote_number_sequences enable row level security;

revoke all on public.commerce_quote_number_sequences from anon, authenticated;

drop policy if exists commerce_quote_number_sequences_client_deny on public.commerce_quote_number_sequences;
create policy commerce_quote_number_sequences_client_deny
on public.commerce_quote_number_sequences
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.commerce_quote_number_sequences is
  'Internal quote-number counter. Client roles are explicitly denied; mutations occur only through trusted quote workflows/service role.';

notify pgrst,'reload schema';

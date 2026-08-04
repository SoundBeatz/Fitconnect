begin;

create table if not exists public.commerce_security_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

create table if not exists public.commerce_checkout_security_nonces (
  jti uuid primary key,
  email_hash text not null,
  ip_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists commerce_checkout_security_nonces_expiry_idx
  on public.commerce_checkout_security_nonces (expires_at)
  where used_at is null;

alter table public.commerce_security_rate_limits enable row level security;
alter table public.commerce_checkout_security_nonces enable row level security;

revoke all on public.commerce_security_rate_limits from anon, authenticated;
revoke all on public.commerce_checkout_security_nonces from anon, authenticated;

create or replace function public.commerce_consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_attempts integer;
begin
  if coalesce(length(trim(p_scope)), 0) = 0
     or coalesce(length(trim(p_key_hash)), 0) < 16
     or p_limit < 1
     or p_window_seconds < 1 then
    raise exception 'Invalid rate-limit arguments';
  end if;

  select window_started_at, attempts
    into v_window_start, v_attempts
  from public.commerce_security_rate_limits
  where scope = p_scope and key_hash = p_key_hash
  for update;

  if not found then
    insert into public.commerce_security_rate_limits(scope, key_hash, window_started_at, attempts, updated_at)
    values (p_scope, p_key_hash, v_now, 1, v_now);
    return query select true, greatest(p_limit - 1, 0), 0;
    return;
  end if;

  if v_window_start + make_interval(secs => p_window_seconds) <= v_now then
    update public.commerce_security_rate_limits
       set window_started_at = v_now, attempts = 1, updated_at = v_now
     where scope = p_scope and key_hash = p_key_hash;
    return query select true, greatest(p_limit - 1, 0), 0;
    return;
  end if;

  if v_attempts >= p_limit then
    return query select false, 0,
      greatest(ceil(extract(epoch from ((v_window_start + make_interval(secs => p_window_seconds)) - v_now)))::integer, 1);
    return;
  end if;

  update public.commerce_security_rate_limits
     set attempts = attempts + 1, updated_at = v_now
   where scope = p_scope and key_hash = p_key_hash;

  return query select true, greatest(p_limit - v_attempts - 1, 0), 0;
end;
$$;

create or replace function public.commerce_consume_checkout_nonce(
  p_jti uuid,
  p_email_hash text,
  p_ip_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.commerce_checkout_security_nonces
     set used_at = clock_timestamp()
   where jti = p_jti
     and email_hash = p_email_hash
     and ip_hash = p_ip_hash
     and used_at is null
     and expires_at > clock_timestamp();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.commerce_consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.commerce_consume_checkout_nonce(uuid, text, text) from public, anon, authenticated;
grant execute on function public.commerce_consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.commerce_consume_checkout_nonce(uuid, text, text) to service_role;

commit;

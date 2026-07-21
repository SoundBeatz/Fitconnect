-- FitConnect Rewards v1: FitCoins ledger, earning rules and FitKado redemption.
create table if not exists public.fitcoin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitcoin_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_key text not null unique,
  calculation_type text not null default 'fixed' check (calculation_type in ('fixed','per_euro','percentage')),
  value numeric(12,2) not null default 0 check (value >= 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  enabled boolean not null default true,
  expires_after_days integer check (expires_after_days is null or expires_after_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitcoin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('earned','spent','adjustment','expired','reversal')),
  description text not null,
  source_type text,
  source_id text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists fitcoin_transactions_source_unique
  on public.fitcoin_transactions(user_id, source_type, source_id)
  where source_type is not null and source_id is not null;
create index if not exists fitcoin_transactions_user_created_idx on public.fitcoin_transactions(user_id, created_at desc);

create table if not exists public.fitkados (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  coin_cost bigint not null check (coin_cost > 0),
  stock integer check (stock is null or stock >= 0),
  status text not null default 'draft' check (status in ('active','draft','archived')),
  featured boolean not null default false,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitkado_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fitkado_id uuid not null references public.fitkados(id),
  coin_cost bigint not null check (coin_cost > 0),
  status text not null default 'requested' check (status in ('requested','approved','fulfilled','cancelled')),
  delivery_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fitcoin_accounts enable row level security;
alter table public.fitcoin_rules enable row level security;
alter table public.fitcoin_transactions enable row level security;
alter table public.fitkados enable row level security;
alter table public.fitkado_redemptions enable row level security;

create or replace function public.is_fitconnect_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

drop policy if exists "Users read own FitCoin account" on public.fitcoin_accounts;
create policy "Users read own FitCoin account" on public.fitcoin_accounts for select to authenticated using (user_id=auth.uid() or public.is_fitconnect_admin());
drop policy if exists "Users read own FitCoin transactions" on public.fitcoin_transactions;
create policy "Users read own FitCoin transactions" on public.fitcoin_transactions for select to authenticated using (user_id=auth.uid() or public.is_fitconnect_admin());
drop policy if exists "Public reads active FitKados" on public.fitkados;
create policy "Public reads active FitKados" on public.fitkados for select to authenticated using (status='active' or public.is_fitconnect_admin());
drop policy if exists "Admins manage FitKados" on public.fitkados;
create policy "Admins manage FitKados" on public.fitkados for all to authenticated using (public.is_fitconnect_admin()) with check (public.is_fitconnect_admin());
drop policy if exists "Admins manage FitCoin rules" on public.fitcoin_rules;
create policy "Admins manage FitCoin rules" on public.fitcoin_rules for all to authenticated using (public.is_fitconnect_admin()) with check (public.is_fitconnect_admin());
drop policy if exists "Users read own redemptions" on public.fitkado_redemptions;
create policy "Users read own redemptions" on public.fitkado_redemptions for select to authenticated using (user_id=auth.uid() or public.is_fitconnect_admin());
drop policy if exists "Admins update redemptions" on public.fitkado_redemptions;
create policy "Admins update redemptions" on public.fitkado_redemptions for update to authenticated using (public.is_fitconnect_admin()) with check (public.is_fitconnect_admin());

create or replace function public.adjust_fitcoins(target_user uuid, coin_amount bigint, reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare transaction_id uuid;
begin
  if not public.is_fitconnect_admin() then raise exception 'Admin access required'; end if;
  if coin_amount=0 or nullif(trim(reason),'') is null then raise exception 'Amount and reason are required'; end if;
  insert into public.fitcoin_accounts(user_id) values(target_user) on conflict(user_id) do nothing;
  update public.fitcoin_accounts set balance=balance+coin_amount,
    lifetime_earned=lifetime_earned+greatest(coin_amount,0), lifetime_spent=lifetime_spent+greatest(-coin_amount,0), updated_at=now()
  where user_id=target_user and balance+coin_amount>=0;
  if not found then raise exception 'Insufficient FitCoins'; end if;
  insert into public.fitcoin_transactions(user_id,amount,transaction_type,description,source_type,created_by)
  values(target_user,coin_amount,'adjustment',trim(reason),'admin',auth.uid()) returning id into transaction_id;
  return transaction_id;
end $$;

create or replace function public.award_order_fitcoins(target_user uuid, order_reference text, order_total numeric)
returns bigint language plpgsql security definer set search_path=public as $$
declare coins bigint; rule_record public.fitcoin_rules%rowtype;
begin
  if not public.is_fitconnect_admin() then raise exception 'Server or admin access required'; end if;
  select * into rule_record from public.fitcoin_rules where event_key='paid_order' and enabled=true;
  if not found or order_total < rule_record.minimum_order_amount then return 0; end if;
  coins := case rule_record.calculation_type when 'per_euro' then floor(order_total*rule_record.value)::bigint when 'percentage' then floor(order_total*rule_record.value/100)::bigint else floor(rule_record.value)::bigint end;
  if coins<=0 then return 0; end if;
  insert into public.fitcoin_accounts(user_id) values(target_user) on conflict(user_id) do nothing;
  insert into public.fitcoin_transactions(user_id,amount,transaction_type,description,source_type,source_id,expires_at,created_by)
  values(target_user,coins,'earned','FitCoins voor betaalde bestelling','order',order_reference,
    case when rule_record.expires_after_days is null then null else now()+make_interval(days=>rule_record.expires_after_days) end,auth.uid())
  on conflict do nothing;
  if not found then return 0; end if;
  update public.fitcoin_accounts set balance=balance+coins,lifetime_earned=lifetime_earned+coins,updated_at=now() where user_id=target_user;
  return coins;
end $$;

create or replace function public.redeem_fitkado(reward_id uuid, notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare reward public.fitkados%rowtype; redemption_id uuid;
begin
  select * into reward from public.fitkados where id=reward_id and status='active' for update;
  if not found then raise exception 'FitKado is niet beschikbaar'; end if;
  if reward.stock is not null and reward.stock<=0 then raise exception 'FitKado is uitverkocht'; end if;
  insert into public.fitcoin_accounts(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  update public.fitcoin_accounts set balance=balance-reward.coin_cost,lifetime_spent=lifetime_spent+reward.coin_cost,updated_at=now()
    where user_id=auth.uid() and balance>=reward.coin_cost;
  if not found then raise exception 'Onvoldoende FitCoins'; end if;
  insert into public.fitkado_redemptions(user_id,fitkado_id,coin_cost,delivery_notes) values(auth.uid(),reward.id,reward.coin_cost,nullif(trim(notes),'')) returning id into redemption_id;
  insert into public.fitcoin_transactions(user_id,amount,transaction_type,description,source_type,source_id)
    values(auth.uid(),-reward.coin_cost,'spent','Ingewisseld voor '||reward.name,'redemption',redemption_id::text);
  if reward.stock is not null then update public.fitkados set stock=stock-1,updated_at=now() where id=reward.id; end if;
  return redemption_id;
end $$;

create or replace function public.update_fitkado_redemption(redemption_id uuid, new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare redemption public.fitkado_redemptions%rowtype;
begin
  if not public.is_fitconnect_admin() then raise exception 'Admin access required'; end if;
  if new_status not in ('requested','approved','fulfilled','cancelled') then raise exception 'Invalid redemption status'; end if;
  select * into redemption from public.fitkado_redemptions where id=redemption_id for update;
  if not found then raise exception 'Redemption not found'; end if;
  if redemption.status='cancelled' and new_status<>'cancelled' then raise exception 'A cancelled redemption cannot be reopened'; end if;
  if new_status='cancelled' and redemption.status<>'cancelled' then
    update public.fitcoin_accounts set balance=balance+redemption.coin_cost,
      lifetime_spent=greatest(lifetime_spent-redemption.coin_cost,0),updated_at=now() where user_id=redemption.user_id;
    insert into public.fitcoin_transactions(user_id,amount,transaction_type,description,source_type,source_id,created_by)
      values(redemption.user_id,redemption.coin_cost,'reversal','Terugboeking geannuleerd FitKado','redemption_reversal',redemption.id::text,auth.uid());
    update public.fitkados set stock=case when stock is null then null else stock+1 end,updated_at=now() where id=redemption.fitkado_id;
  end if;
  update public.fitkado_redemptions set status=new_status,updated_at=now() where id=redemption.id;
end $$;

insert into public.fitcoin_rules(name,event_key,calculation_type,value,minimum_order_amount,enabled)
values('Aankoopbeloning','paid_order','per_euro',1,0,true)
on conflict(event_key) do nothing;

grant select on public.fitcoin_accounts,public.fitcoin_transactions,public.fitcoin_rules,public.fitkados,public.fitkado_redemptions to authenticated;
grant insert,update,delete on public.fitcoin_rules,public.fitkados to authenticated;
grant update on public.fitkado_redemptions to authenticated;
grant execute on function public.adjust_fitcoins(uuid,bigint,text),public.award_order_fitcoins(uuid,text,numeric),public.redeem_fitkado(uuid,text),public.update_fitkado_redemption(uuid,text) to authenticated;

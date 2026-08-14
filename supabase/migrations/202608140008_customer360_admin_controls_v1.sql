-- Customer 360 admin controls: tenant scope + immutable wallet mutations.

do $$ declare t text; begin
 foreach t in array array['customer_communications','customer_documents','customer_wallets','customer_wallet_ledger','customer_subscription_plans','customer_subscriptions'] loop
  execute format('drop policy if exists %I_admin_all on public.%I',t,t);
  execute format('create policy %I_admin_all on public.%I for all to authenticated using(public.command_center_is_admin() and organization_id=public.commerce_current_organization()) with check(public.command_center_is_admin() and organization_id=public.commerce_current_organization())',t,t);
 end loop;
end $$;

create or replace function public.customer360_admin_add_wallet_entry(p_customer_user_id uuid,p_amount numeric,p_entry_type text,p_description text default null,p_idempotency_key text default null)
returns public.customer_wallet_ledger
language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_wallet public.customer_wallets%rowtype; v_entry public.customer_wallet_ledger%rowtype;
begin
 if not public.command_center_is_admin() then raise exception 'Admin required'; end if;
 v_org:=public.commerce_current_organization(); if v_org is null then raise exception 'Organization required'; end if;
 if p_customer_user_id is null or p_amount=0 then raise exception 'Customer and non-zero amount required'; end if;
 if p_entry_type not in ('manual_credit','redemption','refund','expiry','correction','subscription_credit','purchase') then raise exception 'Invalid entry type'; end if;
 insert into public.customer_wallets(organization_id,customer_user_id,currency) values(v_org,p_customer_user_id,'EUR') on conflict(organization_id,customer_user_id,currency) do update set updated_at=now() returning * into v_wallet;
 insert into public.customer_wallet_ledger(wallet_id,organization_id,customer_user_id,entry_type,amount,currency,description,idempotency_key,created_by)
 values(v_wallet.id,v_org,p_customer_user_id,p_entry_type,p_amount,'EUR',nullif(trim(p_description),''),p_idempotency_key,auth.uid()) returning * into v_entry;
 return v_entry;
end $$;
revoke all on function public.customer360_admin_add_wallet_entry(uuid,numeric,text,text,text) from public,anon;
grant execute on function public.customer360_admin_add_wallet_entry(uuid,numeric,text,text,text) to authenticated;

create or replace function public.customer360_admin_add_communication(p_customer_user_id uuid,p_subject text,p_body text,p_visible boolean default true)
returns public.customer_communications language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_row public.customer_communications%rowtype; begin
 if not public.command_center_is_admin() then raise exception 'Admin required'; end if; v_org:=public.commerce_current_organization();
 if v_org is null or p_customer_user_id is null or nullif(trim(p_body),'') is null then raise exception 'Required fields missing'; end if;
 insert into public.customer_communications(organization_id,customer_user_id,channel,direction,subject,body,visible_to_customer,created_by)
 values(v_org,p_customer_user_id,'portal','outbound',nullif(trim(p_subject),''),trim(p_body),p_visible,auth.uid()) returning * into v_row; return v_row; end $$;
revoke all on function public.customer360_admin_add_communication(uuid,text,text,boolean) from public,anon;
grant execute on function public.customer360_admin_add_communication(uuid,text,text,boolean) to authenticated;

create or replace function public.customer360_admin_assign_subscription(p_customer_user_id uuid,p_plan_id uuid)
returns public.customer_subscriptions language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_plan public.customer_subscription_plans%rowtype; v_row public.customer_subscriptions%rowtype; begin
 if not public.command_center_is_admin() then raise exception 'Admin required'; end if; v_org:=public.commerce_current_organization();
 select * into v_plan from public.customer_subscription_plans where id=p_plan_id and organization_id=v_org and active=true; if not found then raise exception 'Plan not found'; end if;
 insert into public.customer_subscriptions(organization_id,customer_user_id,plan_id,status,current_period_start,current_period_end,metadata)
 values(v_org,p_customer_user_id,p_plan_id,'pending',now(),case v_plan.billing_interval when 'month' then now()+interval '1 month' when 'quarter' then now()+interval '3 months' else now()+interval '1 year' end,jsonb_build_object('activation','manual_pending_payment')) returning * into v_row; return v_row; end $$;
revoke all on function public.customer360_admin_assign_subscription(uuid,uuid) from public,anon;
grant execute on function public.customer360_admin_assign_subscription(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
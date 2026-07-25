begin;
alter table public.commerce_combination_deals
 add column if not exists internal_reference text,
 add column if not exists starts_at timestamptz,
 add column if not exists ends_at timestamptz,
 add column if not exists is_open_ended boolean not null default false,
 add column if not exists auto_publish boolean not null default true,
 add column if not exists auto_archive boolean not null default true,
 add column if not exists short_description text,
 add column if not exists long_description_text text,
 add column if not exists is_featured boolean not null default false,
 add column if not exists quote_enabled boolean not null default true,
 add column if not exists cart_enabled boolean not null default true,
 add column if not exists wishlist_enabled boolean not null default true,
 add column if not exists hide_when_unavailable boolean not null default false,
 add column if not exists allow_backorder boolean not null default false,
 add column if not exists published_at timestamptz,
 add column if not exists archived_at timestamptz;

alter table public.commerce_combination_deal_items
 add column if not exists sort_order integer not null default 0,
 add column if not exists unit_price numeric(12,2),
 add column if not exists is_primary boolean not null default false;

create index if not exists commerce_combination_deals_schedule_idx
 on public.commerce_combination_deals(starts_at,ends_at,status);
create index if not exists commerce_combination_deal_items_sort_idx
 on public.commerce_combination_deal_items(bundle_id,sort_order);

create or replace function public.commerce_search_products_for_bundle(p_query text,p_limit integer default 12)
returns table(id uuid,name text,sku text,price numeric,purchase_price numeric,brand text,category text)
language sql stable security definer set search_path=public as $$
 select p.id,p.name,p.sku,p.price,p.purchase_price,
        coalesce(p.brand_name,''),coalesce(p.category_name,'')
 from public.products p
 where p.is_active=true
   and length(trim(coalesce(p_query,'')))>=3
   and (p.name ilike '%'||trim(p_query)||'%' or p.sku ilike '%'||trim(p_query)||'%'
        or coalesce(p.brand_name,'') ilike '%'||trim(p_query)||'%'
        or coalesce(p.category_name,'') ilike '%'||trim(p_query)||'%')
 order by case when p.name ilike trim(p_query)||'%' then 0 else 1 end,p.name
 limit greatest(1,least(coalesce(p_limit,12),50));
$$;

create or replace function public.commerce_bundle_readiness(p_bundle_id uuid)
returns table(readiness_score integer,publishable boolean,blocking_reason text)
language sql stable security definer set search_path=public as $$
 with b as(select * from public.commerce_combination_deals where id=p_bundle_id),
 i as(select count(*) product_count,coalesce(sum(quantity),0) total_units from public.commerce_combination_deal_items where bundle_id=p_bundle_id),
 r as(select
  (length(trim(coalesce(b.name,'')))>=3 and length(trim(coalesce(b.slug,'')))>=3) basics,
  (i.product_count>=2) products,
  (i.product_count>=2 and i.total_units>=2) composition,
  (coalesce(b.bundle_price,0)>0 and coalesce(b.gross_margin_percentage,0)>=coalesce(b.minimum_margin_percentage,0)) pricing,
  (b.starts_at is not null and (b.is_open_ended or (b.ends_at is not null and b.ends_at>b.starts_at))) schedule,
  (length(trim(coalesce(b.short_description,'')))>=60 and length(trim(coalesce(b.long_description_text,'')))>=320) content,
  coalesce(b.publish_blocked,false) blocked,
  coalesce(b.pricing_approval_required,false) approval_required,
  coalesce(b.pricing_approved,false) approved
 from b cross join i)
 select ((basics::int+products::int+composition::int+pricing::int+schedule::int+content::int)*100/6)::int,
        basics and products and composition and pricing and schedule and content and not blocked and (not approval_required or approved),
        case when blocked then 'publish_blocked' when approval_required and not approved then 'pricing_approval_required'
             when not basics then 'basics_incomplete' when not products then 'products_incomplete'
             when not composition then 'composition_incomplete' when not pricing then 'pricing_incomplete'
             when not schedule then 'schedule_incomplete' when not content then 'content_incomplete' else null end
 from r;
$$;

create or replace function public.commerce_process_bundle_schedule()
returns table(published_count integer,archived_count integer)
language plpgsql security definer set search_path=public as $$
declare p integer:=0;a integer:=0;
begin
 update public.commerce_combination_deals set status='published',published_at=coalesce(published_at,now()),updated_at=now()
 where auto_publish=true and starts_at is not null and starts_at<=now() and status in('draft','review','scheduled');
 get diagnostics p=row_count;
 update public.commerce_combination_deals set status='archived',archived_at=coalesce(archived_at,now()),updated_at=now()
 where auto_archive=true and is_open_ended=false and ends_at is not null and ends_at<now() and status<>'archived';
 get diagnostics a=row_count;
 return query select p,a;
end;$$;

grant execute on function public.commerce_search_products_for_bundle(text,integer) to authenticated;
grant execute on function public.commerce_bundle_readiness(uuid) to authenticated;
grant execute on function public.commerce_process_bundle_schedule() to service_role;
commit;
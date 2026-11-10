-- Run this in the Supabase SQL Editor. Never put a service-role key in the browser.
create table if not exists public.orders (
  id text primary key,
  tracking_token uuid not null unique,
  customer_user_id uuid references auth.users(id),
  customer_first_name text,
  customer_last_name text,
  customer_name text not null,
  phone text not null,
  email text not null,
  description text not null,
  collection_date date not null,
  allergies text,
  photo_paths jsonb not null default '[]'::jsonb,
  agreed_cost text,
  preferred_collection_time text,
  collection_time text,
  status text not null default 'Awaiting details' check (status in ('Awaiting details', 'Accepted', 'Rejected', 'Awaiting price agreement', 'Price declined', 'Preparing', 'Ready for collection')),
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_user_id uuid references auth.users(id);
alter table public.orders add column if not exists customer_first_name text;
alter table public.orders add column if not exists customer_last_name text;
alter table public.orders add column if not exists preferred_collection_time text;
alter table public.orders enable row level security;
drop policy if exists "Visitors can submit order requests" on public.orders;
drop policy if exists "Customers can submit their own order requests" on public.orders;
create policy "Customers can submit their own order requests" on public.orders for insert to authenticated
with check (
  customer_user_id = auth.uid()
  and collection_date >= current_date + 3
  and status = 'Awaiting details'
  and agreed_cost is null
  and collection_time is null
  and (preferred_collection_time is null or preferred_collection_time ~ '^(10|11|12|13|14|15|16|17|18|19|20|21|22):[0-5][0-9]$')
  and case when jsonb_typeof(photo_paths) = 'array' then
    jsonb_array_length(photo_paths) <= 5
    and not exists (
      select 1 from jsonb_array_elements_text(photo_paths) as photo(path)
      where split_part(photo.path, '/', 1) <> auth.uid()::text
    )
  else false end
  and char_length(customer_name) between 1 and 120
  and char_length(phone) between 1 and 40
  and char_length(email) between 3 and 254
  and char_length(description) between 1 and 4000
);
drop policy if exists "Customers can read their own orders" on public.orders;
create policy "Customers can read their own orders" on public.orders for select to authenticated
using (customer_user_id = auth.uid());
create policy "Admins can read orders" on public.orders for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update orders" on public.orders for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can remove collected orders" on public.orders for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
revoke insert on public.orders from anon;
grant insert on public.orders to authenticated;
grant select, update, delete on public.orders to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-reference-photos', 'order-reference-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 5242880;

drop policy if exists "Customers may upload order reference photos" on storage.objects;
drop policy if exists "Customers may upload their own order reference photos" on storage.objects;
create policy "Customers may upload their own order reference photos" on storage.objects for insert to authenticated
with check (bucket_id = 'order-reference-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Customers may view their own order reference photos" on storage.objects for select to authenticated
using (bucket_id = 'order-reference-photos' and (storage.foldername(name))[1] = auth.uid()::text);
revoke insert on storage.objects from anon;
grant select on storage.objects to authenticated;
grant insert on storage.objects to authenticated;
create policy "Admins may view order reference photos" on storage.objects for select to authenticated
using (bucket_id = 'order-reference-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins may delete order reference photos" on storage.objects for delete to authenticated
using (bucket_id = 'order-reference-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "Visitors can read public site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins can manage site settings" on public.site_settings for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.gallery_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0
);
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.gallery_categories(id) on delete set null,
  occasion text,
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table public.gallery_categories enable row level security;
alter table public.gallery_items enable row level security;
create policy "Visitors can view gallery categories" on public.gallery_categories for select to anon, authenticated using (true);
create policy "Admins can manage gallery categories" on public.gallery_categories for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Visitors can view gallery items" on public.gallery_items for select to anon, authenticated using (true);
create policy "Admins can manage gallery items" on public.gallery_items for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  review text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "Visitors can read published reviews" on public.reviews for select to anon, authenticated using (is_published);
drop policy if exists "Visitors can submit reviews for moderation" on public.reviews;
revoke insert on public.reviews from anon, authenticated;
create policy "Admins can manage reviews" on public.reviews for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Shared gallery and review capabilities used by the connected dashboard.
alter table public.gallery_items add column if not exists description text;
alter table public.reviews add column if not exists rating integer not null default 5 check (rating between 1 and 5);

create table if not exists public.gallery_product_overrides (
  product_id text primary key,
  name text not null,
  description text not null default '',
  category text not null,
  is_visible boolean not null default true,
  storage_path text,
  updated_at timestamptz not null default now()
);
alter table public.gallery_product_overrides add column if not exists storage_path text;
alter table public.gallery_product_overrides enable row level security;
drop policy if exists "Visitors can read product gallery overrides" on public.gallery_product_overrides;
drop policy if exists "Admins can insert product gallery overrides" on public.gallery_product_overrides;
drop policy if exists "Admins can update product gallery overrides" on public.gallery_product_overrides;
drop policy if exists "Admins can delete product gallery overrides" on public.gallery_product_overrides;
create policy "Visitors can read product gallery overrides" on public.gallery_product_overrides
  for select to anon, authenticated using (is_visible or ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy "Admins can insert product gallery overrides" on public.gallery_product_overrides
  for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update product gallery overrides" on public.gallery_product_overrides
  for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete product gallery overrides" on public.gallery_product_overrides
  for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.gallery_categories(name, sort_order)
values ('Celebrations',1),('Chocolate',2),('Desserts & more',3),('Doughnuts & pops',4),('Gift boxes',5),('Seasonal',6)
on conflict (name) do nothing;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('gallery-photos','gallery-photos',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public may read gallery photos" on storage.objects;
drop policy if exists "Admins may upload gallery photos" on storage.objects;
drop policy if exists "Admins may update gallery photos" on storage.objects;
drop policy if exists "Admins may delete gallery photos" on storage.objects;
create policy "Public may read gallery photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'gallery-photos');
create policy "Admins may upload gallery photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'gallery-photos' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins may update gallery photos" on storage.objects
  for update to authenticated using (bucket_id = 'gallery-photos' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'gallery-photos' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins may delete gallery photos" on storage.objects
  for delete to authenticated using (bucket_id = 'gallery-photos' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can manage gallery categories" on public.gallery_categories;
drop policy if exists "Admins can manage gallery items" on public.gallery_items;
drop policy if exists "Admins can manage site settings" on public.site_settings;
drop policy if exists "Admins can manage reviews" on public.reviews;
create policy "Admins can insert gallery categories" on public.gallery_categories for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update gallery categories" on public.gallery_categories for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete gallery categories" on public.gallery_categories for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can insert gallery items" on public.gallery_items for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update gallery items" on public.gallery_items for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete gallery items" on public.gallery_items for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can insert settings" on public.site_settings for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update settings" on public.site_settings for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete settings" on public.site_settings for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can read all reviews" on public.reviews for select to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can insert reviews" on public.reviews for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update reviews" on public.reviews for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete reviews" on public.reviews for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Server-only fixed-window limiter used by public form and email Edge Functions.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.rate_limit_windows (
  rate_key text not null,
  window_id bigint not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (rate_key, window_id)
);
revoke all on private.rate_limit_windows from public, anon, authenticated;

create or replace function public.consume_rate_limit(p_key text, p_window_seconds integer, p_max_requests integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_id bigint;
  v_request_count integer;
begin
  if p_key is null or length(p_key) < 1 or length(p_key) > 256
     or p_window_seconds < 1 or p_window_seconds > 86400
     or p_max_requests < 1 or p_max_requests > 1000 then
    raise exception 'Invalid rate limit parameters.';
  end if;

  v_window_id := floor(extract(epoch from clock_timestamp()) / p_window_seconds)::bigint;
  insert into private.rate_limit_windows as limits (rate_key, window_id, request_count)
  values (p_key, v_window_id, 1)
  on conflict (rate_key, window_id) do update
    set request_count = limits.request_count + 1,
        updated_at = clock_timestamp()
  returning request_count into v_request_count;

  delete from private.rate_limit_windows
  where created_at < clock_timestamp() - interval '2 days';

  return v_request_count <= p_max_requests;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

alter table public.orders drop constraint if exists orders_preferred_collection_time_hours_check;
alter table public.orders add constraint orders_preferred_collection_time_hours_check
  check (preferred_collection_time is null or preferred_collection_time ~ '^(10|11|12|13|14|15|16|17|18|19|20|21|22):[0-5][0-9]$') not valid;

create index if not exists orders_customer_user_id_idx on public.orders(customer_user_id);
create index if not exists gallery_items_category_id_idx on public.gallery_items(category_id);
create index if not exists reviews_published_created_idx on public.reviews(is_published, created_at desc);
grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.gallery_categories, public.gallery_items, public.gallery_product_overrides, public.reviews to anon, authenticated;
grant insert, update, delete on public.gallery_categories, public.gallery_items, public.gallery_product_overrides, public.site_settings to authenticated;
grant update, delete on public.reviews to authenticated;
revoke insert on public.reviews from anon, authenticated;

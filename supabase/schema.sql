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
with check (customer_user_id = auth.uid() and collection_date >= current_date + 3 and jsonb_array_length(photo_paths) <= 5);
create policy "Admins can read orders" on public.orders for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update orders" on public.orders for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can remove collected orders" on public.orders for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
revoke insert on public.orders from anon;
grant insert on public.orders to authenticated;
grant select, update, delete on public.orders to authenticated;

drop function if exists public.get_order_status(text, uuid);
create function public.get_order_status(p_order_id text, p_tracking_token uuid)
returns table (status text, agreed_cost text, collection_time text, preferred_collection_time text)
language sql security definer set search_path = public
as $$
  select o.status, o.agreed_cost, o.collection_time, o.preferred_collection_time
  from public.orders o
  where o.id = p_order_id and o.tracking_token = p_tracking_token
  limit 1;
$$;
revoke all on function public.get_order_status(text, uuid) from public;
grant execute on function public.get_order_status(text, uuid) to anon, authenticated;

create or replace function public.respond_to_order_price(p_order_id text, p_accept boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  next_status text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to respond to this price proposal.';
  end if;
  next_status := case when p_accept then 'Preparing' else 'Price declined' end;
  update public.orders
  set status = next_status
  where id = p_order_id
    and customer_user_id = auth.uid()
    and status = 'Awaiting price agreement'
    and agreed_cost is not null;
  if not found then
    raise exception 'No pending price proposal was found for this order.';
  end if;
  return next_status;
end;
$$;
revoke all on function public.respond_to_order_price(text, boolean) from public;
grant execute on function public.respond_to_order_price(text, boolean) to authenticated;

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
create policy "Visitors can submit reviews for moderation" on public.reviews for insert to anon with check (is_published = false);
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

create index if not exists orders_customer_user_id_idx on public.orders(customer_user_id);
create index if not exists gallery_items_category_id_idx on public.gallery_items(category_id);
create index if not exists reviews_published_created_idx on public.reviews(is_published, created_at desc);
grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.gallery_categories, public.gallery_items, public.gallery_product_overrides, public.reviews to anon, authenticated;
grant insert on public.reviews to anon;
grant insert, update, delete on public.gallery_categories, public.gallery_items, public.gallery_product_overrides, public.site_settings, public.reviews to authenticated;
revoke execute on function public.respond_to_order_price(text, boolean) from anon, public;
grant execute on function public.respond_to_order_price(text, boolean) to authenticated;

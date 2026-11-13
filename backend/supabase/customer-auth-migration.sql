-- Apply this once to an existing Supabase project that already ran schema.sql.
-- Customer accounts are required for new order submissions.

alter table public.orders
  add column if not exists customer_user_id uuid references auth.users(id);
alter table public.orders
  add column if not exists customer_first_name text;
alter table public.orders
  add column if not exists customer_last_name text;
alter table public.orders
  add column if not exists preferred_collection_time text;
update public.orders
set preferred_collection_time = collection_time,
    collection_time = null
where preferred_collection_time is null
  and status in ('Awaiting details', 'Accepted', 'Awaiting price agreement', 'Price declined', 'Preparing');
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('Awaiting details', 'Accepted', 'Rejected', 'Awaiting price agreement', 'Price declined', 'Preparing', 'Ready for collection'));

alter table public.orders enable row level security;
drop policy if exists "Visitors can submit order requests" on public.orders;
drop policy if exists "Customers can submit their own order requests" on public.orders;
create policy "Customers can submit their own order requests" on public.orders
  for insert to authenticated
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
create policy "Customers can read their own orders" on public.orders
  for select to authenticated
  using (customer_user_id = auth.uid());
revoke insert on public.orders from anon;
grant insert on public.orders to authenticated;

drop policy if exists "Customers may upload order reference photos" on storage.objects;
drop policy if exists "Customers may upload their own order reference photos" on storage.objects;
create policy "Customers may upload their own order reference photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Customers may view their own order reference photos" on storage.objects;
create policy "Customers may view their own order reference photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
revoke insert on storage.objects from anon;
grant select on storage.objects to authenticated;
grant insert on storage.objects to authenticated;
drop policy if exists "Admins may view order reference photos" on storage.objects;
create policy "Admins may view order reference photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-reference-photos'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
drop policy if exists "Admins may delete order reference photos" on storage.objects;
create policy "Admins may delete order reference photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'order-reference-photos'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Visitors can submit reviews for moderation" on public.reviews;
revoke insert on public.reviews from anon, authenticated;

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
    and jsonb_array_length(photo_paths) <= 5
  );
drop policy if exists "Customers can read their own orders" on public.orders;
create policy "Customers can read their own orders" on public.orders
  for select to authenticated
  using (customer_user_id = auth.uid());
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

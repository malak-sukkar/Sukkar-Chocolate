alter table public.orders drop constraint if exists orders_preferred_collection_time_hours_check;
alter table public.orders add constraint orders_preferred_collection_time_format_check
  check (preferred_collection_time is null or preferred_collection_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$') not valid;

drop policy if exists "Customers can submit their own order requests" on public.orders;
create policy "Customers can submit their own order requests" on public.orders
for insert to authenticated
with check (
  customer_user_id = auth.uid()
  and collection_date >= current_date + 3
  and preferred_collection_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
  and confirmed_collection_date is null
  and status = 'Awaiting details'
  and agreed_cost is null
  and collection_time is null
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

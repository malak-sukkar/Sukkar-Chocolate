-- Harden customer-created orders, move public review submissions behind the
-- rate-limited Edge Function, and add a server-only fixed-window limiter.

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

alter table public.orders drop constraint if exists orders_preferred_collection_time_hours_check;
alter table public.orders add constraint orders_preferred_collection_time_hours_check
  check (preferred_collection_time is null or preferred_collection_time ~ '^(10|11|12|13|14|15|16|17|18|19|20|21|22):[0-5][0-9]$') not valid;

drop policy if exists "Visitors can submit reviews for moderation" on public.reviews;
revoke insert on public.reviews from anon;

drop policy if exists "Admins may delete order reference photos" on storage.objects;
create policy "Admins may delete order reference photos" on storage.objects
for delete to authenticated
using (bucket_id = 'order-reference-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

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


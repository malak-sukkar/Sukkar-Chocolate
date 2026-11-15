-- Customer and admin dismissals are independent; neither side deletes the order.
alter table public.orders
  add column if not exists customer_hidden boolean not null default false;
alter table public.orders
  add column if not exists admin_hidden boolean not null default false;

-- Keep customer cancellations in the order history, while allowing changes
-- only before the order enters the Preparing status.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('Awaiting details', 'Accepted', 'Rejected', 'Awaiting price agreement', 'Price declined', 'Preparing', 'Ready for collection', 'Cancelled'));

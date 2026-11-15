-- Keep collected orders visible on both dashboards until an owner or the
-- customer explicitly removes them.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('Awaiting details', 'Accepted', 'Rejected', 'Awaiting price agreement', 'Price declined', 'Preparing', 'Ready for collection', 'Cancelled', 'Collected'));

-- Order status is read through the authenticated owner's RLS-protected query.
-- Price responses are now validated and applied by the authenticated Edge Function.
drop function if exists public.get_order_status(text, uuid);
drop function if exists public.respond_to_order_price(text, boolean);

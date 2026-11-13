-- Public review submissions now go through the rate-limited Edge Function.
revoke insert on public.reviews from anon, authenticated;

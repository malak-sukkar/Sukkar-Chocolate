# Backend

The website backend is managed by Supabase. Its project files are in `backend/supabase/`:

- `schema.sql` defines the tables, row-level security policies, storage buckets, and seed data.
- `migrations/` contains production database changes.
- `functions/` contains server-side email, review, and customer account deletion functions.
- `config.toml` configures local Supabase CLI work.

Order photos are stored in the private `order-reference-photos` bucket. Each request supports up to five photos from a device, mobile camera, or Sukkar's gallery; customers can remove selected photos before submitting. Customers can cancel until an order enters `Preparing`. Admins set the confirmed collection date and time using the customer's requested ready-by schedule as the default, then mark completed orders `Collected`. Customers and admins remove cancelled or collected orders from their own lists independently.

Signed-in customers can request account deletion from **Account Settings**. The customer must confirm the request and re-enter their password. The `delete-customer-account` Edge Function verifies the current session and recent password sign-in, then removes the customer's private order photos, orders, and Auth account. This is permanent. Deploy the function to Supabase before enabling the feature on the live site.

Run Supabase CLI commands from this `backend/` directory so the CLI finds the `supabase/` configuration folder. Private keys and service credentials belong in Supabase Function Secrets, never in frontend code or Git.

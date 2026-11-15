# Backend

The website backend is managed by Supabase. Its project files are in `backend/supabase/`:

- `schema.sql` defines the tables, row-level security policies, storage buckets, and seed data.
- `migrations/` contains production database changes.
- `functions/` contains the server-side email and review functions.
- `config.toml` configures local Supabase CLI work.

Order photos are stored in the private `order-reference-photos` bucket. Each request supports up to five photos from a device, mobile camera, or Sukkar's gallery; customers can remove selected photos before submitting. Customers can cancel until an order enters `Preparing`. Admins set the confirmed collection date and time using the customer's requested ready-by schedule as the default, then mark completed orders `Collected`. Customers and admins remove cancelled or collected orders from their own lists independently.

Run Supabase CLI commands from this `backend/` directory so the CLI finds the `supabase/` configuration folder. Private keys and service credentials belong in Supabase Function Secrets, never in frontend code or Git.

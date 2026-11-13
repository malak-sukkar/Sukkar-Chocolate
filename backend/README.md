# Backend

The website backend is managed by Supabase. Its project files are in `backend/supabase/`:

- `schema.sql` defines the tables, row-level security policies, storage buckets, and seed data.
- `migrations/` contains production database changes.
- `functions/` contains the server-side email and review functions.
- `config.toml` configures local Supabase CLI work.

Run Supabase CLI commands from this `backend/` directory so the CLI finds the `supabase/` configuration folder. Private keys and service credentials belong in Supabase Function Secrets, never in frontend code or Git.

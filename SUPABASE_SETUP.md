# Sukkar site setup

The site is built with React and JavaScript. The **Sukkar Chocolate** Supabase project is in London (`eu-west-2`). Postgres stores custom orders, gallery categories and uploaded photos, product photo edits, customer reviews and public contact details. Auth protects the studio dashboard, and separate Storage buckets hold public gallery photos and private customer reference photos. WhatsApp remains the place where Sukkar and the customer agree on the price.

## Connect a Supabase project

1. The project is already created; open its SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql) only if you need to recreate the schema from scratch. The current project already has the schema and gallery bucket migrations applied.
2. `.env.local` is configured locally with the project's URL and public publishable key. The key is intended for browser use; never use a service-role key in this React app.
3. Restart the Vite dev server so it loads the local environment values.
4. Create the owner's account in **Authentication → Users**. Set its `app_metadata` to `{"role":"admin"}` so the dashboard can verify it. Do not set the role in user-editable metadata.
5. Visit `/admin` and sign in with that account.

## What is connected

- Customers must register or sign in before submitting a custom order. Orders and up to five reference images are saved to Supabase under the signed-in customer before WhatsApp opens.
- Customers can see their agreed price and collection time from the same browser that submitted the order. The tracking token is kept locally; the database only returns the status fields when both the order reference and token match.
- The signed-in admin can view orders and private reference photos, set the agreed price and collection time, send a ready-to-collect message through WhatsApp, and remove a collected order.
- Gallery categories, uploaded gallery photos, edits to bundled product photo names/descriptions/categories/visibility, customer reviews, and public phone/address details are shared through Supabase. New reviews wait for approval in the dashboard.
- The existing bundled product images have been copied into the public gallery bucket. The gallery prefers those Supabase copies and keeps the bundled files as a local fallback.
- Without `.env.local`, the site runs in local preview mode. Preview accounts, orders, reviews, settings, and gallery additions stay in that browser only and are not shared with the Supabase project.

## Current preview-mode limits

The owner must still create the first Auth user and grant it the admin role in Supabase before signing in at `/admin`. No admin password is stored in the website files. The local development server must be restarted after setting `.env.local`.

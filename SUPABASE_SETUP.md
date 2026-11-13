# Sukkar site setup

The site is built with React and JavaScript. The **Sukkar Chocolate** Supabase project is in London (`eu-west-2`). Postgres stores custom orders, gallery categories and uploaded photos, product photo edits, customer reviews and public contact details. Auth protects the Admin Dashboard, and separate Storage buckets hold public gallery photos and private customer reference photos. Customer and admin order messages are sent by email; the price is still agreed through the customer and admin order screens.

## Connect a Supabase project

1. The project is already created; open its SQL Editor and run [`backend/supabase/schema.sql`](backend/supabase/schema.sql) only if you need to recreate the schema from scratch. The current project already has the schema and gallery bucket migrations applied.
2. `frontend/.env.local` is configured locally with the project's URL and public publishable key. The key is intended for browser use; never use a service-role key in this React app.
3. Restart the Vite dev server so it loads the local environment values.
4. Create the owner's account in **Authentication → Users**. Set its `app_metadata` to `{"role":"admin"}` so the dashboard can verify it. Do not set the role in user-editable metadata.
5. Visit `/admin` and sign in with that account.

## What is connected

- Customers must register or sign in before submitting a custom order. Orders and up to five reference images are saved to Supabase under the signed-in customer, then an email receipt goes to the customer and an order notification goes to Sukkar.
- Customers can see their agreed price and collection time from the same browser that submitted the order. The tracking token is kept locally; the database only returns the status fields when both the order reference and token match.
- The signed-in admin can view orders and private reference photos, set the agreed price and collection time, email order updates to customers, and remove a collected order. Accepting a new order sends no email.
- Gallery categories, uploaded gallery photos, edits to bundled product photo names/descriptions/categories/visibility, customer reviews, and public email/phone/address details are shared through Supabase. New reviews wait for approval in the dashboard.
- Email delivery uses the `send-site-email` Supabase Edge Function and EmailJS connected to Sukkar’s Gmail account. See [`EMAIL_SETUP.md`](EMAIL_SETUP.md) to connect Gmail and add the server-side secrets.
- The existing bundled product images have been copied into the public gallery bucket. The gallery prefers those Supabase copies and keeps the bundled files as a local fallback.
- Without `frontend/.env.local`, the site runs in local preview mode. Preview accounts, orders, reviews, settings, and gallery additions stay in that browser only and are not shared with the Supabase project.

## Current preview-mode limits

The owner must still create the first Auth user and grant it the admin role in Supabase before signing in at `/admin`. No admin password is stored in the website files. The local development server must be restarted after setting `frontend/.env.local`.

# Sukkar Chocolate — Developer Handoff

This guide is the starting point for a developer taking over the Sukkar Chocolate website. It describes the current implementation, where features live, how to run the project, how the website uses Supabase and email, and what to check before publishing changes. It is written from the code and setup notes in this repository; account credentials and secret values are intentionally not included.

## 1. Project at a glance

- **Website:** React 19 + JavaScript single-page application, built with Vite 8.
- **Routing:** React Router 7; the GitHub Pages deployment uses the `/Sukkar-Chocolate/` base path.
- **Styles:** project CSS in `frontend/src/App.css` and `frontend/src/index.css`.
- **Backend:** Supabase provides Postgres, Auth, Storage, row-level security (RLS), and the email Edge Function. There is no separate Express/Node server.
- **Email delivery:** a Supabase Edge Function calls EmailJS using server-side secrets.
- **Hosting:** GitHub Pages, deployed by GitHub Actions when changes are pushed to `main`.
- **Live site:** <https://malak-sukkar.github.io/Sukkar-Chocolate/>
- **Repository:** <https://github.com/malak-sukkar/Sukkar-Chocolate>

### Folder layout

- `frontend/` contains the React app, Vite config, static assets, and the local `.env.example` template.
- `backend/supabase/` contains the database schema, migrations, Storage setup, and Edge Functions.
- `package.json`, `package-lock.json`, and `.github/workflows/` stay at the repository root so one set of npm scripts and one deployment workflow can manage the project.
- `docs/` contains the project brief, product requirements, owner guide, developer handoff, and service setup guides.

The project supports both a connected Supabase mode and a limited local preview mode. These modes are not interchangeable: local preview data is stored in the current browser and does not reach the live website or another device.

## 2. First-time local setup

Prerequisites: Node.js 22 (matches the deployment workflow) and npm.

```powershell
npm install
Copy-Item frontend/.env.example frontend/.env.local
```

For a real Supabase-connected local run, replace the example values in `frontend/.env.local` with the project's **URL** and **publishable key**. The variable names are:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Start the development site:

```powershell
npm run dev
```

Vite prints the local address, usually `http://localhost:5173`. Restart the dev server after changing `frontend/.env.local`.

Without those two environment values, the app uses local preview mode. You can also run `npm run build` to create the production bundle, `npm run preview` to serve that bundle locally, and `npm run lint` to run ESLint. There is currently no `npm test` script.

## 3. Application map

| Path | Page | Main implementation |
| --- | --- | --- |
| `/` | Home, featured content, reviews, location map | `Home` in `frontend/src/App.jsx` |
| `/about` | Sukkar story | `About` in `frontend/src/App.jsx` |
| `/gallery` | Filterable gallery and photo details | `Gallery` in `frontend/src/App.jsx` |
| `/reviews` | Public reviews, six at a time, review form | `Reviews` in `frontend/src/App.jsx` |
| `/custom` | Custom order form | `CustomOrder` in `frontend/src/App.jsx` |
| `/contact` | Email contact form and contact details | `Contact` in `frontend/src/App.jsx` |
| `/my-orders` | Customer order status and price response | `MyOrders` in `frontend/src/App.jsx` |
| `/account` | Customer email/password settings | `CustomerAccount` in `frontend/src/App.jsx`; opened from the person icon in the navbar |
| `/sign-in`, `/register` | Customer authentication | `CustomerAuth` in `frontend/src/App.jsx` |
| `/admin` | Admin sign-in and Admin Dashboard | `Admin` in `frontend/src/App.jsx` |

Most page behavior and shared UI components currently live in the large `frontend/src/App.jsx` file. Avoid assuming pages have their own component files. `frontend/src/App.css` contains page and component styling; `frontend/src/index.css` contains global styles and fonts. `frontend/src/main.jsx` mounts the application. `frontend/src/data/products.js` and `frontend/src/data/reviews.js` supply bundled fallback content. Images and logos live under `frontend/src/assets/`, including the `frontend/src/assets/products/` collection.

### Supporting files

- `frontend/src/lib/supabase.js` — REST/Auth/Storage/Edge Function client and local preview adapters.
- `backend/supabase/schema.sql` — database schema, RLS policies, helper functions, storage buckets/policies, and seed categories.
- `backend/supabase/customer-auth-migration.sql` — customer ownership/auth changes and related RPC/policies.
- `backend/supabase/functions/send-site-email/index.ts` — email API, authorization, message templates, private photo links.
- `docs/SUPABASE_SETUP.md` and `docs/EMAIL_SETUP.md` — account-level setup notes. These are guides, not application runtime configuration.
- `frontend/.env.example` — placeholder names only; safe template for local environment setup.
- `.github/workflows/deploy.yml` — GitHub Pages build and deployment workflow.
- `frontend/vite.config.js` — selects `/Sukkar-Chocolate/` for GitHub Actions and `/` for local development.

Run Supabase CLI commands from the `backend/` directory so the CLI finds `backend/supabase/config.toml` and its migrations/functions.

## 4. Data and backend model

Supabase is the shared source of truth when configured. The website accesses Supabase APIs with `fetch` from `frontend/src/lib/supabase.js`; there is no Express API layer.

### Postgres tables

- `orders` — customer details, description, collection date/time preferences, allergies, private photo object paths, agreed price, collection time, status, tracking token, and customer Auth ID.
- `site_settings` — public contact details and map location stored as key/value settings.
- `gallery_categories` — shared gallery filter categories and ordering.
- `gallery_items` — uploaded gallery image path, name, description, and category reference.
- `gallery_product_overrides` — owner edits/visibility and optional replacement Storage image for bundled product cards.
- `reviews` — customer name, review text, 1–5 star rating, publication state, and date.

Schema files are useful for understanding the design, but the live project already has its schema and gallery migration applied. **Do not rerun schema or migration SQL against production as a routine deployment step.** Review SQL carefully and use a planned migration when changing a live database.

### Storage buckets

- `gallery-photos` — public product/gallery photos. The gallery reads Supabase copies when present; bundled product images remain a fallback.
- `order-reference-photos` — private customer attachments. Orders store object paths, not public URLs. Admin/customer interfaces request short-lived signed URLs when previews are needed. The email sent to the owner can include signed links that expire after 24 hours.

### Authentication and authorization

- Customers register/sign in with Supabase Auth before submitting a custom order. Customer order access is scoped to the authenticated user.
- Admin access is granted by `app_metadata.role = "admin"`. The Admin Dashboard checks this role at sign-in, and RLS policies use the JWT `app_metadata` claim.
- Set an admin role through a trusted Supabase admin process. Do not use `user_metadata` for permissions: users can edit their own metadata.
- The frontend uses the publishable key, which is designed for browser exposure and depends on RLS for protection. Never place a service-role/secret key in `VITE_*`, frontend code, GitHub Pages variables, or committed files.
- The email function validates the Supabase session for order messages, checks ownership for customer events, and requires the admin role for `admin_*` events. Contact-form email is public and includes a honeypot check.

### Important database functions

- `get_order_status(order_id, tracking_token)` returns a limited order status only when both identifiers match. This is used for status refresh behavior.
- `respond_to_order_price(order_id, accept)` lets an authenticated customer accept or decline their own proposed price and updates status in the database.

See `backend/supabase/schema.sql` and `backend/supabase/customer-auth-migration.sql` for their exact SQL definitions and grants.

## 5. Customer and owner flows

### Custom order lifecycle

1. The customer signs in, enters first and last name, contact information, idea, collection date, preferred time, allergy details, and optionally up to five reference photos.
2. The form requires a collection date at least three days ahead and a preferred time from 10:00 AM through 10:00 PM. The form includes the compact hour/minute/AM-PM picker and an error for a time outside the allowed window.
3. With Supabase connected, photos upload to the private bucket and the order row is created with `Awaiting details`. The function emails the Admin Dashboard owner with request details and temporary photo links, and emails the customer a receipt.
4. The admin sees the request and photos, then accepts or rejects it. Acceptance alone sends no email. Rejection sends the customer an email.
5. The admin proposes a price. The customer gets an email with a **View your order** button and a plain-text URL to My Orders, where they can accept or reject the price. The response is stored and emails the admin.
6. On acceptance, status advances to `Preparing`. The admin enters a collection time using the Admin Dashboard picker; status becomes `Ready for collection`, and the customer receives the time by email. My Orders shows both the customer's preferred time and confirmed collection time.
7. **Mark as collected** removes the order from the active lists by deleting the order row and filtering it from the local list. This is permanent in the current implementation; there is no separate collected-order archive.

The customer and admin see step journeys tailored to their role. The database status is shared, while journey labels and actions differ.

### Other features

- Gallery categories are shared between the Admin Dashboard and public Gallery. Admins can add/edit photo name and description, assign a category, change visibility, and manage categories. When deleting a category, its photos are assigned to the default **Chocolate** category.
- New reviews are unpublished until admin approval. Admin can show new reviews first, switch to all reviews, publish, hide, or delete. The public Reviews page displays six at a time, adds six with **Show more**, and can return to six with **Show less**.
- Admin settings include public email, phone, address, map location (address or coordinates), and admin account email/password changes. Email changes may require confirmation from Supabase.
- Signed-in customers can open the person icon in the navbar to change their account email or password on `/account`. Customer email changes may need confirmation through Supabase; local preview account updates stay in browser storage.
- The home page map uses the saved map location; the address, map and footer are editable through the Admin Dashboard settings.
- Contact information/social links and their placement are in the shared site components in `frontend/src/App.jsx`.

## 6. Email setup and message routing

`frontend/src/lib/supabase.js` calls the `send-site-email` Supabase Edge Function. The function uses EmailJS to send through the connected Gmail service. Its event types currently include:

| Event | Recipient | Purpose |
| --- | --- | --- |
| `contact` | Sukkar | Website contact form |
| `order_submitted` | Sukkar and customer | New-order notification (includes temporary photo links) and receipt |
| `order_question` | Sukkar | Customer asks about their order |
| `customer_price_response` | Sukkar | Customer accepts/declines the proposed price |
| `admin_order_rejected` | Customer | Request rejection |
| `admin_price_proposal` | Customer | Proposed price and My Orders link |
| `admin_ready_collection` | Customer | Ready-for-collection update and time |

Accepting a new order intentionally sends no email. Customer-facing admin messages are sent to the email saved in the order. Customer messages route to the current Sukkar email in `site_settings`; `reply_to` is set so the recipient can reply to the sender.

The EmailJS template needs `to_email`, `subject`, `reply_to`, and `message_html` (triple braces for HTML). The function also supplies `message_text`. Required Edge Function secrets are `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, and `EMAILJS_PRIVATE_KEY`. Supabase supplies its own URL and key secrets to the function. Keep all provider private keys and Supabase service-role keys in Supabase Function Secrets. Never put them in this guide or the frontend.

The current proposal URL is embedded in `backend/supabase/functions/send-site-email/index.ts` as the GitHub Pages `/Sukkar-Chocolate/my-orders` address. `getSiteUrl()` exists in the function but is currently not used to create that link. If the domain or project path changes, update and deploy the function, and check that both the HTML button and plain-text URL work. `docs/EMAIL_SETUP.md` has account setup details. Email providers control inbox/spam placement; website code cannot guarantee Inbox delivery.

## 7. Environment variables and secret handling

| Variable | Where used | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser build | Public project endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser build | Public/publishable key; RLS is required |
| `EMAILJS_SERVICE_ID` | Supabase Edge Function Secrets | Keep server-side |
| `EMAILJS_TEMPLATE_ID` | Supabase Edge Function Secrets | Keep server-side |
| `EMAILJS_PUBLIC_KEY` | Supabase Edge Function Secrets | Keep server-side for this integration |
| `EMAILJS_PRIVATE_KEY` | Supabase Edge Function Secrets | Private; never expose |
| Supabase service-role/secret key | Supabase Edge Function runtime | Highly privileged; never expose |

`frontend/.env.local` is excluded by `.gitignore` (`*.local`). Keep actual environment files out of Git. GitHub Actions needs only the public Supabase URL and publishable key as repository Actions Variables for the frontend build. Do not put private provider or Supabase keys into GitHub Pages build variables.

## 8. Local preview mode

If either frontend Supabase value is missing, `supabaseReady` is false and `frontend/src/lib/supabase.js` uses browser `localStorage` for preview accounts, sessions, orders, reviews, settings, and gallery changes. This is useful for layout and interaction checks, but:

- data exists only in that browser profile and can be cleared with its site data;
- it is not synchronized with Supabase, another device, or the deployed website;
- it does not verify production RLS, Auth, Storage, or email behavior;
- preview sign-in is not real Supabase authentication and must not be used to secure a live site.

## 9. Build and deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch. It uses Node 22, runs `npm ci`, builds with `npm run build`, copies `frontend/dist/index.html` to `frontend/dist/404.html` for direct page links, and deploys `frontend/dist` to GitHub Pages.

Before a production change:

1. Make the change locally and review the diff.
2. Run `npm run lint` and `npm run build` when appropriate.
3. For database changes, create/review a migration and confirm RLS behavior; do not casually rerun the initial schema SQL.
4. For Edge Function changes, deploy `send-site-email` to the correct Supabase project and preserve its secrets.
5. Commit and push to `main` only when authorized. Check the GitHub Actions run and open the published URL, including a direct route such as `/my-orders`.

Project Pages configuration assumes the repository name remains `Sukkar-Chocolate`. If deploying under another repository or a custom domain, revisit `frontend/vite.config.js`, router base path, email links, and GitHub Pages settings.

## 10. Troubleshooting guide

- **Site runs locally but data is missing on another device:** likely local preview mode, or the local `frontend/.env.local` does not point to the expected Supabase project.
- **Admin can sign in but Admin Dashboard rejects the account:** verify the correct Supabase Auth user and `app_metadata.role = "admin"`, then sign out/in to refresh the JWT claims.
- **Gallery image upload or order photo preview fails:** check the correct bucket, object path, Storage policies, current session, and signed URL expiration. Keep order reference photos private.
- **Email fails:** verify the Edge Function is deployed to the connected project; its required EmailJS secrets exist; EmailJS service/template identifiers are correct; template variable names match; Gmail server API sending is enabled; Sukkar's recipient email is saved in Admin Dashboard; and Supabase function logs show the underlying sanitized error.
- **Price email link fails or points to an old address:** inspect the hard-coded order URL in `backend/supabase/functions/send-site-email/index.ts`, redeploy the function, and confirm the website base path.
- **Direct URL works locally but not on Pages:** verify `404.html` copy and GitHub Pages base path `/Sukkar-Chocolate/`; check the workflow result.
- **Unexpected permission issue:** inspect the relevant RLS policy and use an authenticated request with the expected user role/ownership. Do not work around RLS by exposing a privileged key.

## 11. Suggested onboarding sequence

1. Read this guide, then `NON-TECHNICAL-GUIDE.md` for the customer and owner-facing product behavior.
2. Run the app locally in preview mode to understand the screens; then configure the correct Supabase project if you need shared backend behavior.
3. Read `frontend/src/lib/supabase.js` and the corresponding table/policy in `backend/supabase/schema.sql` before changing a data flow.
4. For email changes, follow the event authorization and template flow in `backend/supabase/functions/send-site-email/index.ts`, and keep credentials in Supabase Function Secrets.
5. Review both customer and admin experiences for any order/status change, and confirm a direct GitHub Pages route still works after deployment.

## 12. Glossary

- **RLS:** Postgres Row Level Security; policies decide which rows a visitor, customer, or admin can read and change.
- **Edge Function:** server-side code hosted by Supabase. This project uses one to authorize and send website emails without exposing private email credentials to the browser.
- **Publishable key:** a key designed for use in the browser. It is not a substitute for RLS.
- **Signed URL:** a temporary URL granting access to a private Storage object, such as a customer reference photo.
- **Preview mode:** local browser-only fallback when Supabase is not configured.

# Sukkar Chocolate

A responsive React + JavaScript website for Sukkar handmade chocolate. Built with Vite and React Router. Supabase is the intended backend for shared customer orders, private reference photos, and admin authentication.

## Run locally

```sh
npm install
npm run dev
```

Without Supabase credentials, the website uses browser storage for a local preview. To connect shared orders and the Admin Dashboard, follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Pages

- Home, story, gallery, and reviews
- Custom order form, customer order status, and contact form
- Admin Dashboard at `/admin`

## Guides

- [Non-Technical Guide](NON-TECHNICAL-GUIDE.md) — website features, customer order journey, and owner tasks
- [Developer Guide](DEVELOPER-GUIDE.md) — local setup, code structure, Supabase, email, security, and deployment

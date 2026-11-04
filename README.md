# Sukkar Chocolate

A responsive React + JavaScript website for Sukkar handmade chocolate. Built with Vite and React Router. Supabase is the intended backend for shared customer orders, private reference photos, and admin authentication.

## Run locally

```sh
npm install
npm run dev
```

Without Supabase credentials, the website uses browser storage for a local preview. To connect shared orders and the studio dashboard, follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Pages

- Home, story, gallery, and reviews
- Custom order form, customer order status, and contact form
- Studio dashboard at `/admin`

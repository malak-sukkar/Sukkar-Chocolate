# Sukkar Chocolate

A responsive React + JavaScript website for Sukkar handmade chocolate. Built with Vite and React Router. Supabase provides the backend for shared customer orders, private reference photos, and admin authentication.

## Project structure

- `frontend/` — React app, static assets, Vite configuration, and local frontend environment template.
- `backend/supabase/` — database schema, migrations, Storage policies, and Supabase Edge Functions.
- Root files — npm scripts/dependencies and GitHub Pages deployment workflow.
- `docs/` — project brief, requirements, owner guide, developer handoff, and setup guides.

## Run locally

```sh
npm install
npm run dev
```

For a Supabase-connected local run, copy `frontend/.env.example` to `frontend/.env.local` and add the project's public Supabase URL and publishable key. Without those values, the website uses browser storage for a local preview. Follow [the Supabase setup guide](docs/SUPABASE_SETUP.md) for backend setup.

## Pages

- Home, story, gallery, and reviews
- Custom order form, customer order status, and contact form
- Admin Dashboard at `/admin`

## Guides

- [Project Brief](docs/Sukkar-Chocolate-Project-Brief.pdf)
- [Product Requirements](docs/PRD.md)
- [Non-Technical Guide](docs/NON-TECHNICAL-GUIDE.md) — website features, customer order journey, and owner tasks
- [Developer Guide](docs/DEVELOPER-GUIDE.md) — local setup, code structure, Supabase, email, security, and deployment
- [Email Setup](docs/EMAIL_SETUP.md)
- [Supabase Setup](docs/SUPABASE_SETUP.md)

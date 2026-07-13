# craftedBy

Portfolio builder web app ("craftedBy" brand, `craftedby` machine name). Users sign up (email OTP verified, unique username), upload a resume, pick a template, and publish up to 5 portfolios at public URLs like `/<username>-<4-digit-code>`.

## Stack

- React 19 + Vite + react-router-dom, `oxlint` for linting.
- Backend: Supabase (Postgres + auth + storage) via `@supabase/supabase-js`. Frontend-only architecture — security lives in Postgres RLS policies, not client code.
- `supabase/schema.sql` is the full database setup (tables, triggers, RLS, storage policies). `SETUP.md` documents the one-time Supabase/Vercel provisioning.
- Supabase credentials come from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars (`.env.local`, gitignored). Until they're set, the app runs in "not configured" mode: public pages work, auth pages show a setup notice.
- No SMS/phone verification anywhere (keeps the app free to run). Signup collects gender, date of birth, country and city into `profiles`. Email OTP + password reset ride on Supabase auth email; note this project issues 8-digit OTP codes.
- Schema changes for existing installs go in `supabase/migrations/` as numbered files the user runs manually in the SQL Editor; `schema.sql` stays current for fresh installs.

## Key layout

- `src/templates/` — portfolio template components; each renders purely from a `data` prop. Registry in `src/lib/templates.js`, sample data in `src/lib/sampleData.js`.
- `src/pages/` — routed pages; `src/context/AuthContext.jsx` holds session + profile.
- Public portfolio route is the catch-all `/:slug` (slug = `username-NNNN`) and must stay last in the route list.

## Deployment

- **Versioning rule:** on every push to `main`, bump the patch version in `package.json` (e.g. 0.1.2 → 0.1.3) in the same commit, and tell the user the new version number in chat. The footer displays it (`VITE_APP_VERSION`, injected from `package.json` via `vite.config.js` define) so the user can confirm which build is deployed.

- Target host: Vercel, project name `craftedby` (user creates/imports; `vercel.json` has the SPA rewrite). Set both env vars in Vercel.
- Legacy GitHub Pages deploy still runs on push to `main` via `.github/workflows/deploy.yml` at https://faaridmuhammademad.github.io/craftedby/ — `vite.config.js` sets `base: '/craftedby/'` only when `GITHUB_ACTIONS` is set. Remove the workflow once Vercel is live.

## Git accounts (important)

- This machine has a separate work GitHub account configured **globally**. Never change the global git config.
- This repo uses the personal account (FaaridMuhammadEmad) via **repo-local** `git config user.name` / `user.email`, and pushes to https://github.com/FaaridMuhammadEmad/craftedby over HTTPS with its own stored credential.
- When creating related personal repos on this machine, apply the same repo-local identity pattern.
- GitHub CLI (`gh`) is not installed; use the GitHub REST API with the stored git credential if API access is needed.

# Exousia & Co. Accounting

Standalone accounting portal for the Exousia & Co. perfume business. It is separate from the storefront code but uses the same Supabase project.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
4. `npm run dev`

## Deploy
Push this folder to a new GitHub repository and import it into Vercel. Add the two VITE_* environment variables in Vercel.

Never use a Supabase service-role key in this browser app. Keep accounting RLS enabled.

## Data sources
Known storefront tables: `public.orders`, `public.products`.
Known accounting tables from the installed migration: `accounting.accounts`, `accounting.expenses`.
If your migration uses different column names, edit only `src/lib/accounting.js`.


## Vercel / Supabase configuration

Set these Production environment variables in Vercel: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The app uses the custom Supabase `accounting` schema for accounting tables and `public` for storefront tables. The `accounting` schema must be exposed through Supabase Data API. A runtime error boundary is included so unexpected React errors show a recovery screen instead of an unexplained blank page.

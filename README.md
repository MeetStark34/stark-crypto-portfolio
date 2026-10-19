# STARK CRYPTO PORTFOLIO

A private crypto portfolio tracker with Supabase authentication and user-owned records, CoinGecko market data, and EUR/USD/INR reporting.

## Run locally

1. Install Node.js 20.9+ and run `npm ci`.
2. Copy `.env.example` to `.env.local` and set the required variables listed below.
3. Apply the SQL migration files in `supabase/migrations/` in timestamp order to your Supabase project.
4. Run `npm run dev` and open http://localhost:3000.

### Required environment variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
COINGECKO_API_KEY=<CoinGecko Demo API key>
STARK_PORTFOLIO_PASSWORD=<private portfolio password>
STARK_PORTFOLIO_AUTH_EMAIL=<email of the existing Supabase Auth user>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role key>
```

The Supabase publishable key is designed for browser use and must be protected by Row Level Security. `COINGECKO_API_KEY`, `STARK_PORTFOLIO_PASSWORD`, `STARK_PORTFOLIO_AUTH_EMAIL`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never use a service-role key or private login values in a `NEXT_PUBLIC_` variable. `.env.local` is ignored by Git; do not commit real values.

### Deploy to Vercel

Import the repository into Vercel and deploy it as a Next.js project. Add all six environment variables above in Vercel Project Settings → Environment Variables for each environment you use, then redeploy. Set `STARK_PORTFOLIO_PASSWORD` to the chosen login password, `STARK_PORTFOLIO_AUTH_EMAIL` to the email of the existing portfolio Auth user, and `SUPABASE_SERVICE_ROLE_KEY` to the project's server-only service-role key. The app verifies the password server-side, then uses the existing user to establish the standard Supabase cookie session. No database schema changes are required.

The local Windows environment may fail `next build` when Windows Application Control blocks the SWC binary or a child process (`spawn EPERM`). This is a local Windows security restriction; it does not change the Vercel Linux build configuration.

## Current architecture

- Next.js App Router and strict TypeScript under `src/app`.
- Tailwind CSS 4 for the dark, responsive visual foundation.
- Supabase SSR clients are split by runtime: `src/lib/supabase/client.ts` for browser code and `server.ts` for Server Components/Route Handlers.
- `src/middleware.ts` refreshes Supabase auth cookies, redirects signed-out visitors from private routes, and routes signed-in visitors away from the landing/login pages.
- The `(private)` route group performs a second server-side `auth.getUser()` check before rendering the app shell. Logout uses a server action calling Supabase `auth.signOut()`.
- Login checks `STARK_PORTFOLIO_PASSWORD` on the server and establishes a normal Supabase SSR cookie session for the existing Auth user. The internal email and service-role key stay server-side.
- `src/lib/env.ts` centralizes required public Supabase configuration and fails clearly when a client is actually requested without it.
- No service-role client exists. Transaction writes use the signed-in Supabase session and RLS. CoinGecko is called server-side only; its API key is never returned to the browser.
- `src/lib/coingecko.ts` is the server-only market-data layer: current single/multiple prices use `/simple/price`, market summaries use `/coins/markets`, and historical series use `/coins/{id}/market_chart`. Requests use the API key header and Next.js server fetch revalidation; authenticated route handlers return private, no-store responses.
- `src/lib/market-data.ts` stores the last valid quote per user, asset, and fiat in `portfolio_market_cache`. It falls back to that snapshot when CoinGecko fails and marks it stale; missing quotes remain unavailable.
- `src/lib/portfolio-calculations.mjs` is the shared fixed-point calculation engine. It uses 18-decimal `BigInt` units. Historical FX rates convert purchase amounts for the selected reporting currency. Total invested includes transaction fees once; purchase value excludes them. If any held asset lacks a valid quote, it withholds portfolio value, P/L, and allocations instead of presenting a partial total.
- The main dashboard uses CoinGecko historical prices with purchase timestamps to value the holdings actually owned at each point. Its authenticated `/api/portfolio-performance` endpoint supports 1D, 1W, 1M, 3M, 1Y, and ALL; chart requests use cached CoinGecko history and return a clear unavailable state when prices cannot cover all holdings. Asset marks come from CoinGecko market data.

## Portfolio transactions

The migration creates separate `portfolio_assets` and `portfolio_transactions` tables instead of assuming the column layout of the project's pre-existing tables. The supported asset catalog is BTC, ETH, SOL, XRP, ADA, DOGE, DOT, AVAX, LINK, and MATIC. Each transaction row has a required `user_id` referencing `auth.users`; RLS permits authenticated users to read and mutate only their own rows. Portfolio asset rows are readable to authenticated users, while writes are restricted to the migration.

`total_fiat_amount` is total cash outflow including fees. `fee_fiat_amount` is a component of that total, and generated `purchase_value_fiat` equals `total_fiat_amount - fee_fiat_amount`. For a €10 charge with a €1.49 fee, total cost basis is €10, purchase value excluding fees is €8.51, and the fee is €1.49. The fee is not added a second time. Transaction inputs accept up to 30 integer digits and 18 fractional digits; amount strings go to PostgreSQL `numeric` without JavaScript floating-point conversion. Reads cast numeric columns to text to preserve their decimal precision through PostgREST. Purchase price per coin is derived from purchase value divided by crypto amount and rounded only for display.

The portfolio and dashboard show invested cost, fees, market value, unrealized P/L and return, per-asset holdings, average purchase prices, prices, allocations, and best/worst performance. P/L uses current value minus total cash outflow (including each fee once), translated into the selected reporting currency. Historical market prices power the portfolio and asset charts. If CoinGecko has no valid quote and no user-scoped cached quote exists, the UI shows an unavailable state rather than a substitute price.

Run exact-decimal, portfolio calculation, historical performance, and validation tests with `npm run test:unit`. The database ownership/CRUD policy tests are in `supabase/tests/portfolio_transactions_rls.test.sql` and can be run against a local Supabase stack with `supabase test db`.

## Database inspection and assumptions

The live definitions of the supplied tables (`profiles`, `crypto_assets`, `transactions`, `portfolio_settings`, `portfolio_targets`, and `price_alerts`) were not available in this workspace. The migrations use dedicated `portfolio_assets`, `portfolio_transactions`, and `portfolio_market_cache` tables so they do not assume or alter the unknown shape of those existing tables.

All application data reads and writes are scoped to the authenticated user and protected by RLS. Supabase Auth callback URLs should include the local origin (`http://localhost:3000/auth/callback`) and the deployed origin when configured.

The login uses Supabase Auth's existing email identity internally. The user only enters the private portfolio password; the app does not send or display an email link.

## Product boundaries

This is a portfolio tracker: users enter purchases manually and market pricing comes from CoinGecko. It has no Revolut integration or login, crypto news, or trade execution. Portfolio values come from the signed-in user's Supabase rows and live market data; empty states do not include fabricated holdings.

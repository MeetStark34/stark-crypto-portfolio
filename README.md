> 🪙 Your crypto portfolio, reimagined. One private dashboard for your holdings, performance, and plans.
> 

# ✨ STARK CRYPTO PORTFOLIO

**A personal crypto portfolio tracker with a premium fintech feel.** Track the crypto you own, record purchases manually, and view your portfolio with live market prices - without connecting your Revolut account or placing trades.

🔗 **Repository:** MeetStark34/stark-crypto-portfolio

## 🌌 The idea

STARK is built around one simple idea: **your portfolio should be easy to understand, not just a wall of market numbers.**

It brings manually recorded purchases and market data into one private, responsive dashboard. The interface aims for a calm, polished, Apple-inspired fintech aesthetic, with the useful detail you need without unnecessary noise.

- 🧾 Record crypto purchases and fees manually.
- 📈 Follow portfolio value and performance using market data.
- 🧮 Understand cost basis, average purchase price, and profit or loss.
- 🥧 See allocation across your crypto holdings.
- 💱 Switch between EUR, USD, and INR using exchange-rate conversion.
- 🎯 Set personal portfolio targets and price alerts.
- 📱 Use the dashboard on desktop or mobile.

## 🚀 Features

### 💼 Portfolio overview

- Total portfolio value and invested amount
- Current profit/loss and return percentage
- Asset holdings and allocation percentages
- Best- and worst-performing holdings
- Portfolio performance charts, where historical data is available

### 🪙 Asset details

- Individual crypto holding details
- Purchase and transaction history
- Quantity held and average purchase price
- Cost basis, fees, and performance breakdown

### 🧾 Manual transaction tracking

Enter the details of purchases you made elsewhere. STARK does **not** connect to Revolut, request Revolut credentials, or execute trades.

### 📊 Analytics

- Total invested and total fees
- Average purchase price
- Asset allocation
- Best and worst performers
- Monthly performance insights, with attention to deposits/capital flows versus market movement

### 💱 Currency preferences

Choose between:

- 🇪🇺 EUR - Euro
- 🇺🇸 USD - US Dollar
- 🇮🇳 INR - Indian Rupee

Currency selection is intended to convert values using exchange-rate data, not merely change the displayed symbol. Crypto quantities remain crypto quantities.

### 🔔 Alerts and 🎯 targets

Create price alerts and personal portfolio targets to help keep your plans visible. Availability and trigger behavior depend on the configured market-data and application services.

### 🔐 Private by design

- Password-only login experience
- Supabase Auth sessions
- PostgreSQL database with Row Level Security (RLS)
- Server-side handling for sensitive credentials and market-data secrets

## 🧰 Tech stack

| Technology | Purpose |
| --- | --- |
| Next.js + React | Web application |
| TypeScript | Type safety |
| Tailwind CSS | Styling and responsive UI |
| Supabase Auth | Authentication and sessions |
| Supabase PostgreSQL | Portfolio storage |
| Row Level Security (RLS) | User-data access controls |
| CoinGecko API | Crypto market data |
| Vercel | Hosting and deployment |

## 🏗️ Architecture at a glance

```
Browser
  │
  ▼
Next.js application
  ├── Server-side authentication
  ├── Portfolio calculations
  ├── Market-data integration
  └── Supabase server/client utilities
           │
           ▼
    Supabase Auth + PostgreSQL
           │
           ▼
       RLS-protected data
```

The frontend should never receive the Supabase service-role/secret key or other server-only credentials. User-specific data access should rely on the authenticated session and RLS policies.

## 🖥️ Run locally

### 1. Requirements

- Node.js (use a current LTS version)
- npm
- A Supabase project
- A CoinGecko API key if required by your configured plan/integration

### 2. Clone the repository

```bash
git clone https://github.com/MeetStark34/stark-crypto-portfolio.git
cd stark-crypto-portfolio
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a local file named `.env.local` in the project root. Start with the variable names below and supply your own values.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
COINGECKO_API_KEY=

STARK_PORTFOLIO_PASSWORD=
STARK_PORTFOLIO_AUTH_EMAIL=
SUPABASE_SERVICE_ROLE_KEY=
```

**Keep `.env.local` private.** It must not be committed to Git. The `.env.example` file should contain placeholders only.

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public configuration |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Client-safe key |
| `COINGECKO_API_KEY` | Market-data API access, if configured | Server-only |
| `STARK_PORTFOLIO_PASSWORD` | Password for the private login screen | Server-only secret |
| `STARK_PORTFOLIO_AUTH_EMAIL` | Existing Supabase Auth identity used internally | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side Supabase operations, if required by the auth flow | Highly sensitive server-only secret |

⚠️ Never prefix private variables with `NEXT_PUBLIC_`. Never commit passwords, service-role/secret keys, or real API secrets. Never share them in screenshots or issue reports.

### 5. Apply database migrations

Review the SQL files in `supabase/migrations/` and apply the migrations required by the version of the application you are running to your Supabase project. Apply them in timestamp order and check the result before testing the app.

> 💡 The deployed app and local development use the same Supabase project unless you configure separate projects. Be sure you know which database you are changing before applying migrations.
> 

### 6. Start development

```bash
npm run dev
```

Open http://localhost:3000.

### 7. Type-check

```bash
npm run typecheck
```

Use any additional lint, test, or build scripts defined in `package.json`. A passing type-check is useful, but does not replace browser testing or a production build.

## ☁️ Deploy to Vercel

### 1. Import the GitHub repository

1. Open Vercel.
2. Choose **Add New → Project**.
3. Import `MeetStark34/stark-crypto-portfolio`.
4. Keep the framework preset as **Next.js** unless the project configuration says otherwise.

### 2. Add Environment Variables

In **Vercel → Project → Settings → Environment Variables**, configure the same variables listed in the local setup section.

Add production secrets directly in Vercel. Do not paste secret values into GitHub, README files, or source code.

### 3. Deploy and verify

Click **Deploy**. After deployment, check:

- 🔐 Password login accepts the configured password and rejects an incorrect one.
- 🍪 The authenticated session survives a page refresh.
- 🧭 Private pages remain protected when logged out.
- 🪙 Holdings and transaction history load.
- 💱 EUR, USD, and INR switch correctly.
- 📈 Market prices and charts handle loading and API failures gracefully.
- 🔔 Alerts, targets, and settings behave as expected.

After pushing a new commit to the connected GitHub branch, Vercel should automatically create a deployment.

## 🧮 Portfolio calculation principles

Financial tracking only works when costs are represented consistently.

- **Cash outflow** is the total amount charged for a purchase, including fees when the entered amount is fee-inclusive.
- **Crypto purchase value** is the amount allocated to the asset, excluding the fee.
- **Fee-inclusive cost basis** includes the full cash outflow.
- **Profit/loss** compares current holding value with the chosen cost-basis definition.
- **Precision** should be preserved in stored values and calculations; rounding belongs in the UI.

When recording a transaction, make sure the entered amount and fee follow the form's labels. Do not count fees twice. Historic chart performance should not be fabricated when reliable historical data is unavailable.

## 🛡️ Security notes

- Keep `.env.local` out of version control.
- Keep Supabase service-role/secret keys on the server only.
- Never put secrets inside React client components or `NEXT_PUBLIC_*` variables.
- Keep RLS enabled on tables containing private portfolio data.
- Derive the user identity from the authenticated session, rather than trusting a user ID supplied by the browser.
- Use a strong, unique password and change it if it has been exposed.
- Treat a single shared password as a convenience layer, not as a replacement for a multi-user identity model.
- Do not store the password in localStorage or log submitted passwords.

## 🗺️ Roadmap

The current focus is portfolio visibility and manual tracking. Possible future features:

- 🧾 Import transaction history from a CSV export
- 📉 Realised profit/loss and sell transactions
- 🧮 Tax-oriented reports
- 🎁 Staking and rewards tracking
- 📤 Portfolio export and backup
- 🔎 More detailed analytics

These are ideas, not a promise that they are already implemented. STARK is not intended to place trades or provide investment advice.

## 🤝 Contributing

This project is currently designed as a personal portfolio. Suggestions and bug reports are welcome through GitHub Issues.

When reporting an issue, include the relevant error message and steps to reproduce it. **Remove passwords, access tokens, API keys, private email addresses, and financial data before sharing logs or screenshots.**

## ⚠️ Disclaimer

STARK is a personal tracking and informational tool, not a bank, broker, exchange, tax adviser, or financial adviser. Market data may be delayed, unavailable, or subject to provider limits. Portfolio calculations depend on the accuracy of manually entered transaction details. Nothing in this project is a recommendation to buy or sell cryptocurrency.

---

<div align="center">

**Built for clarity. Designed for your portfolio.** 🖤

*STARK CRYPTO PORTFOLIO*

</div>

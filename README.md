# EstampaLab Admin

Internal management app for EstampaLab (*Personaliza • Estampa • Cria*): products and costing,
income and expenses, suppliers and a dashboard. UI in European Portuguese, code in English.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Prisma 6 + PostgreSQL (Supabase) ·
Auth.js v5 (credentials, JWT sessions) · Zod · React Hook Form · TanStack Table · Recharts ·
Vitest · Playwright.

**Mutations use Server Actions.** Route handlers are only used for CSV export and serving uploaded files.

## Setup (Windows, macOS or Linux)

Requirements: Node.js 20.19+ (22 LTS recommended) and a PostgreSQL database. Supabase's free plan is the default (see below).

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create your env file and edit it
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env

# 3. Create the database tables and seed data
npm run db:deploy             # creates the tables (prisma migrate deploy)
npm run db:seed               # default categories, settings, owner account, sample data

# 4. Run
npm run dev                   # http://localhost:3000
```

Log in with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` from your `.env`.

### Supabase

1. Create a project at supabase.com (region: Europe, e.g. `eu-west-2` or `eu-central-1`). Save the database password.
2. Click **Connect** (top of the dashboard) → **ORMs** → **Prisma**. Copy the two strings into `.env`:
   - `DATABASE_URL`: transaction pooler, port **6543**, ending in `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL`: session pooler, port **5432** (used only by migrations)
3. If the password has special characters (`@ # / ?`…), URL-encode them.
4. Turn off the Data API: **Project Settings → Data API → disable**. The app never uses it, and
   leaving it on would expose these tables (they have no row-level security) through the public API key.
5. Run `npm run db:deploy` and `npm run db:seed`.

The app uses Supabase only as a Postgres database. Auth stays in Auth.js; Supabase Auth, Storage and
the REST API are not used. Prisma connects as the `postgres` user, so row-level security doesn't apply.

When you change `prisma/schema.prisma` later, run `npm run db:migrate -- --name what-changed`.

A local Postgres instead (optional): `docker run -d --name estampa-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=estampa_lab postgres:16`
and set both URLs to `postgresql://postgres:postgres@localhost:5432/estampa_lab`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection used by the app (Supabase transaction pooler, port 6543) |
| `DIRECT_URL` | Postgres connection used by migrations (Supabase session pooler, port 5432) |
| `AUTH_SECRET` | Auth.js secret. Generate with `npx auth secret` |
| `AUTH_TRUST_HOST` | `true` when running `npm start` locally or behind a proxy |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_NAME` | First owner account created by the seed |
| `STORAGE_DRIVER` | `local` (dev). `s3` later for S3 / Cloudflare R2 |
| `UPLOAD_DIR` | Folder for local uploads |

Never commit `.env`. Only `.env.example` is versioned.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run check` | Lint + typecheck + unit tests |
| `npm run lint` / `npm run typecheck` / `npm test` | Individually |
| `npm run test:e2e` | Playwright e2e (first time: `npx playwright install chromium`) |
| `npm run db:migrate` | Create/apply migrations after editing `prisma/schema.prisma` |
| `npm run db:seed` | Seed (idempotent) |
| `npm run db:reset` | Drop everything, re-migrate and re-seed |

## Conventions

- **Money** is stored as integer cents; **rates** (VAT, margin) as integer basis points (2300 = 23 %).
  Every money column says `Net` or `Gross`. All maths and formatting goes through `src/lib/money.ts`.
- **Dates**: `DD/MM/YYYY`, timezone `Europe/Lisbon` (`src/lib/dates.ts`). Date-only columns use Postgres `DATE`.
- **Soft delete**: suppliers, products and transactions have `deletedAt`.
- **Auth**: the middleware protects every route; every Server Action also calls `requireUser()`.
- **Recurring expenses** (rent, subscriptions…) are generated automatically when the ledger or dashboard
  is opened: each due date becomes one transaction, marked as paid. Edit it if it was not paid yet.
- **Dashboard profit per product** is an estimate: sales linked to the product × its current margin.
- **Attachments** (receipts/invoices) are stored under `UPLOAD_DIR` (default `./uploads`) through
  `src/lib/storage`; swap the driver for S3/R2 later without touching the features.

## Roadmap (deferred modules)

The schema already leaves room for these (new tables + nullable foreign keys, no rewrites):

- Customers/companies and contacts (a minimal `Customer` table exists for the ledger)
- Quotes (orçamentos)
- Customer orders with production pipeline: briefing → artwork approval → production → ready → delivered
- Artwork / mockup file storage (reuses `Attachment` + storage abstraction)
- Inventory / stock of blanks and consumables
- Invoicing references
- Time tracking per job
- Accountant reports: monthly VAT summary export
- Multi-user roles (owner/staff permissions; `User.role` already exists)
- Audit log
- Backups

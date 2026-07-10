# Solar IMS

Whitelabel, multi-tenant inventory + POS + invoicing system for solar product companies. One deployment serves many companies, each isolated by `companyId` and fully re-branded (logo, accent color, invoice notes, tax/currency). See `ARCHITECTURE.md`, `PHASES.md`, and `SCRATCHPAD.md` for the full plan and build history.

## Local setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a Postgres connection string (Neon pooled connection in production, any local Postgres for dev)
   - `DIRECT_URL` — Postgres direct/unpooled connection string, used by `prisma migrate`; can be identical to `DATABASE_URL` for local Postgres
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` — credentials for the seeded Super Admin
   - `BOOTSTRAP_TOKEN` — only needed in production (see [Bootstrapping the Super Admin](#bootstrapping-the-super-admin) below); leave blank locally
2. Install dependencies and run the migrations:
   ```bash
   pnpm install
   pnpm prisma migrate dev
   pnpm seed
   ```
3. Start the dev server:
   ```bash
   pnpm dev
   ```
4. Optional: fill in a fully populated demo company (25+ products, customers, 60 days of invoices, quotations, POs, expenses, returns) for exploring the app or a sales demo:
   ```bash
   pnpm seed:demo
   ```
   Safe to run more than once — if the demo company already exists, it prints a message and exits without duplicating data.

## Running tests

```bash
pnpm test:e2e
```

Playwright drives a real browser against a running dev server (`pnpm dev` must already be up on `http://localhost:3000`; Postgres must be reachable). `tests/global-setup.ts` pre-warms every route the suite touches before the timed run starts, since Next.js dev mode compiles each route on its first request — this avoids the suite's first test paying that cost inline. The whole suite (single worker, sequential) takes a few minutes.

---

## Deploying to production

This app is built to run on **Vercel** (Next.js hosting) with **Neon** (serverless Postgres). Both have free tiers sufficient for evaluating the app with a handful of companies.

### 1. Create the Neon database

1. Create a project at [neon.tech](https://neon.tech). Pick a region close to where Vercel will run (Neon shows a "same region as Vercel" hint during setup).
2. Neon gives you **two** connection strings for the default branch — copy both:
   - The **pooled** connection string (usually has `-pooler` in the hostname) → this becomes `DATABASE_URL`. The running app uses this for every request; Postgres connection pooling is essential on serverless (each Vercel function invocation can open a new connection, and Postgres has a hard connection limit).
   - The **direct** (unpooled) connection string → this becomes `DIRECT_URL`. Prisma Migrate needs a direct connection — migrations use session-level features (advisory locks) that don't work reliably through a connection pooler.
3. Both connection strings need `?sslmode=require` (Neon includes this by default).

### 2. Import the project into Vercel

1. [Import the repository](https://vercel.com/new) into Vercel. Framework preset: Next.js (auto-detected).
2. **Build Command**: leave this on Vercel's default — this repo ships a `vercel-build` script in `package.json` (`prisma generate && prisma migrate deploy && next build`), and Vercel automatically prefers a `vercel-build` script over the plain `build` script when one exists. This means **every deploy applies any pending Prisma migrations before building**, so a schema change merged to the deploy branch takes effect automatically on the next deploy — no manual migration step, no SSH access needed.
   - `prisma migrate deploy` only ever applies already-committed migration files from `prisma/migrations/` — it never generates new migrations or touches the schema interactively, so it's safe to run unattended on every build.
3. **Environment Variables** — set these in the Vercel project's Settings → Environment Variables (Production, and Preview if you want preview deployments to work against the same or a Neon preview branch):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `DIRECT_URL` | Neon **direct** connection string |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` — a fresh secret, not the one from local dev |
   | `NEXTAUTH_URL` | Your production URL, e.g. `https://your-app.vercel.app` (or custom domain once attached) |
   | `SEED_SUPERADMIN_EMAIL` | The Super Admin's login email |
   | `SEED_SUPERADMIN_PASSWORD` | The Super Admin's login password (used once, by the bootstrap route below — rotate it afterward if you're security-conscious) |
   | `BOOTSTRAP_TOKEN` | A random secret, e.g. `openssl rand -hex 32` — required by the bootstrap route in the next step |

4. Deploy. The first deploy runs `prisma migrate deploy` against an empty database, creating every table, then builds the app.

### 3. Bootstrapping the Super Admin

Locally, `pnpm seed` creates the Super Admin. In production there's no shell access to run that script, so `GET /api/bootstrap` exists as a one-time, safe-to-expose HTTP equivalent:

- It only does anything if the `User` table is **completely empty** (i.e. only ever works once, on a fresh database) — this guards against creating a second Super Admin or being used as a lever against an already-live deployment.
- It requires `?token=<BOOTSTRAP_TOKEN>` matching the env var exactly (constant-time compared) — without the correct token, or if `BOOTSTRAP_TOKEN`/`SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD` aren't all set, it returns a bare `404` (not `401`/`403`), so the route's existence isn't revealed to anyone probing it.

After your first deploy succeeds:

```bash
curl "https://your-app.vercel.app/api/bootstrap?token=YOUR_BOOTSTRAP_TOKEN"
```

A `{"ok":true}` response means the Super Admin now exists with the `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD` you set. Log in at `https://your-app.vercel.app/login`.

Once this has run successfully, it's inert for the lifetime of that database (the `User` table is never empty again) — you can leave `BOOTSTRAP_TOKEN` set or remove it from Vercel afterward, either is fine.

### 4. Creating the first real company

Logged in as Super Admin:

1. Go to `/super/companies/new`.
2. Fill in the company name and its first ADMIN user's name + email. A temporary password is generated and shown **once** on screen — copy it before navigating away, it isn't recoverable afterward (only a fresh reset is).
3. Hand that email + temporary password to the company's ADMIN. On their first login they're walked through `/onboarding` (company name confirmation, logo + accent color, tax rate + currency + number format, first product) — every step past the first is skippable, so they can finish in under a minute and fill in the rest later from Settings.

From here the company is fully live: inventory, POS, invoicing, customers/khata, purchases, quotations, expenses, and reports all work immediately, scoped to that company alone.

---

## Onboarding a new client company end to end

Once the platform itself is deployed, this is the repeatable flow for bringing on each new solar-products company:

1. **Create the company** — Super Admin → `/super/companies/new` → company name + first ADMIN's name/email. Save the shown temporary password somewhere you can securely hand off (a password manager share, not chat/email in plaintext if you can help it).
2. **Send the ADMIN their login** — email/WhatsApp them the login URL, their email, and the temporary password. Ask them to change the password on first login (Sidebar → key icon → Change password).
3. **They complete onboarding** — first login redirects to `/onboarding`: company name (required, pre-filled from step 1), logo + accent color, tax rate + currency + lakh/crore number format, and their first product. All but the first step are skippable.
4. **Branding** — if they skipped logo/accent during onboarding, `/settings/branding` has a live preview card; the accent color updates the sidebar's active-nav dot and every primary button immediately, app-wide.
5. **Bring in their catalog** — `/inventory/new` per product, or for a larger existing catalog, add products one at a time via the same form (there's no bulk CSV import in v1 — see `ARCHITECTURE.md` §7 for what's intentionally out of scope).
6. **Add their team** — `/settings/users`: ADMIN can create MANAGER (full operational access, no settings/user management) and CASHIER (POS-only) accounts. Each gets a temporary password shown once, same as the company ADMIN did.
7. **Opening balances** — if they're migrating from an existing khata/ledger system, add each customer via `/customers/new` with their real opening balance; the system books it as a ledger `OPENING` entry so it's visible in that customer's balance history from day one.
8. **Go live** — POS is the CASHIER's home screen and needs zero further setup. ADMIN/MANAGER can start recording purchases, invoices, and quotations immediately.

For a sales demo instead of a real client, skip all of the above and run `pnpm seed:demo` locally — it produces a fully populated company (`Sunrise Solar Traders`) with two months of realistic activity across every module, so every screen and report has something to show.

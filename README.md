# Solar IMS

Whitelabel, multi-tenant inventory + POS + invoicing system for solar product companies. See `ARCHITECTURE.md`, `PHASES.md`, and `SCRATCHPAD.md` for the full plan and build history.

## Local setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a Postgres connection string (Neon in production, any local Postgres for dev)
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` — credentials for the seeded Super Admin
2. Install dependencies and run the migration:
   ```bash
   pnpm install
   pnpm prisma migrate dev
   pnpm seed
   ```
3. Start the dev server:
   ```bash
   pnpm dev
   ```

A full deploy guide (Neon + Vercel setup) lands in Phase 8.

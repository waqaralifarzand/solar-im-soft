# CLAUDE.md — Operating Instructions for Claude Code

## What this project is
A whitelabel, multi-tenant inventory management + POS + invoicing system for solar product companies in Pakistan. One deployment serves many companies. A Super Admin (the distributor) creates and manages company accounts from a dedicated panel. Each company gets its own branding, users, inventory, customers, and sales data, fully isolated by `companyId`.

## Source of truth
- `ARCHITECTURE.md` — full database schema, roles, page map, design system tokens, tech decisions. Never contradict it. If a phase forces a schema change, make the change, then document it in `SCRATCHPAD.md` under that phase's report with the reason.
- `PHASES.md` — the build plan. Work on exactly ONE phase per session. Never start the next phase in the same session.
- `SCRATCHPAD.md` — after completing a phase, append a report using the template inside it. Read the latest reports at the start of every session before writing any code.

## Session workflow (every session)
1. Read `CLAUDE.md`, `ARCHITECTURE.md`, the current phase in `PHASES.md`, and all reports in `SCRATCHPAD.md`.
2. Confirm which phase you are executing.
3. Build only what that phase's scope lists. Do not gold-plate. Do not build ahead.
4. Run the phase's Done Checklist. Fix anything failing.
5. Append the phase report to `SCRATCHPAD.md`.
6. Commit with message `phase-N: <summary>`.

## Tech stack (fixed, do not substitute)
- Next.js 14+ App Router, TypeScript, deployed on Vercel
- PostgreSQL on Neon, Prisma ORM
- NextAuth (credentials provider, JWT sessions)
- Tailwind CSS + shadcn/ui components
- Zod for all input validation (client and server)
- TanStack Table for all data tables
- react-to-print for thermal receipts; @react-pdf/renderer for A4 PDFs
- lucide-react icons

## Hard rules
- MULTI-TENANCY: every query on tenant data MUST filter by `companyId` taken from the session, never from client input. Centralize this in a helper (`getTenantContext()`); never trust a companyId sent by the browser.
- AUTHZ: enforce role checks server-side in every server action and route handler. UI hiding is not security.
- SOFT DELETES: products, customers, invoices use `deletedAt`. Never hard-delete tenant business records. Every destructive or financial action writes an `AuditLog` row.
- MONEY: store all money as integer paisa (or Decimal via Prisma `Decimal`), never floats. Display via a single `formatMoney()` util that respects company currency and lakh/crore setting.
- INVOICE NUMBERS: per-company sequential (`INV-0001`), generated in a transaction to avoid duplicates. Same for quotations (`QUO-0001`).
- DESIGN: follow the design tokens in ARCHITECTURE.md exactly. No drop shadows on cards (1px hairline borders only), pill buttons, 20px card radius, Inter font, off-white background. The company accent color is used only for: active nav indicator dot, primary buttons, and small highlights. Everything else stays neutral.
- No `any` types. No commented-out code left behind. No TODO without a SCRATCHPAD note.
- All forms: loading states, disabled-while-submitting, and Zod error messages inline.
- Server components by default; client components only where interactivity requires it.

## What NOT to build (out of scope for v1)
- Serial number / warranty tracking (schema leaves room, do not build UI)
- Barcode scanning (keep the `barcode` field, no scanner integration)
- Multi-branch per company
- Online payments / payment gateways
- Email sending
- Urdu localization

## Environment
- `DATABASE_URL` (Neon), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Seed script creates the Super Admin: email and password from `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` env vars.

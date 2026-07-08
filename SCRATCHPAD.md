# SCRATCHPAD.md — Phase Reports

Claude Code: append a report below after completing each phase. Newest at the bottom. Never edit or delete previous reports. Read all reports at the start of every session.

---

## Report template (copy for each phase)

### Phase N — <name> · <date>
**Status:** Complete / Complete with notes / Blocked

**Built**
- (what was actually implemented, file/route level)

**Deviations from plan**
- (anything done differently from ARCHITECTURE.md or PHASES.md, and why; write "None" if none)

**Schema changes**
- (migrations added beyond the Phase 0 schema; write "None" if none)

**Decisions made**
- (choices the plan left open, e.g. logo storage method, library picks)

**Known issues / tech debt**
- (anything left imperfect, with severity)

**Notes for next phase**
- (context the next session needs: helpers that exist, patterns to reuse, gotchas)

**Checklist result**
- (paste the phase's done checklist with pass/fail per item)

---

<!-- Phase reports start below this line -->

### Phase 0 — Foundation · 2026-07-08
**Status:** Complete

**Built**
- Next.js 14.2.35 (App Router, TS) scaffolded at repo root, Tailwind v3 + PostCSS configured
- Full Prisma schema (`prisma/schema.prisma`) covering every model/enum from ARCHITECTURE.md §3, applied as a single migration (`prisma/migrations/20260708050351_init`)
- Design tokens wired into `tailwind.config.ts` + `app/globals.css` as CSS variables (`--background`, `--surface`, `--card`, `--border`, `--foreground`, `--muted-foreground`, `--accent`, `--destructive`, `--success`, `--warning`), Inter via `next/font/google`, `rounded-card`/`rounded-input`/`rounded-pill` radius scale
- Hand-written shadcn/ui-style primitives (`components/ui/button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`) plus `components.json` and `lib/utils.ts` (`cn()`), since the shadcn CLI registry (`ui.shadcn.com`) is blocked by this environment's network policy
- NextAuth v4 credentials provider (`lib/auth.ts`), JWT session with `{ userId, role, companyId }`, route handler at `app/api/auth/[...nextauth]/route.ts`, type augmentation in `types/next-auth.d.ts`
- `middleware.ts`: Edge-safe route guards using `getToken()` — unauthenticated → `/login`, `/super/*` → SUPER_ADMIN only, `/settings` → ADMIN only, SUPER_ADMIN kept out of company routes, role-based home redirect from `/`
- `lib/getTenantContext.ts`: server helper returning `{ companyId, userId, role }` from the session, throws if a session has no company
- `app/(company)/layout.tsx`: fetches the company row via `getTenantContext()`, renders `SuspendedLockScreen` for `SUSPENDED` companies, otherwise renders `AppShell`
- App shell: `components/app-shell/sidebar.tsx` (240px, collapses to 64px, pill active state with accent dot, role-based nav via `lib/nav-items.ts`), `components/app-shell/topbar.tsx` (Cmd+K placeholder button, not yet wired to a real palette)
- `app/login/page.tsx` + `components/login-form.tsx`: Zod-validated (`lib/validations/auth.ts`), inline field errors, disabled-while-submitting
- `app/(super)/super/page.tsx`: placeholder landing page for SUPER_ADMIN
- `app/(company)/dashboard/page.tsx`: placeholder landing page for company roles
- `lib/formatMoney.ts`: currency-symbol map + `Intl.NumberFormat("en-IN" | "en-US")` for lakh/crore vs western grouping, accepts `Prisma.Decimal | number | string`
- `prisma/seed.ts`: creates the Super Admin from `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD`, plus demo fixtures — an ACTIVE "Demo Solar Co" with ADMIN/MANAGER/CASHIER users and a SUSPENDED "Suspended Solar Co" with an ADMIN user (all password `demo1234`) — needed to exercise the done checklist
- `.env.example` committed; `.env` gitignored

**Deviations from plan**
- **Next.js 16 → pinned to 14.2.35, Prisma 7 → pinned to 5.22.0, Zod 4 → pinned to 3.25.76.** `create-next-app@latest` and `pnpm add` resolved to versions released after my training cutoff (Next 16, Prisma 7, Zod 4), and the scaffold's own generated `AGENTS.md` explicitly warned Next 16 has unfamiliar breaking changes. To keep the "fixed tech stack, do not substitute" rule meaningful and avoid shipping code built on APIs I can't verify, I pinned to the latest version in each library's last major generation I'm confident about. All still satisfy "Next.js 14+" literally.
- **shadcn/ui installed by hand, not via CLI.** `npx shadcn init` fails — this environment's network policy returns 403 for `ui.shadcn.com` (confirmed via the agent proxy status endpoint). Wrote `components.json`, `lib/utils.ts`, and the four primitives needed for Phase 0 (Button, Input, Label, Card) directly from the standard shadcn source pattern. Future phases adding components with `npx shadcn add` will hit the same block — components will need to be hand-written from the shadcn registry source until/unless the network policy allows that host.
- **Suspended-company check lives in a Server Component layout, not literally inside `middleware.ts`.** Next.js 14 middleware only runs on the Edge runtime, which can't load Prisma's native query engine. Doing the live `Company.status` read there isn't possible without Prisma Accelerate/Data Proxy (not part of the fixed stack). So `middleware.ts` handles auth + role gating from JWT claims only (no DB access), and `app/(company)/layout.tsx` does the actual `ACTIVE`/`SUSPENDED` check via `getTenantContext()` + a Prisma query, rendering the lock screen there. Net behavior matches ARCHITECTURE.md §6 exactly; only which file performs the check differs.
- Everything else matches ARCHITECTURE.md and the Phase 0 scope as written.

**Schema changes**
- Added `@relation` directives and inverse array fields (e.g. `products Product[]` on `Company`, `company Company @relation(...)` on `Product`) for every FK-shaped scalar in ARCHITECTURE.md §3. These add no physical columns — the doc's Company model comment ("relations: users, products, customers, invoices...") already implied real relations; the doc's code block just omitted them for brevity. Polymorphic reference fields (`refId` on `StockAdjustment`/`LedgerEntry`, `Quotation.convertedInvoiceId`) were deliberately left as plain scalar strings since they can point at different tables depending on context.

**Decisions made**
- Local dev Postgres: this sandbox has no real Neon credentials, so I started PostgreSQL 16 (pre-installed in the container) locally, created a `solar_ims` database, and pointed `.env` at it to run the migration and exercise the full done checklist end-to-end. **This is not connected to any real Neon database** — swap `DATABASE_URL` in `.env` for a real Neon connection string before deploying.
- `NEXTAUTH_SECRET` was generated with `openssl rand -base64 32` and written to local `.env` only (gitignored). Generate a separate one for any real deployment.
- `SEED_SUPERADMIN_EMAIL` defaulted to waqaralifarzand@gmail.com (the account owner's email) with a randomly generated password (also local-`.env`-only, never committed). Change both before a real deployment — whoever owns the Super Admin login should set their own password rather than use the generated one.
- Demo/test fixtures (`admin@demo-solar.test`, `manager@demo-solar.test`, `cashier@demo-solar.test`, `admin@suspended-solar.test`, all password `demo1234`) were added to `prisma/seed.ts` beyond the literal "seed script: super admin from env vars" scope line, because the Phase 0 done checklist requires demonstrating a company admin login, correct per-role nav, and the suspended lock screen — there was no way to check those off without some non-super-admin fixtures. Kept minimal and clearly marked as test data.
- shadcn/ui components are being hand-authored from the standard registry source (see deviations) rather than pulled via CLI, since the registry host is blocked here.

**Known issues / tech debt**
- Cmd+K palette in the topbar is a non-functional placeholder button (real palette + search is a later phase per PHASES.md).
- Nav links to routes not yet built (Inventory, Customers, Suppliers, Purchases, Invoices, Quotations, Expenses, Reports, Settings) will 404 until their respective phases land — only `/dashboard` (and `/super`, `/login`) actually render.
- `app/page.tsx` (bare `/`) was intentionally not created — middleware always redirects `/` to the correct role home before Next.js would need to render a page there.
- Did not perform an actual Vercel deployment (no Vercel project/credentials in this session) — only verified `pnpm build` succeeds cleanly. Confirm a real deploy once Vercel + Neon credentials are wired up.
- lucide-react resolved to `1.23.0` (a newer major generation than what I trained on) — kept it since it only adds icons/exports and the icon component API itself is unchanged across versions; flagging in case a future phase hits an icon rename.

**Notes for next phase**
- `getTenantContext()` (`lib/getTenantContext.ts`) is the only sanctioned way to get `{ companyId, userId, role }` server-side — use it in every server action/route handler that touches tenant tables, never accept `companyId` from the client.
- `lib/prisma.ts` exports a singleton `prisma` client (standard Next.js dev-hot-reload-safe pattern) — import this, don't instantiate `PrismaClient` directly.
- `lib/formatMoney.ts` takes `{ currency, lakhCroreFormat }` — pull both off the `Company` row (Phase 2 will need to plumb these through once branding/settings exist).
- `lib/nav-items.ts` is the single source of truth for role → nav item mapping; add new routes there as phases build them out, and remember `NavItem.icon` is a component reference — only ever resolve it inside a `"use client"` file (see the RSC-boundary bug note below).
- Gotcha hit this phase: passing a Lucide icon component as a prop from a Server Component to a Client Component throws ("Functions cannot be passed directly to Client Components"). Fix pattern used: pass primitive props (e.g. `role`) down to the client component and call `getNavItemsForRole()` from inside it, not from the server parent.
- shadcn/ui primitives so far: Button, Input, Label, Card — extend these by hand (matching upstream shadcn source conventions) since `npx shadcn add` can't reach the registry from this environment.
- Demo login credentials for manual testing: Super Admin from `.env` (`SEED_SUPERADMIN_EMAIL`/`_PASSWORD`); `admin@demo-solar.test` / `manager@demo-solar.test` / `cashier@demo-solar.test` (ACTIVE company) and `admin@suspended-solar.test` (SUSPENDED company), all password `demo1234`.

**Checklist result**
- [x] `prisma migrate dev` clean, all models present
- [x] Login works for seeded super admin, redirects to /super (placeholder page)
- [x] A fake seeded company admin logs in, sees empty shell with sidebar, correct nav for role (verified ADMIN, MANAGER, CASHIER all render distinct nav sets)
- [x] Suspended company shows lock screen
- [x] Tokens visible: off-white bg, hairline borders, pill buttons on the login page
- [x] Build passes (`pnpm build` clean); Vercel deploy itself not exercised (no Vercel credentials in this session)


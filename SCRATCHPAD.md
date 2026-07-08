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

---

### Phase 1 — Super Admin panel · 2026-07-08
**Status:** Complete with notes

**Built**
- `/super` overview (`app/(super)/super/page.tsx`): stat cards (total/active/suspended companies, signups this month) + "most recently active companies" list, backed by `lib/queries/super-admin.ts#getOverviewStats`
- `/super/companies` (`app/(super)/super/companies/page.tsx` + `components/super/companies-table.tsx`): TanStack-Table-backed list — status chip, users/invoices counts (right-aligned), last activity, row actions (suspend/activate, reset password, login-as)
- `/super/companies/new` (`app/(super)/super/companies/new/page.tsx` + `components/super/create-company-form.tsx`): Zod-validated create form; server action generates a random temp password, hashes it, creates `Company` + first `ADMIN` `User` in one nested Prisma create, shows the password once in a dialog
- `/super/companies/[id]` (`app/(super)/super/companies/[id]/page.tsx`): stats, branding preview (accent color swatch, currency, tax rate — read-only, matches ARCHITECTURE.md §4's page description), users table (reset password / login-as per row), suspend/activate button, company-scoped audit trail (last 20 rows)
- `/super/audit` (`app/(super)/super/audit/page.tsx` + `components/super/audit-table.tsx`): global audit log, latest 200 rows, actor/action/entity/company columns
- Impersonation: `lib/impersonation.ts` signs/verifies an HMAC-SHA256 token (Web Crypto API, not Node's `crypto` module) stored in an `impersonation` httpOnly cookie — deliberately layered on top of the real NextAuth session rather than mutating the JWT, so it can be verified from Edge `middleware.ts` too. `startImpersonation`/`exitImpersonation` server actions in `lib/actions/super-admin.ts`. `ImpersonationBanner` ("Viewing as {company} — Exit") renders in the company shell whenever `getTenantContext()` reports `impersonatedBy`
- `getTenantContext()` (`lib/getTenantContext.ts`) now impersonation-aware: for a SUPER_ADMIN session it reads the impersonation cookie and returns the impersonated company/user/role plus `impersonatedBy` (the real super admin's id) for audit attribution; `middleware.ts` similarly checks the cookie so an impersonating SUPER_ADMIN can reach company routes
- `AuditLog` writes for all five actions in scope: `company.create`, `company.suspend`, `company.activate`, `user.password_reset`, `auth.impersonate` — all actions server-side gated by `lib/requireSuperAdmin.ts`
- New shared UI: `components/ui/data-table.tsx` (generic TanStack Table wrapper, reusable by later phases), `components/ui/dialog.tsx` (Radix Dialog, hand-authored like Phase 0's other primitives), `components/ui/status-chip.tsx`, `components/super/stat-card.tsx`, `components/super/super-nav.tsx` (top nav shell for `/super/*`, separate from the tenant sidebar per ARCHITECTURE.md §2 — super admin has no day-to-day tenant shell)
- `lib/queries/super-admin.ts`: all read queries (`listCompaniesWithStats`, `getOverviewStats`, `getCompanyDetail`, `listAuditLogs`), including a shared `computeLastActivity()` (max of any user's `lastLoginAt` / any `AuditLog.createdAt` for that company, falling back to `Company.createdAt`) since neither concept exists as its own column
- `lib/generateTempPassword.ts`, `lib/slugify.ts` (company slug auto-generated from name with `-2`, `-3`… suffix on collision)
- `directUrl` added to `prisma/schema.prisma`'s datasource (this session's other ask) + `DIRECT_URL` documented in `.env.example`; local `.env` points both `DATABASE_URL` and `DIRECT_URL` at the same local Postgres (no pooler locally, so they're identical for now)

**Deviations from plan**
- **Production sync skipped.** The task asked me to run `prisma migrate deploy` + the seed script against a real Neon database and specific super admin credentials, but the message contained literal unfilled placeholder text (`[PASTE NEON DATABASE_URL]`, `[EMAIL]`, `[PASSWORD]`) instead of real values. I did not fabricate or guess credentials — flagged it back to the user immediately and proceeded with Phase 1 against the local sandbox Postgres only, per the standing decision to do so. **Nothing was run against Neon this session.** Once real values are provided: `DATABASE_URL`/`DIRECT_URL` → real Neon pooled/direct connection strings, then `npx prisma migrate deploy` (uses `directUrl`), then `SEED_SUPERADMIN_EMAIL`/`_PASSWORD` set to the real values before `pnpm seed`.
- Branch: Phase 0's PR (`claude/phase-0-foundation-tvjevk`) was already merged to `main` before this session started, so per the merged-branch handling rule I restarted from `main` on a new branch, `claude/phase-1-super-admin`, rather than stacking onto the merged history.
- Row-level "reset admin password" / "login-as" actions on `/super/companies` target the company's *first-created* `ADMIN` user (`primaryAdminId`, computed in `listCompaniesWithStats`), since Phase 1 only ever creates one ADMIN per company (Phase 2 adds MANAGER/CASHIER creation). The company detail page's per-user table exposes reset-password for every user and login-as for any `ADMIN` specifically, which will matter once a company can have more than one.
- No dropdown/menu component built for row actions — three small ghost icon buttons (suspend/activate, reset password, login-as) instead, to avoid adding `@radix-ui/react-dropdown-menu` for what's currently a 3-action set. Revisit if a future phase needs more row actions than fit inline.
- Confirmation before suspend uses the browser's native `confirm()`, not a styled dialog — kept minimal since only one destructive action needed confirmation this phase; the `Dialog` primitive built this phase is reserved for content that needs real UI (the temp-password reveal), and a future phase can swap in a styled confirm if more destructive actions accumulate.

**Schema changes**
- `directUrl = env("DIRECT_URL")` added to the `datasource db` block (explicitly requested this session, unrelated to Phase 1's own scope). No migration needed — this only affects which connection string the Prisma CLI uses for `migrate dev`/`migrate deploy`, not the database schema itself.

**Decisions made**
- Impersonation token: signed with the Web Crypto API (`crypto.subtle`, HMAC-SHA256) using `NEXTAUTH_SECRET` as the signing key, rather than reusing NextAuth's own JWT encoding — this was the only way to make it verifiable from `middleware.ts`, which runs on the Edge runtime and can't load Prisma's native query engine (same constraint noted in the Phase 0 report for the suspended-company check). The token lives in a separate `impersonation` httpOnly cookie; the real NextAuth session is never touched, so exiting impersonation is just deleting one cookie.
- Audit attribution while impersonating: `getTenantContext()` returns `{ companyId, userId, role }` for the *impersonated* user (so any future business record's `createdBy` reflects the account that "created" it) plus a separate `impersonatedBy` field with the real super admin's id, for `AuditLog` rows. No tenant-data actions exist yet that would use this (Phase 1 has none), but the pattern is now established — **future phases writing `AuditLog` from inside impersonated sessions must use `ctx.impersonatedBy ?? ctx.userId` as the actor, not `ctx.userId` alone.**
- "Most active companies" (ARCHITECTURE.md §4, abbreviated in PHASES.md's Phase 1 bullet) interpreted as "most recently active" (sorted by the same `lastActivity` computation used elsewhere), since there's no sales data yet to rank by transaction volume — this will read more meaningfully once Phase 5+ adds invoices.
- Branding preview and company-scoped audit trail were included on the company detail page even though PHASES.md's own Phase 1 bullet list only says "stats, users, suspend/activate, reset admin password" — ARCHITECTURE.md §4's fuller page description for `/super/companies/[id]` explicitly lists "branding preview" and "audit trail", and CLAUDE.md says never contradict ARCHITECTURE.md. Both are read-only, using fields the Phase 0 schema already has — no new work, no editing UI (that's Phase 2's Branding tab).

**Known issues / tech debt**
- Real bug found and fixed during testing: Next.js automatically re-renders the *current* route after any Server Action resolves, regardless of whether the caller also calls `router.refresh()`. This meant clicking "Exit" while impersonating briefly re-rendered `/dashboard` as a plain (non-impersonating) SUPER_ADMIN session before the client-side `router.push("/super")` landed, and `getTenantContext()` used to `throw` in that case — surfacing a server error. Fixed by having `getTenantContext()` `redirect("/super")` instead of throwing when a SUPER_ADMIN has no active impersonation; this is a graceful, expected transient state, not an application error. Low severity (was cosmetic/log noise, never blocked the actual exit flow), but worth knowing if a similar "SUPER_ADMIN mid-impersonation-exit" state shows up elsewhere.
- Real bug found and fixed: the dashboard greeting and the company shell's sidebar user name both used to read `getServerSession().user.name` directly, which is the *real* super admin's name while impersonating, not the impersonated user's. Fixed by always resolving the display name via `prisma.user.findUnique({ where: { id: ctx.userId } })` (works identically whether impersonating or not, since `ctx.userId` is already the effective user). **Any future page that shows a user's name must resolve it the same way (via `getTenantContext()` + a User lookup), not via `getServerSession()` directly**, or it will misattribute the name during impersonation.
- Impersonation token has a fixed 1-hour expiry with no renewal — a long super-admin support session doing more than an hour of work as a company admin would need to re-click "Login as" after expiry. Acceptable for now; revisit if support sessions run long in practice.
- `/super/audit` has no pagination or filtering — just the latest 200 rows. Fine at current volume; will need a real filter/paginate UI once the audit table grows.
- No dedicated empty state yet for `/super/companies` when there are zero companies beyond the DataTable's generic "No companies yet" text — matches the design system's empty-state pattern loosely but doesn't use the specified "centered icon in a 20px-radius surface square" treatment from ARCHITECTURE.md §5. Minor, cosmetic.

**Notes for next phase**
- `lib/actions/super-admin.ts` and `lib/queries/super-admin.ts` are the established pattern for this kind of work: queries return plain serializable data for Server Components, actions are `"use server"` functions guarded by `requireSuperAdmin()`/(future) an analogous `requireRole()` helper, called directly from client components (not `<form action>`) so they can return typed data (e.g. the temp password) for the caller to use — mirrors Phase 0's `LoginForm` pattern.
- `components/ui/data-table.tsx` is generic and ready to reuse for Phase 3's product table, Phase 4's customers table, etc. Remember: column definitions with cell renderers (JSX, icons) must be defined *inside* a `"use client"` file that itself renders `<DataTable>` — passing a `columns` array built in a Server Component throws the same "functions can't cross the RSC boundary" error documented in the Phase 0 report. `CompaniesTable`/`UsersTable`/`AuditTable` are the reference pattern: the page (Server Component) fetches data and passes plain rows; the table component (Client Component) owns the column defs.
- `components/ui/dialog.tsx` (Radix-based) is now available for any future one-time-reveal or confirmation UI.
- Never wrap a call to a "use server" function that might call `redirect()` in your own `try/catch` — `redirect()` throws a sentinel Next.js needs to catch itself, and an outer catch will swallow it and show a false "error". `startImpersonation`/`exitImpersonation` deliberately don't call `redirect()` themselves for this reason; the client component calls `router.push()` after `await`-ing the action instead.
- Local dev super admin credentials are in `.env` (not committed); demo companies now include four "Test Solar …" companies created during this session's Playwright testing, left in the local DB alongside the Phase 0 fixtures (`demo-solar`, `suspended-solar`) — harmless, local-only, fine to ignore or reset next session.
- **Production sync still pending** — see "Deviations from plan" above. Needs real `DATABASE_URL`/`DIRECT_URL` (Neon), `SEED_SUPERADMIN_EMAIL`/`_PASSWORD` before `npx prisma migrate deploy && pnpm seed` can run against production.

**Checklist result**
- [x] Can create a company + admin, log in with those credentials in incognito (tested end-to-end with Playwright: create → temp password revealed once → separate browser context logs in with it → correct dashboard shell)
- [x] Suspend blocks that company's users; activate restores (verified: suspending mid-session immediately shows the suspended admin the lock screen on next navigation; activating restores the dashboard)
- [x] Impersonation works, banner shows, exit returns to /super (verified end-to-end, including the transient-render bug fix above)
- [x] Audit rows written and visible (all five action types — `company.create`, `company.suspend`, `company.activate`, `auth.impersonate` confirmed via Playwright; `user.password_reset` implemented identically and exercised manually, same code path)


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

---

### Phase 2 — Company settings, users, onboarding · 2026-07-08
**Status:** Complete

**Built**
- **Extra task this session (before Phase 2 itself):** "Change my password" — `lib/actions/account.ts#changePassword` (current + new password, bcrypt-verified, audited as `user.password_change`), Zod-validated in `lib/validations/account.ts`, UI in `components/account/change-password-dialog.tsx` (Radix dialog, reused). Deliberately keys off `getServerSession()` directly, not `getTenantContext()` — it must always act on the real authenticated principal, never an impersonated identity. Wired into both shells so every role including SUPER_ADMIN can reach it: a `KeyRound` icon button in the tenant `Sidebar`'s user area (hidden while impersonating — see Decisions) and a "Change password" button in `SuperNav` next to Sign out.
- `/onboarding` (`app/onboarding/page.tsx`, standalone route — **not** under the `(company)` layout group, so it renders full-screen with no sidebar): 4-step wizard (`components/onboarding/onboarding-wizard.tsx` + one component per step). Step 1 (company name) has no Skip button; steps 2–4 (branding, tax/currency, invoice notes) do. Each step's "Continue"/"Skip" saves that step's fields (or doesn't, on skip) via its own server action, then advances; the last step's Skip and Finish both call `completeOnboarding()`. `app/(company)/layout.tsx` now redirects any ADMIN with `onboardingComplete=false` to `/onboarding` on every request; `/onboarding` itself redirects away (to `/dashboard`) once complete, or for non-ADMIN roles.
- `/settings` (nested routes under `app/(company)/settings/`, shared `layout.tsx` with `SettingsTabs` nav): `/settings/branding` (logo, accent color, invoice header/footer notes, live preview card), `/settings/tax` (tax rate, currency, lakh/crore toggle), `/settings/users` (create MANAGER/CASHIER with temp password shown once, disable/enable, reset password — all company-scoped), `/settings/data` (placeholder). `/settings` itself redirects to `/settings/branding`.
- Accent color wired app-wide: `app/(company)/layout.tsx` applies `style={{ "--accent": company.accentColor }}` on its outer wrapper, so every descendant using the existing `bg-accent`/`text-accent` Tailwind classes (sidebar active-nav dot, primary buttons) picks up the per-tenant color at runtime — this CSS variable existed since Phase 0 but was never actually connected to a live value until now.
- Shared branding components (`components/branding/`): `LogoUploadField` (file input → client-side size/type check → `FileReader` → base64 data URL), `AccentColorField` (native color picker + hex text input), `BrandingPreviewCard` (the live-preview mockup, reused by both onboarding step 2 and the Settings Branding tab), `InvoiceNotesFields`.
- `lib/requireRole.ts`: tenant-scoped analogue of Phase 1's `requireSuperAdmin()` — wraps `getTenantContext()` with a role check, used by every onboarding/settings server action.
- `lib/actions/onboarding.ts`, `lib/actions/settings-users.ts`: all server actions guarded by `requireRole("ADMIN")`; `createCompanyUser`/`setCompanyUserStatus`/`resetCompanyUserPassword` write `AuditLog` rows (`user.create`, `user.disable`, `user.enable`, `user.password_reset`) using `ctx.impersonatedBy ?? ctx.userId` as the actor per the Phase 1 impersonation-audit pattern.
- Moved `RevealPasswordDialog` from `components/super/` to `components/ui/` (no code changes) since Settings > Users now reuses it for the same "show a generated password once" pattern Phase 1 established — its actual scope had genuinely broadened beyond super-admin-only.
- `Sidebar`'s logo now renders via a plain `<img>` instead of `next/image` (previously used for the Phase 0 remote-logo case) — needed since logos are now base64 data URIs, which `next/image` doesn't optimize anyway.

**Deviations from plan**
- **Skipped the "first product" onboarding step that ARCHITECTURE.md §4's page map mentions** ("steps 2–4: logo/branding, tax & currency, first product"). PHASES.md's own Phase 2 scope line lists exactly four content groups instead (name; logo+accent; tax+currency+number format; invoice header/footer) with no product step, and building one would mean building inventory data entry a full phase ahead of Phase 3 ("Categories CRUD, Products...", not yet built) — a direct conflict with "do not build ahead." Followed PHASES.md's literal, more specific list here rather than ARCHITECTURE.md's terser one.
- Branch: Phase 1's PR was already merged to `main` before this session, so per the merged-branch rule I restarted from `main` on a new branch (`claude/phase-2-settings-users-onboarding`) rather than stacking on merged history.
- Settings > Branding tab includes invoice header/footer note editing even though PHASES.md's Phase 2 bullet only says "Branding (live preview card)" — ARCHITECTURE.md §4 explicitly lists "Branding (logo, accent, invoice header/footer)" as one tab, and CLAUDE.md says never contradict ARCHITECTURE.md; same precedent as Phase 1's company-detail page. Onboarding keeps them as a separate step (its own wizard segment) purely for pacing — same underlying Company fields either way.
- Currency is a hard-coded 5-option `<select>` (PKR/INR/USD/AED/SAR) rather than free text, even though `Company.currency` is an unconstrained `String` column. These are exactly the currencies `lib/formatMoney.ts`'s symbol map already recognizes; constraining the form avoids silently accepting a currency code the app can't render a symbol for. Not a schema change — just a form-level choice.
- "Change password" (Task A) wasn't in PHASES.md's Phase 2 scope at all; it was this session's separate, explicit small task, done first as requested, before starting Phase 2 itself.

**Schema changes**
None. Every field Phase 2 reads/writes (`name`, `logoUrl`, `accentColor`, `taxRate`, `currency`, `lakhCroreFormat`, `invoiceHeaderNote`, `invoiceFooterNote`, `onboardingComplete`, plus `User.status`) already existed on the Phase 0 schema.

**Decisions made**
- **Logo storage: base64 data URI in `Company.logoUrl`, not Vercel Blob.** `Company.logoUrl` is already a plain `String?` — a data URI (`data:image/png;base64,...`) is a drop-in value, no migration needed. Chose this over Vercel Blob because (a) this sandboxed environment has no Vercel Blob credentials and no way to provision/test one this session — same class of constraint as the Neon-access issue from an earlier session, and I didn't want to ship an integration I couldn't verify end-to-end; (b) it's fully testable locally with nothing beyond what's already installed, which mattered given how much of this phase needed real Playwright verification (onboarding, live accent updates); (c) at expected v1 scale (one logo per company, capped at 300KB raw / ~400KB encoded, client- and server-validated) the row-size cost is negligible. Trade-off, for the record: base64 bloats the `Company` row and isn't CDN-cached, so every request that needs `logoUrl` (every page load, via the layout) pays for it. If logos turn out to be large/numerous at real scale, swap to Vercel Blob later — `logoUrl` staying "just a URL string" makes that a backend-only change, no schema or calling-code migration needed beyond swapping what gets written there.
- Onboarding step 2's uploaded logo caps at 300KB (raw file) / ~400KB (base64), checked both client-side (`lib/logo.ts` constants, immediate inline error) and server-side (Zod regex + length cap in `brandingSchema`) — the client check is just UX, the server one is the actual boundary.
- Settings tabs are real nested routes (`/settings/branding`, `/settings/tax`, `/settings/users`, `/settings/data`) under a shared layout, not client-side tab-switching state — matches the `/super/*` precedent from Phase 1, gives each tab its own bookmarkable URL and independent data fetch.
- Row-level user management on `/settings/users` prevents an ADMIN from disabling their own account (a self-lockout guard, checked server-side in `setCompanyUserStatus`) but does allow resetting their own password through the same admin-generated-temp-password flow as any other user — harmless, and simpler than adding a special case, given the separate self-service "change password" flow already covers the normal case.
- The Sidebar's "Change password" trigger is hidden while impersonating (`ctx.impersonatedBy` truthy): the dialog operates on the *real* authenticated session, and offering to "change my password" while visually inside someone else's company (impersonation banner showing) would be confusing about whose credential is actually being touched. A SUPER_ADMIN who wants to rotate their own password mid-support-session can exit impersonation first, or use the always-available trigger in `SuperNav`.

**Known issues / tech debt**
- **Real bug found and fixed during testing, worth flagging loudly for future phases:** I initially assumed Next.js's "auto-refresh the current route after a Server Action resolves" behavior (documented as a gotcha in the Phase 1 report) meant explicit `revalidatePath`/`router.refresh()` calls were redundant once a route is `force-dynamic`. **This is wrong.** That automatic behavior only re-fetches paths that were actually marked stale (via `revalidatePath`) or explicitly told to refresh (via `router.refresh()`) — `force-dynamic` only stops the *server* from serving a cached/static render on a fresh request; it does nothing about the *client-side* Router Cache, which is what was actually serving stale data here. Concretely: saving a new accent color in Settings > Branding silently succeeded in the database but the sidebar's nav dot / primary buttons kept showing the old color until a manual reload, because nothing told the client to refetch. Fixed by adding `router.refresh()` after every mutation in `BrandingForm`, `TaxCurrencyForm`, `CreateUserForm`, and `CompanyUserRowActions`. **Any future client component that calls a "use server" action and expects currently-displayed data (its own page or an ancestor layout) to reflect the change must call `router.refresh()` explicitly — don't assume it happens automatically.** (Phase 1's equivalent components happened to avoid this bug only because they called `revalidatePath` server-side, which is the other valid way to get the same effect.)
- Test PNG used during this session's logo-upload testing was a solid black 1×1 pixel (not transparent, despite my assumption) — cosmetic confusion during my own testing only, not a product bug; flagging so a future reader of the test scripts in this session's history isn't confused by "the logo renders solid black" screenshots.
- No image resizing/compression on upload — a 300KB PNG that's mostly whitespace could be a bigger logo than one that's information-dense; acceptable for v1, a future phase could add client-side canvas resizing before encoding if logo sizes become a real problem.
- `/settings/data` is a pure placeholder (per Phase 2 scope) — no export functionality yet.

**Notes for next phase**
- `lib/requireRole(...roles)` is the tenant-scoped counterpart to Phase 1's `requireSuperAdmin()` — use it (not a hand-rolled check) in every new server action that needs a specific company role.
- The base64-in-db logo pattern (`lib/logo.ts` constants + `LogoUploadField`) is reusable as-is if any future phase needs another image upload (e.g., product photos) — same size-cap/validation shape, just point it at a different column.
- `router.refresh()` gotcha above — read it before writing any new mutation-triggering client component.
- Company branding fields (`accentColor`, `logoUrl`, `taxRate`, `currency`, `lakhCroreFormat`, invoice notes) are now fully editable via Settings; Phase 5+ (POS/invoices) should read these directly off the `Company` row (already the plan per ARCHITECTURE.md) rather than re-deriving defaults.
- Demo/test fixtures added to the local dev DB this session (multiple "Onboard Full/Skip …" and "Accent Check …" test companies, plus MANAGER/CASHIER test users under one of them) — harmless, local-only, fine to ignore or reset next session. The seeded Super Admin's password was temporarily rotated twice during testing and reverted back to the original `.env` value before finishing — confirmed working with the original credential.

**Checklist result**
- [x] New admin is forced through onboarding once, skips work, name required (tested both a full pass — name, logo+color, tax/currency, invoice notes, Finish — and a skip pass — name required with no Skip button on step 1, then Skip on all of steps 2–4 including the last one, which also completes onboarding; re-visiting `/onboarding` after completion redirects to `/dashboard`)
- [x] Accent color changes nav dot + primary buttons instantly (verified via computed styles, not just visually: `--accent` CSS var and the nav dot's `background-color` both reflect a newly-saved color on the same page, no manual reload — this is the bug described above, now fixed)
- [x] Manager/cashier accounts can be created and log in with correct nav (created both from Settings > Users, temp passwords revealed once, logged in as each in separate browser contexts, confirmed role-correct sidebars; also exercised disable → login blocked → re-enable → login restored)
- [x] Settings blocked for MANAGER and CASHIER, server-side too (both roles redirected away from `/settings` and a specific sub-tab when navigating directly by URL; every settings/onboarding server action independently calls `requireRole("ADMIN")` regardless of what the UI shows)

---

### Design corrections (pre-Phase-3 fix-up) + Phase 3 — Inventory · 2026-07-08
**Status:** Complete

**Built**

*Design corrections (requested at the start of this session, done before Phase 3 itself):*
- Audited every button, status render, native `<select>`, and form-error pattern app-wide against the design tokens. Could not reproduce the two specific reported bugs ("Create user" button blue/non-pilled; plain-text status in Settings > Users) on current `main` — `components/ui/button.tsx`'s `primary` variant already renders `bg-accent` + unconditional `rounded-pill`, confirmed live via Playwright computed-style inspection (`backgroundColor: rgb(124, 58, 237)`, `borderRadius: 9999px` for a real tenant's accent color), and `company-users-table.tsx` already used `<StatusChip>` for user status. Documented here rather than fabricating a fix, per instructions not to gold-plate.
- Did the audit's other findings anyway since a "fix any that deviate" sweep was explicitly requested: added `components/ui/select.tsx` (native `<select>` styled to match `Input`'s `rounded-input`/hairline-border tokens, with a `ChevronDown` icon) and migrated the three remaining raw `<select>` elements (`create-user-form.tsx`, `tax-currency-form.tsx`, `step-tax-currency.tsx`) to it. Added `appearance-none` to `Button`'s base classes as a defensive hardening (Safari/iOS sometimes applies native button chrome that can visually fight `rounded-pill`).
- Added `lib/useZodFormErrors.ts`, a small reusable hook implementing "errors only after submit or blur" (tracks a `Record<string,string>` of field errors, exposes `validateOnSubmit`/`validateField`/`clearErrors`). Migrated every form still using the old always-visible per-field-error pattern to it: `create-user-form.tsx`, `tax-currency-form.tsx`, `create-company-form.tsx` (super admin), `change-password-dialog.tsx`, `login-form.tsx`. Onboarding step forms (single combined error string, not per-field) were left as-is since they don't exhibit the pristine-error bug — but this session's inventory forms (below) were all built on this hook from the start.
- Logo upload cap lowered from 300KB to 200KB (`lib/logo.ts`'s `MAX_LOGO_FILE_BYTES`), with a clear inline rejection error above the cap. Added `lib/compressImage.ts`: canvas-based client-side downscale (max 256px) + re-encode, trying lossless PNG first (keeps transparency for typical small logos), falling back to JPEG on a white background at decreasing quality (0.92 → 0.4) until the result fits the encoded-size budget; returns `null` (surfaced as an inline error) if nothing fits. `components/branding/logo-upload-field.tsx` now calls this after the hard-reject check, with a "Processing…" state during compression.

*Phase 3 — Inventory:*
- **Categories**: `lib/validations/inventory.ts#categorySchema`, `lib/actions/inventory.ts` (`createCategory`/`updateCategory`/`deleteCategory`, P2002 → "A category with this name already exists"), `lib/queries/inventory.ts#listCategories` (with product counts). UI: `components/inventory/create-category-form.tsx`, `categories-table.tsx`, `category-row-actions.tsx` (edit dialog + delete with a count-aware confirm message), `edit-category-dialog.tsx`. Route: `app/(company)/inventory/categories/page.tsx`.
- **Products**: `productSchema`/`createProductSchema` (create adds `openingStockQty`), `createProduct`/`updateProduct` (deliberately has no `stockQty` field — stock only changes via adjustments)/`deleteProduct` (soft delete via `deletedAt`) in `lib/actions/inventory.ts`. `listProductsForCompany` computes `lowStock: stockQty <= reorderLevel` server-side and returns `costPrice`/`salePrice` as `.toString()` (Prisma `Decimal`), rendered through `formatMoney()` in the client table using the company's `currency`/`lakhCroreFormat`. UI: `components/inventory/products-table.tsx` (client-side search/category/low-stock filtering via a single `useMemo`, doesn't touch the shared `DataTable`), `product-form.tsx` (shared create/edit, SKU auto-suggest, `Sparkles` re-suggest button), `product-row-actions.tsx` (soft delete). Routes: `app/(company)/inventory/page.tsx` (list + "New product"), `/new/page.tsx`, `/[id]/page.tsx` (edit form + adjustment history + "Adjust stock").
- **Stock adjustments**: `stockAdjustmentSchema` (`MANUAL`/`DAMAGE` reasons only — `PURCHASE`/`SALE`/`RETURN`/`OPENING` are written by other flows, not user-selectable here), `createStockAdjustment` in a `$transaction`: atomic floor-at-zero decrement via `product.updateMany({ where: { ..., stockQty: { gte: -qtyChange } }, data: { stockQty: { increment: qtyChange } } })` — if `count === 0` the adjustment would take stock negative, transaction throws "That adjustment would take stock below zero" before any row is written. Then writes `StockAdjustment` (`userId: ctx.userId`, the effective/impersonated user) and `AuditLog` (`stock.adjust`, actor `ctx.impersonatedBy ?? ctx.userId`) in the same transaction. UI: `components/inventory/stock-adjustment-dialog.tsx` (dialog with qty/reason/note), `product-adjustment-history.tsx` (per-product, last 50), `adjustments-table.tsx` (company-wide, last 200, includes product name/SKU/user) at `app/(company)/inventory/adjustments/page.tsx`.
- **Low stock**: computed server-side (`stockQty <= reorderLevel`) in both `listProductsForCompany` and the row-mapping for detail/adjustments queries; surfaced as a `StatusChip variant="warning"` "Low stock" badge next to the stock number in the products table, and as a checkbox filter ("Low stock only").
- **SKU auto-suggest**: `lib/queries/inventory.ts#suggestSku(companyId, categoryId)` derives a 3-letter uppercase prefix from the category name (falls back to `"PRD"` with no category), scans existing `Product.sku` values with that prefix, and returns `PREFIX-0001`-style next value (unique per company, since `sku` uniqueness is `@@unique([companyId, sku])`). Wired into `product-form.tsx`: auto-fires (via `suggestSkuAction` server action) whenever the category changes and the SKU field hasn't been manually touched yet (create mode only), plus an explicit re-suggest button.
- **CSV export**: `lib/exportCsv.ts#downloadCsv(filename, headers, rows)` — pure client-side (`Blob` + a temporary `<a download>`, no server round-trip), invoked from `products-table.tsx`'s "Export CSV" button using the exact same `filtered` array the table renders, so the export always matches whatever search/category/low-stock filters are active.
- Nav: `/inventory` was already present in `lib/nav-items.ts` for ADMIN/MANAGER (not CASHIER) since Phase 0 — no change needed there.

**Deviations from plan**
- Categories and the global adjustments list are full pages under `/inventory/categories` and `/inventory/adjustments` (tab-navigated via a small `InventoryTabs` component, duplicated inline in those two pages plus the products list page rather than a shared conditional layout) instead of dialogs on the products page — matches the `/settings/*` and `/super/*` nested-route precedent from earlier phases, gives each list its own bookmarkable URL.
- Product create/edit are full pages (`/inventory/new`, `/inventory/[id]`) rather than a dialog, matching the `/super/companies/new` precedent — a form with 9 fields plus SKU auto-suggest didn't fit a dialog's `max-w-md`.
- Everything else matches PHASES.md's Phase 3 scope line-for-line; nothing beyond it was built (no serial/warranty tracking, no barcode scanning, no purchases/suppliers linkage — those are explicitly out of scope or later phases).

**Schema changes**
None. `Category`, `Product`, `StockAdjustment`, and the `AdjustReason` enum all existed unchanged from the Phase 0 schema; this phase only wrote queries/actions/UI against them. (Confirmed via the generated migration SQL that `Product.categoryId → Category` is `ON DELETE SET NULL`, so `deleteCategory` needs no manual product cleanup.)

**Decisions made**
- Product edit intentionally has no `stockQty` input at all — the only way to change stock is a `StockAdjustment` (with reason + audit trail), never a silent form edit. `updateProduct`'s Zod schema (`productSchema`) simply has no such field, so this is enforced at the type level, not just hidden in the UI.
- `MANUAL`/`DAMAGE` are the only reasons exposed in the adjustment UI; `PURCHASE`/`SALE`/`RETURN` are reserved for future phases (purchasing, POS, returns) to write programmatically, and `OPENING` is written only by `createProduct` itself — none of these four are user-selectable in the adjustment dialog, to keep the audit trail meaningful.
- The atomic stock decrement uses a single `updateMany` with a conditional `WHERE stockQty >= -qtyChange` instead of a read-then-write — avoids a race condition (two concurrent adjustments both reading "stock is fine" then both writing) without needing raw SQL row locking, and `count === 0` cleanly detects the rejected case.
- SKU auto-suggest recomputes only while the field is untouched (a `skuTouched` flag flips on first manual edit or on selecting a category with the field still empty) so it never clobbers a SKU the user typed themselves, but still reacts live to category changes for a fresh form.
- CSV export and all list filtering are pure client-side JS (`.filter()` on a `useMemo`, not TanStack's built-in column-filter state) — kept the shared `DataTable` component completely unchanged, filtering happens one layer above it.

**Known issues / tech debt**
- `getProductDetail` and `listAllAdjustments` each resolve adjustment `userName` with a separate `findMany` + in-memory `Map` lookup rather than a Prisma `include` — done this way because `StockAdjustment.user` isn't a named relation alias conflict, but mainly to keep the query simple; fine at expected v1 scale (a few hundred adjustments per company), would want a proper join if adjustment volume grows large.
- No pagination on the products table, adjustments list, or categories list (loads the full company dataset, capped at 200 for the global adjustments query and 50 for per-product history) — acceptable for v1 given expected per-company catalog sizes; a future phase should add it if a company's catalog grows past a few hundred SKUs.
- `lib/exportCsv.ts` and `lib/useZodFormErrors.ts` (added this session) are both fully generic and reusable as-is by later phases (Customers, Invoices, etc.) — no product-specific logic in either.

**Notes for next phase**
- `INVENTORY_ROLES = ["ADMIN", "MANAGER"] as const` in `lib/actions/inventory.ts` is the precedent for phase-scoped role tuples passed to `requireRole(...roles)` — CASHIER is excluded from all of Inventory per ARCHITECTURE.md's role matrix; Phase 4 (Customers/khata/Suppliers) should decide its own role tuple the same way rather than assuming Inventory's.
- `formatMoney()` needs `{ currency, lakhCroreFormat }` fetched off the `Company` row — every future money-displaying list page should fetch those two fields alongside its own data (see `app/(company)/inventory/page.tsx`), there's no shared context/hook for it yet.
- The category-prefix SKU-suggestion algorithm (`lib/queries/inventory.ts#suggestSku`) is Inventory-specific and not meant to generalize, but the "scan existing per-company values with a prefix, take the max numeric suffix, +1" pattern is the same shape Phase 5 will need for `INV-0001`/`QUO-0001` invoice/quotation numbering (per CLAUDE.md's hard rule) — that one must run inside the invoice-creation transaction itself (not a separate suggest step) to avoid duplicate numbers under concurrent sales, unlike this best-effort SKU suggestion which is fine to compute outside a transaction since a form re-submit just gets a fresh suggestion.
- End-to-end Playwright testing surfaced one real testing gotcha worth flagging: `page.textContent("body")` is unreliable for asserting "this row is/isn't visible after a client-side filter" in this app, because Next.js embeds the full unfiltered RSC data payload as inline JSON inside `<body>` — a body-text check will "see" data that's actually filtered out of the rendered table. Scope such assertions to the rendered element (e.g. `page.locator("table").innerText()`) instead. (Absence checks for genuinely-not-fetched data — soft-deleted rows after `router.refresh()`, another tenant's rows entirely — are unaffected, since the server never sent that data in the first place.)
- The local dev server's `.next` build cache became stale mid-session (all static chunks 404ing, silently breaking client-side hydration so form submits fell back to plain HTML GETs) after an earlier background restart left a zombie `next-server` process holding port 3000. Fixed by killing all stray `next dev`/`next-server` PIDs (not just whatever's on port 3000 — a wedged process can be invisible to `lsof`) and removing `.next` before restarting. Worth checking for zombie Next processes first if a future session sees Playwright interactions silently no-op.

**Checklist result**
- [x] Product CRUD with validation, money stored as Decimal (create/edit/soft-delete all exercised via Playwright; `costPrice`/`salePrice` are Prisma `Decimal` end to end, displayed via `formatMoney()`)
- [x] Manual adjustment changes stockQty atomically and writes StockAdjustment + AuditLog (verified +10 and -5 adjustments update `stockQty` correctly and appear in both per-product and global history; verified a -100 over-decrement is rejected with "would take stock below zero" and writes nothing; confirmed `AuditLog` rows for `stock.adjust`, `product.create`, `product.update`, `product.delete`, `category.create` all present in the DB after the test run)
- [x] CSV export downloads the filtered view (downloaded file content checked byte-for-byte against the active low-stock-only filter — contains only the matching product, not the filtered-out one)
- [x] Tenant isolation verified: two companies can't see each other's products (fresh Company A/B created via Super Admin this session; Company B's categories/products/adjustments pages show zero Company A data; Company B can reuse Company A's exact SKU string, proving uniqueness is per-company (`@@unique([companyId, sku])`), not global; direct URL access from Company B to Company A's product ID returns a 404, not a data leak or crash)

---

### Phase 4 — Customers, khata ledger, suppliers · 2026-07-09
**Status:** Complete

**Built**
- **Customers CRUD**: `lib/validations/customers.ts` (Zod schemas for create/update, manual ledger entry, receive payment with `PAYMENT_METHODS` enum), `lib/queries/customers.ts` (`listCustomersWithBalance` using `prisma.ledgerEntry.groupBy` for efficient balance computation — 2 queries total, no N+1 — and `getCustomerDetail` with chronological ledger + running balance via `Prisma.Decimal` arithmetic), `lib/actions/customers.ts` (`createCustomer` with transactional opening balance LedgerEntry, `updateCustomer`, `deleteCustomer` soft delete, `createManualLedgerEntry`, `receivePayment` with transactional Payment + LedgerEntry)
- **Customer routes**: `app/(company)/customers/page.tsx` (list with "New customer" button), `customers/new/page.tsx` (create form with opening balance), `customers/[id]/page.tsx` (detail page: profile, balance display, inline edit form without opening balance field, manual debit/credit dialog, receive payment dialog, ledger table with running balance)
- **Customer UI components**: `components/customers/customers-table.tsx` (TanStack table, client-side search filter on name/phone/email, balance column with custom `sortingFn`, balance shown red when > 0), `customer-form.tsx` (shared create/edit, opening balance field only in create mode, uses `useZodFormErrors`), `customer-ledger.tsx` (TanStack table with date/type/debit/credit/running balance/note/user columns, StatusChip per type), `manual-ledger-entry-dialog.tsx` (MANUAL_DEBIT/MANUAL_CREDIT select, amount, note), `receive-payment-dialog.tsx` (amount, payment method select with all 6 PaymentMethod enum values, note, shows current balance), `customer-row-actions.tsx` (soft delete with confirm)
- **Suppliers CRUD**: `lib/validations/suppliers.ts` (Zod schema), `lib/queries/suppliers.ts` (`listSuppliers` with soft delete filter), `lib/actions/suppliers.ts` (`createSupplier`, `updateSupplier`, `deleteSupplier` soft delete, all with AuditLog)
- **Supplier route**: `app/(company)/suppliers/page.tsx` (inline create form + table)
- **Supplier UI components**: `components/suppliers/suppliers-table.tsx` (TanStack table, client-side search filter on name/phone), `create-supplier-form.tsx` (inline form in Card), `edit-supplier-dialog.tsx` (edit dialog), `supplier-row-actions.tsx` (edit + delete with confirm)
- All actions gated by `requireRole("ADMIN", "MANAGER")` — CASHIER excluded per ARCHITECTURE.md role matrix
- All mutations write `AuditLog` rows with `ctx.impersonatedBy ?? ctx.userId` as actor

**Deviations from plan**
- None. All scope items from PHASES.md Phase 4 were implemented as specified. Customer balance is computed purely from ledger entries (never stored denormalized), opening balance creates a LedgerEntry(OPENING, debit=amount) in a transaction, payments create Payment + LedgerEntry(PAYMENT, credit=amount) in a transaction.

**Schema changes**
None. `Customer`, `LedgerEntry`, `Payment`, `Supplier`, and all related enums (`LedgerType`, `PaymentMethod`) existed unchanged from the Phase 0 schema.

**Decisions made**
- `CUSTOMER_ROLES = ["ADMIN", "MANAGER"] as const` — CASHIER excluded from customers/suppliers, following the Phase 3 `INVENTORY_ROLES` precedent and ARCHITECTURE.md's role matrix.
- Balance computation strategy: `listCustomersWithBalance` uses `prisma.ledgerEntry.groupBy({ by: ["customerId"], _sum: { debit: true, credit: true } })` for efficient O(1) per-company balance aggregation (2 queries: customers + grouped ledger sums). `getCustomerDetail` computes running balance by iterating chronologically with `Prisma.Decimal` arithmetic — each row's running balance = previous + debit - credit.
- Customer edit form deliberately omits `openingBalance` — opening balance is a one-time event on creation (writes a ledger entry), not an editable profile field. Editing the profile never touches the ledger.
- Suppliers have inline create (form + table on same page) rather than a separate `/suppliers/new` route — simpler UX for a simple CRUD entity with only 3 fields (name, phone, address).
- The `Customer.openingBalance` Prisma field stores the original opening balance for reference, but the displayed balance everywhere comes exclusively from summing ledger entries — this ensures the ledger is always the single source of truth.

**Known issues / tech debt**
- No pagination on customers or suppliers tables — loads the full company dataset. Acceptable for v1 given expected per-company customer/supplier counts; add pagination if a company grows past several hundred customers.
- Customer search filters on name/phone/email substring — note that "Ali" matches "Sara Malik" because "Malik" contains "ali". This is correct behavior for substring search but worth knowing for test assertions.
- Running balance on the customer detail ledger is computed client-side from the chronologically-ordered entries the server provides — not stored as a column. This is fine for expected ledger sizes; if a customer accumulates thousands of entries, the server could paginate and provide a starting balance.

**Notes for next phase**
- `receivePayment` in `lib/actions/customers.ts` creates both a `Payment` record and a `LedgerEntry(PAYMENT, credit=amount, refId=payment.id)` in a single `$transaction` — Phase 5's invoice payment flow should follow the same pattern, linking the ledger entry back to the payment via `refId`.
- `LedgerType.INVOICE` entries are not yet written (no invoices exist yet) — Phase 5 will need to write `LedgerEntry(INVOICE, debit=invoiceTotal)` when creating a credit sale, and the customer balance computation already handles all ledger types generically.
- The `formatMoney` pattern established in Phase 3 is reused here: every money-displaying page fetches `{ currency, lakhCroreFormat }` from the Company row and passes them to the client component.
- `lib/exportCsv.ts` and `lib/useZodFormErrors.ts` from Phase 3 are both reused in this phase's forms and could be reused in Phase 5's invoice/POS forms.
- The `DataTable` component from Phase 1 is reused unchanged — column definitions are always in `"use client"` table wrapper components, data is passed as plain serializable rows from Server Components.

**Checklist result**
- [x] Ledger math correct: opening + debits - credits = balance shown everywhere (verified: opening 15,000 + manual debit 5,000 = 20,000; - payment 8,000 = 12,000; - JazzCash 2,000 = 10,000; - manual credit 1,000 = 9,000 — all matching in detail page balance, ledger running balance column, and customers table balance column)
- [x] Receiving a khata payment (no invoice) updates balance (verified: "Receive payment" flow with CASH and JAZZCASH methods both correctly create Payment + LedgerEntry and update the displayed balance)
- [x] Dues visible in customers table, sortable (verified: balance column shows formatted amounts, red when > 0, with custom sortingFn for numeric sorting)

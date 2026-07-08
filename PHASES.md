# PHASES.md — Build Plan

Rules: one phase per Claude Code session. Read CLAUDE.md, ARCHITECTURE.md, and SCRATCHPAD.md before starting. Build only the listed scope. Finish with the Done Checklist, then append a report to SCRATCHPAD.md and commit as `phase-N: <summary>`.

---

## Phase 0 — Foundation
**Scope**
- Scaffold Next.js (App Router, TS), Tailwind, shadcn/ui, Prisma, NextAuth
- Implement the FULL Prisma schema from ARCHITECTURE.md §3 in one migration
- Design tokens from ARCHITECTURE.md §5 wired into Tailwind config + globals (CSS variables, Inter font)
- Auth: credentials login, JWT with { userId, role, companyId }, middleware guards per §6, suspended-company lock screen
- `getTenantContext()` helper + a `db` module pattern for tenant-scoped queries
- App shell: sidebar layout (per §5), topbar with Cmd+K placeholder, role-based nav items
- Seed script: super admin from env vars
- `formatMoney()` util (currency + lakh/crore aware)

**Done checklist**
- [ ] `prisma migrate dev` clean, all models present
- [ ] Login works for seeded super admin, redirects to /super (placeholder page)
- [ ] A fake seeded company admin logs in, sees empty shell with sidebar, correct nav for role
- [ ] Suspended company shows lock screen
- [ ] Tokens visible: off-white bg, hairline borders, pill buttons on the login page
- [ ] Build passes, deploys to Vercel

---

## Phase 1 — Super Admin panel
**Scope**
- /super overview with stats cards
- /super/companies table (status, users count, invoice count, last activity)
- Create company flow: company fields + first ADMIN user with temp password (shown once)
- Company detail page: stats, users, suspend/activate, reset admin password
- Login-as (impersonation): flagged session, top banner "Viewing as {company} — Exit", all actions audited under super admin id
- /super/audit global audit log table
- AuditLog writes for: company.create, company.suspend, company.activate, user.password_reset, auth.impersonate

**Done checklist**
- [ ] Can create a company + admin, log in with those credentials in incognito
- [ ] Suspend blocks that company's users; activate restores
- [ ] Impersonation works, banner shows, exit returns to /super
- [ ] Audit rows written and visible

---

## Phase 2 — Company settings, users, onboarding
**Scope**
- /onboarding wizard, triggers on ADMIN first login while `onboardingComplete=false`. Step 1: company name (required). Steps 2–4: logo + accent color, tax rate + currency + number format, invoice header/footer note. Every step after 1 has a Skip button; final "Finish" sets onboardingComplete
- /settings tabs: Branding (live preview card), Tax & currency, Users (create user with role MANAGER/CASHIER, disable/enable, reset password), Data (placeholder for exports)
- Accent color applied app-wide via CSS variable from Company row
- Logo upload (Vercel Blob or base64-in-db fallback; pick one, note it in scratchpad)

**Done checklist**
- [ ] New admin is forced through onboarding once, skips work, name required
- [ ] Accent color changes nav dot + primary buttons instantly
- [ ] Manager/cashier accounts can be created and log in with correct nav
- [ ] Settings blocked for MANAGER and CASHIER (server-side too)

---

## Phase 3 — Inventory
**Scope**
- Categories CRUD
- Products: table (TanStack: search, category filter, low-stock filter, CSV export), create/edit form (Zod), soft delete
- Stock adjustments: manual +/− with reason and note; adjustment history per product and global
- Low stock: computed `stockQty <= reorderLevel`, badge in table, count on dashboard later
- SKU auto-suggest (category prefix + increment), unique per company

**Done checklist**
- [ ] Product CRUD with validation, money stored as Decimal
- [ ] Manual adjustment changes stockQty atomically and writes StockAdjustment + AuditLog
- [ ] CSV export downloads the filtered view
- [ ] Tenant isolation verified: two companies can't see each other's products

---

## Phase 4 — Customers, khata, suppliers
**Scope**
- Customers: table with computed balance column, CRUD, soft delete
- Customer detail: profile + ledger with running balance, manual debit/credit entries, "Receive payment" (creates Payment + LedgerEntry credit)
- Opening balance handled via LedgerEntry(OPENING) on create
- Suppliers: simple CRUD list

**Done checklist**
- [ ] Ledger math correct: opening + debits − credits = balance shown everywhere
- [ ] Receiving a khata payment (no invoice) updates balance
- [ ] Dues visible in customers table, sortable

---

## Phase 5 — POS, invoices, payments, PDFs
**Scope**
- /pos: search-first product picker (keyboard: type, Enter adds), cart with qty/price edit, line + bill discount, attach customer or walk-in, tax from settings, payment amount + method, cash/credit split (partial pay → PARTIAL, ledger debit for rest)
- Invoice creation transaction per ARCHITECTURE.md §3 business rules
- /invoices list (status chips, filters, search) + /invoices/new (standard form) + detail page
- Record additional payment on an invoice (updates status + ledger)
- A4 PDF (branding: logo, header/footer notes, accent) + 80mm thermal receipt via react-to-print
- WhatsApp share: `wa.me` link with invoice summary + public read-only PDF link (signed token route)

**Done checklist**
- [ ] POS sale decrements stock, writes ledger for credit portion, prints receipt
- [ ] Oversell blocked (stock check in transaction)
- [ ] Invoice numbers sequential per company under concurrent creates
- [ ] PDF shows company branding; walk-in and customer invoices both render
- [ ] WhatsApp link opens with prefilled message

---

## Phase 6 — Quotations & returns
**Scope**
- Quotations: create (saved customer or free-text name), list, detail, statuses, validUntil
- Quotation PDF (same branded template family) + WhatsApp share
- One-click convert to invoice (links both ways, stock/ledger only on invoice)
- Returns: from invoice detail, pick items + qty, restock toggle, ledger credit if customer, AuditLog

**Done checklist**
- [ ] Convert produces a correct UNPAID invoice and marks quote CONVERTED
- [ ] Return restores stock and reduces customer balance
- [ ] Quote does not affect stock at any point

---

## Phase 7 — Purchases, expenses, reports
**Scope**
- Purchase orders: create (supplier + items + costs), DRAFT → ORDERED → RECEIVED; receive increments stock (StockAdjustment PURCHASE), optional costPrice update
- Expenses: quick-add form, list with month filter, fixed category list
- /reports tabs with date-range picker: Sales (count, revenue, by day chart), Profit (revenue − COGS from cost snapshots − expenses), Stock valuation (qty × cost), Customer dues (sorted balances), Top products
- CSV export on each report

**Done checklist**
- [ ] Receiving a PO updates stock and shows in product history
- [ ] Profit report reconciles with a hand-checked sample
- [ ] All report queries tenant-scoped and date-filtered

---

## Phase 8 — Dashboards, Cmd+K, polish, demo
**Scope**
- /dashboard per role: ADMIN (greeting, today sales, month revenue chart, dues total, low-stock count linking to filtered inventory, recent invoices); MANAGER (inventory + sales widgets); CASHIER redirects to /pos
- Cmd+K palette: navigate + search products/customers/invoices
- Audit log viewer in /settings for ADMIN (company-scoped)
- Demo seed script: `pnpm seed:demo` fills a company with realistic solar products (panels, inverters, batteries, cables, structures), customers, 60 days of sales
- Polish pass: empty states, loading skeletons, mobile-responsive tables (card collapse), toasts
- Deploy checklist in README: Neon setup, env vars, Vercel config, creating first real company

**Done checklist**
- [ ] Each role lands on the right dashboard
- [ ] Cmd+K finds a product and jumps to it
- [ ] Demo seed produces a convincing demo account
- [ ] Lighthouse pass reasonable, no console errors, build clean
- [ ] README deploy guide verified start-to-finish

# ARCHITECTURE.md — Solar IMS (Whitelabel, Multi-Tenant)

## 1. System model

One Next.js app, one Postgres database. Tenancy is logical: every business table carries `companyId`. The Super Admin operates a control panel at `/super` to create, monitor, suspend, and support companies. Company users log in at `/login`; their company is resolved from their user record, never from the URL.

Branding is data, not code: logo, accent color, invoice header/footer, tax rate, currency all live on the `Company` row and are applied at runtime (theme provider reads accent color; PDF templates read branding fields).

## 2. Roles & permissions

| Role | Scope | Can do |
|---|---|---|
| SUPER_ADMIN | Global (companyId = null) | Everything in `/super`: create/suspend companies, create company admin credentials, reset passwords, view usage stats, login-as any company admin (impersonation, audited). No access to day-to-day tenant screens except via impersonation. |
| ADMIN | Own company | Everything: settings, branding, users, all modules, reports, exports. |
| MANAGER | Own company | Inventory, customers, suppliers, purchases, POS, invoices, quotations, returns, expenses, reports. NOT: settings, user management. |
| CASHIER | Own company | POS screen, create invoices from POS, record payments, view own recent sales. Nothing else. |

Impersonation: super admin gets a short-lived session flagged `impersonating: true`, banner shown, every action still audited under the real super admin userId.

## 3. Database schema (Prisma)

Conventions: all ids `cuid()`. All money fields `Decimal @db.Decimal(12,2)`. All tenant tables have `companyId` + index. Soft-deletable tables have `deletedAt DateTime?`.

```prisma
enum Role { SUPER_ADMIN ADMIN MANAGER CASHIER }
enum CompanyStatus { ACTIVE SUSPENDED }
enum UserStatus { ACTIVE DISABLED }
enum AdjustReason { PURCHASE SALE RETURN MANUAL DAMAGE OPENING }
enum LedgerType { INVOICE PAYMENT RETURN MANUAL_DEBIT MANUAL_CREDIT OPENING }
enum InvoiceStatus { UNPAID PARTIAL PAID }
enum InvoiceType { POS STANDARD }
enum PaymentMethod { CASH BANK_TRANSFER JAZZCASH EASYPAISA CHEQUE OTHER }
enum QuoteStatus { DRAFT SENT ACCEPTED CONVERTED EXPIRED REJECTED }
enum PoStatus { DRAFT ORDERED RECEIVED }

model Company {
  id                 String   @id @default(cuid())
  name               String
  slug               String   @unique
  logoUrl            String?
  accentColor        String   @default("#111110")
  phone              String?
  email              String?
  address            String?
  invoiceHeaderNote  String?
  invoiceFooterNote  String?
  taxRate            Decimal  @default(0) @db.Decimal(5,2)
  currency           String   @default("PKR")
  lakhCroreFormat    Boolean  @default(true)
  status             CompanyStatus @default(ACTIVE)
  onboardingComplete Boolean  @default(false)
  createdAt          DateTime @default(now())
  // relations: users, products, customers, invoices, ...
}

model User {
  id           String   @id @default(cuid())
  companyId    String?  // null only for SUPER_ADMIN
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  status       UserStatus @default(ACTIVE)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  @@index([companyId])
}

model Category {
  id        String @id @default(cuid())
  companyId String
  name      String
  @@unique([companyId, name])
}

model Product {
  id           String  @id @default(cuid())
  companyId    String
  categoryId   String?
  sku          String
  barcode      String?
  name         String
  description  String?
  unit         String  @default("pcs") // pcs, set, meter, kW
  costPrice    Decimal @db.Decimal(12,2)
  salePrice    Decimal @db.Decimal(12,2)
  stockQty     Int     @default(0)
  reorderLevel Int     @default(5)
  deletedAt    DateTime?
  createdAt    DateTime @default(now())
  @@unique([companyId, sku])
  @@index([companyId, name])
}

model StockAdjustment {
  id        String @id @default(cuid())
  companyId String
  productId String
  userId    String
  qtyChange Int          // signed
  reason    AdjustReason
  note      String?
  refId     String?      // invoiceId / poId / returnId
  createdAt DateTime @default(now())
  @@index([companyId, productId])
}

model Customer {
  id             String  @id @default(cuid())
  companyId      String
  name           String
  phone          String?
  email          String?
  address        String?
  openingBalance Decimal @default(0) @db.Decimal(12,2)
  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  @@index([companyId, name])
}

model LedgerEntry {
  id         String     @id @default(cuid())
  companyId  String
  customerId String
  userId     String
  type       LedgerType
  debit      Decimal    @default(0) @db.Decimal(12,2) // customer owes more
  credit     Decimal    @default(0) @db.Decimal(12,2) // customer paid / owes less
  refId      String?    // invoiceId, paymentId, returnId
  note       String?
  createdAt  DateTime   @default(now())
  @@index([companyId, customerId, createdAt])
}

model Supplier {
  id        String @id @default(cuid())
  companyId String
  name      String
  phone     String?
  address   String?
  deletedAt DateTime?
}

model PurchaseOrder {
  id         String   @id @default(cuid())
  companyId  String
  supplierId String
  poNo       String
  status     PoStatus @default(DRAFT)
  subtotal   Decimal  @db.Decimal(12,2)
  total      Decimal  @db.Decimal(12,2)
  receivedAt DateTime?
  createdBy  String
  createdAt  DateTime @default(now())
  @@unique([companyId, poNo])
}

model PurchaseItem {
  id        String  @id @default(cuid())
  poId      String
  productId String
  qty       Int
  unitCost  Decimal @db.Decimal(12,2)
}

model Invoice {
  id         String        @id @default(cuid())
  companyId  String
  invoiceNo  String        // INV-0001, per-company sequence
  customerId String?       // null = walk-in cash sale
  type       InvoiceType   @default(STANDARD)
  status     InvoiceStatus @default(UNPAID)
  subtotal   Decimal @db.Decimal(12,2)
  discount   Decimal @default(0) @db.Decimal(12,2)
  taxAmount  Decimal @default(0) @db.Decimal(12,2)
  total      Decimal @db.Decimal(12,2)
  paidAmount Decimal @default(0) @db.Decimal(12,2)
  note       String?
  createdBy  String
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  @@unique([companyId, invoiceNo])
  @@index([companyId, createdAt])
}

model InvoiceItem {
  id           String  @id @default(cuid())
  invoiceId    String
  productId    String
  nameSnapshot String  // product name at time of sale
  qty          Int
  unitPrice    Decimal @db.Decimal(12,2)
  lineTotal    Decimal @db.Decimal(12,2)
}

model Payment {
  id         String        @id @default(cuid())
  companyId  String
  invoiceId  String?
  customerId String?       // khata payment not tied to one invoice
  amount     Decimal       @db.Decimal(12,2)
  method     PaymentMethod @default(CASH)
  note       String?
  createdBy  String
  createdAt  DateTime      @default(now())
  @@index([companyId, createdAt])
}

model Quotation {
  id                 String      @id @default(cuid())
  companyId          String
  quoteNo            String      // QUO-0001
  customerId         String?
  customerNameFree   String?     // for non-saved customers
  status             QuoteStatus @default(DRAFT)
  subtotal           Decimal @db.Decimal(12,2)
  discount           Decimal @default(0) @db.Decimal(12,2)
  taxAmount          Decimal @default(0) @db.Decimal(12,2)
  total              Decimal @db.Decimal(12,2)
  validUntil         DateTime?
  convertedInvoiceId String?
  note               String?
  createdBy          String
  createdAt          DateTime @default(now())
  @@unique([companyId, quoteNo])
}

model QuotationItem {
  id           String  @id @default(cuid())
  quotationId  String
  productId    String?
  nameSnapshot String
  qty          Int
  unitPrice    Decimal @db.Decimal(12,2)
  lineTotal    Decimal @db.Decimal(12,2)
}

model Return {
  id        String  @id @default(cuid())
  companyId String
  invoiceId String
  total     Decimal @db.Decimal(12,2)
  restock   Boolean @default(true)
  note      String?
  createdBy String
  createdAt DateTime @default(now())
}

model ReturnItem {
  id        String  @id @default(cuid())
  returnId  String
  productId String
  qty       Int
  unitPrice Decimal @db.Decimal(12,2)
}

model Expense {
  id        String   @id @default(cuid())
  companyId String
  category  String   // Rent, Salaries, Transport, Utilities, Marketing, Other
  amount    Decimal  @db.Decimal(12,2)
  note      String?
  date      DateTime
  createdBy String
  createdAt DateTime @default(now())
  @@index([companyId, date])
}

model AuditLog {
  id        String   @id @default(cuid())
  companyId String?  // null for super-admin global actions
  userId    String
  action    String   // e.g. invoice.delete, stock.adjust, company.suspend, auth.impersonate
  entity    String
  entityId  String?
  meta      Json?
  createdAt DateTime @default(now())
  @@index([companyId, createdAt])
}
```

### Core business rules
- Invoice create (POS or standard) runs in ONE transaction: create invoice + items, decrement stock via StockAdjustment(SALE), write LedgerEntry(INVOICE debit) if customer attached, write Payment + LedgerEntry(PAYMENT credit) for amount paid now, set status from paidAmount vs total.
- Customer balance = openingBalance + sum(debits) − sum(credits). Computed, shown as running balance in ledger view.
- Quotation convert: creates invoice from quote items at current flow, marks quote CONVERTED, links ids. Quote does not touch stock.
- Return: restores stock if `restock`, writes LedgerEntry(RETURN credit) if invoice had a customer, adjusts invoice paid/status logic conservatively (never auto-refund cash; record note).
- PO receive: increments stock via StockAdjustment(PURCHASE), optionally updates product costPrice.

## 4. Page map

### Public
- `/login` — single login for all roles, redirects by role
- `/forgot-password` — token-based reset (v1: super admin / company admin resets manually; page shows contact note)

### Super Admin `/super`
- `/super` — overview: total companies, active/suspended, signups this month, most active companies
- `/super/companies` — table: name, status, users, invoices count, last activity; actions: suspend/activate, reset admin password, login-as
- `/super/companies/new` — create company + its first ADMIN user (name, email, temp password)
- `/super/companies/[id]` — company detail: stats, users list, branding preview, audit trail
- `/super/audit` — global audit log

### Company app (sidebar layout)
- `/onboarding` — first-login wizard for ADMIN: step 1 company name (required), steps 2–4 logo/branding, tax & currency, first product — each skippable
- `/dashboard` — role-aware: ADMIN sees KPls (today sales, month revenue chart, dues outstanding, low stock, recent invoices); MANAGER sees inventory + sales widgets
- `/pos` — CASHIER's home. Product search left, cart right, customer attach, discount, cash/credit toggle, payment, thermal print
- `/inventory` — products table (search, filter by category, low-stock filter, CSV export)
- `/inventory/new`, `/inventory/[id]` — product form + stock history
- `/inventory/categories` — category CRUD
- `/inventory/adjustments` — manual adjustment + history
- `/customers` — table with balance column
- `/customers/[id]` — profile + khata ledger (running balance, add manual entry, receive payment)
- `/suppliers` — list + CRUD
- `/purchases` — PO list; `/purchases/new`, `/purchases/[id]` (receive flow)
- `/invoices` — list with status chips; `/invoices/new`, `/invoices/[id]` (detail, record payment, PDF, WhatsApp share, return)
- `/quotations` — list; `/quotations/new`, `/quotations/[id]` (PDF, WhatsApp share, convert to invoice)
- `/expenses` — list + quick add
- `/reports` — tabs: Sales, Profit, Stock valuation, Customer dues, Top products; date range picker; CSV export
- `/settings` — tabs: Branding (logo, accent, invoice header/footer), Tax & currency, Users (invite/create with role, disable), Data (CSV exports)

Roughly 24 routes. Cmd+K palette available everywhere in the company app (products, customers, invoices, navigation).

## 5. Design system (ElevenLabs-inspired, exact tokens)

Feel: warm-white minimalism, editorial, flat. Cards on soft off-white, hairline borders instead of shadows, pill buttons, generous whitespace.

### Tokens (Tailwind CSS variables)
- `--background: #FDFCFC` (page canvas, warm off-white — never pure white)
- `--surface: #F5F3F1` (secondary surfaces: sidebar, table header rows, muted fills)
- `--card: #FFFFFF` (cards sit slightly brighter than canvas)
- `--border: #EBE8E4` (ALL borders, 1px hairline)
- `--foreground: #111110` (near-black text)
- `--muted-foreground: #6F6B66`
- `--accent: company.accentColor` (runtime, per tenant; default #111110)
- Destructive: #D92D20; Success: #12A150; Warning: #F79009 (status chips only, at 10% bg tint + solid text)
- `--chart-primary: #2563EB` / `--chart-primary-fill: #DBEAFE` (fixed data-visualization blue, independent of the tenant accent color — used for every chart mark on the dashboard and in reports; light fill for hover/highlight states)

### Rules
- Radius: cards & modals 20px; inputs & selects 12px; buttons & chips fully pilled (9999px); table row hover uses surface fill, no radius
- NO drop shadows on cards. Modals/popovers only: subtle shadow allowed. Separation is always the 1px `--border` hairline
- Typography: Inter only. Body 14px/400, labels 13px/500, page titles 22–24px/600 with -0.01em tracking, dashboard greeting 28px/600 ("Good morning, {name}")
- Spacing: page padding 32px, card padding 24px, 16px gaps in forms, dense tables at 44px row height
- Sidebar: 240px fixed, `--surface` background, hairline right border; items are pills on active state with a small accent-colored dot; icon + label; collapses to 64px icon rail; company logo top, user menu bottom
- Buttons: primary = accent bg + white text, pill; secondary = white bg + hairline border; ghost for table actions. Height 36px, 40px for primary page actions
- Tables: no vertical lines, hairline horizontal dividers, `--surface` header row, right-aligned numbers
- Status chips: pill, tinted bg (PAID green, PARTIAL amber, UNPAID red, SUSPENDED gray)
- Empty states: centered icon in a 20px-radius surface square, one line of text, one primary action
- POS screen is the one dense layout: 2-column, product grid cards 12px radius, cart list right with sticky totals footer

## 6. Auth & tenancy flow
- NextAuth credentials → JWT contains `{ userId, role, companyId }`
- Middleware: `/super/*` requires SUPER_ADMIN; company routes require companyId + ACTIVE company (suspended companies see a lock screen); `/pos` allows CASHIER; settings requires ADMIN
- `getTenantContext()` server helper returns `{ companyId, userId, role }` from session; every Prisma query on tenant tables goes through repositories/actions that require it
- Suspended company: users can log in but see only a "Account suspended, contact your provider" screen

## 7. Future-proofing (documented, not built)
- `Product.barcode` exists for future scanner support
- Serial/warranty tracking would add `ProductUnit` table keyed to InvoiceItem
- Multi-branch would add `Branch` table + branchId on stock/invoices
- Billing for tenants would add `Plan`/`Subscription` on Company

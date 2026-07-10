/**
 * pnpm seed:demo — creates ONE demo company ("Sunrise Solar Traders") populated with
 * realistic Pakistani solar-market data so every screen and report has something to show
 * for a sales demo: 28 products across panels/inverters/batteries/cables/mounting/
 * accessories, 12 customers with khata balances, ~60 days of invoices (cash/credit/partial
 * mix), a handful of quotations in different statuses, purchase orders, expenses, and
 * returns.
 *
 * Guarded against double-running: if a company with DEMO_SLUG already exists, this exits
 * without touching anything (see main()).
 *
 * Writes go straight through Prisma rather than the server actions (which require a
 * request-scoped session) — each helper below mirrors the real action's side effects
 * (stock adjustment, ledger entries, payments, audit log) by hand, the same convention
 * already used by tests/helpers/db.ts.
 */
import { PrismaClient, type PaymentMethod, type Product, type Supplier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SLUG = "sunrise-solar-traders";
const DEMO_PASSWORD = "Demo1234!";
const TAX_RATE = 5; // percent — a plausible reduced rate for demo purposes, not a claim about real Pakistani solar-goods tax law

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}
function chance(probability: number): boolean {
  return Math.random() < probability;
}
function dateDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randomInt(9, 19), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA", "CHEQUE"];

interface ProductSeed {
  category: string;
  name: string;
  sku: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  reorderLevel: number;
}

const PRODUCTS: ProductSeed[] = [
  // Solar Panels
  { category: "Solar Panels", name: "Jinko Tiger Neo 550W Mono PERC", sku: "PNL-JK550", unit: "pcs", costPrice: 21000, salePrice: 24500, stockQty: 100, reorderLevel: 15 },
  { category: "Solar Panels", name: "Longi Hi-MO5 545W", sku: "PNL-LG545", unit: "pcs", costPrice: 20800, salePrice: 24200, stockQty: 90, reorderLevel: 15 },
  { category: "Solar Panels", name: "Canadian Solar HiKu6 545W", sku: "PNL-CS545", unit: "pcs", costPrice: 20500, salePrice: 23800, stockQty: 85, reorderLevel: 15 },
  { category: "Solar Panels", name: "JA Solar DeepBlue 545W", sku: "PNL-JA545", unit: "pcs", costPrice: 20200, salePrice: 23500, stockQty: 75, reorderLevel: 15 },
  { category: "Solar Panels", name: "Trina Vertex 550W", sku: "PNL-TR550", unit: "pcs", costPrice: 21200, salePrice: 24800, stockQty: 70, reorderLevel: 15 },
  { category: "Solar Panels", name: "Jinko Tiger Neo 580W", sku: "PNL-JK580", unit: "pcs", costPrice: 22500, salePrice: 26000, stockQty: 55, reorderLevel: 10 },
  { category: "Solar Panels", name: "Longi Hi-MO6 450W", sku: "PNL-LG450", unit: "pcs", costPrice: 17500, salePrice: 20500, stockQty: 60, reorderLevel: 10 },
  // Inverters
  { category: "Inverters", name: "Inverex Nitrox 5.5kW Hybrid", sku: "INV-IX55H", unit: "pcs", costPrice: 145000, salePrice: 168000, stockQty: 22, reorderLevel: 4 },
  { category: "Inverters", name: "Solis 5kW On-Grid", sku: "INV-SL50G", unit: "pcs", costPrice: 95000, salePrice: 112000, stockQty: 26, reorderLevel: 5 },
  { category: "Inverters", name: "Growatt SPF 5000 ES 5kW Hybrid", sku: "INV-GW50H", unit: "pcs", costPrice: 135000, salePrice: 158000, stockQty: 18, reorderLevel: 4 },
  { category: "Inverters", name: "Huawei SUN2000 10kW", sku: "INV-HW100", unit: "pcs", costPrice: 210000, salePrice: 245000, stockQty: 12, reorderLevel: 3 },
  { category: "Inverters", name: "Sungrow SG5.0RT 5kW", sku: "INV-SG50R", unit: "pcs", costPrice: 98000, salePrice: 115000, stockQty: 15, reorderLevel: 3 },
  { category: "Inverters", name: "Fronius Primo 8.2kW", sku: "INV-FR82", unit: "pcs", costPrice: 320000, salePrice: 370000, stockQty: 6, reorderLevel: 2 },
  // Batteries
  { category: "Batteries", name: "Osaka AGM 200Ah 12V", sku: "BAT-OS200", unit: "pcs", costPrice: 32000, salePrice: 38000, stockQty: 45, reorderLevel: 8 },
  { category: "Batteries", name: "AGS Lithium 100Ah 12V", sku: "BAT-AG100L", unit: "pcs", costPrice: 55000, salePrice: 65000, stockQty: 32, reorderLevel: 6 },
  { category: "Batteries", name: "Phoenix Tubular 220Ah", sku: "BAT-PH220", unit: "pcs", costPrice: 42000, salePrice: 49000, stockQty: 36, reorderLevel: 8 },
  { category: "Batteries", name: "Pylontech US3000C 3.5kWh Lithium", sku: "BAT-PY3500L", unit: "pcs", costPrice: 175000, salePrice: 205000, stockQty: 15, reorderLevel: 3 },
  { category: "Batteries", name: "Narada REXC 12V 200Ah Gel", sku: "BAT-NR200G", unit: "pcs", costPrice: 48000, salePrice: 56000, stockQty: 26, reorderLevel: 5 },
  // Cables & Wiring
  { category: "Cables & Wiring", name: "DC Solar Cable 6mm", sku: "CBL-DC6", unit: "meter", costPrice: 85, salePrice: 110, stockQty: 900, reorderLevel: 150 },
  { category: "Cables & Wiring", name: "DC Solar Cable 4mm", sku: "CBL-DC4", unit: "meter", costPrice: 65, salePrice: 85, stockQty: 1000, reorderLevel: 150 },
  { category: "Cables & Wiring", name: "AC Cable 2.5mm", sku: "CBL-AC25", unit: "meter", costPrice: 45, salePrice: 60, stockQty: 800, reorderLevel: 150 },
  { category: "Cables & Wiring", name: "MC4 Connector Pair", sku: "CBL-MC4", unit: "pair", costPrice: 250, salePrice: 350, stockQty: 350, reorderLevel: 60 },
  // Mounting Structures
  { category: "Mounting Structures", name: "GI Mounting Structure (per kW, rooftop)", sku: "MNT-GIKW", unit: "set", costPrice: 8500, salePrice: 11000, stockQty: 70, reorderLevel: 10 },
  { category: "Mounting Structures", name: "L-Foot Mounting Bracket (set of 4)", sku: "MNT-LFOOT", unit: "set", costPrice: 1200, salePrice: 1600, stockQty: 180, reorderLevel: 25 },
  { category: "Mounting Structures", name: "Ballast Mounting Frame (per panel)", sku: "MNT-BALLAST", unit: "pcs", costPrice: 3200, salePrice: 4200, stockQty: 14, reorderLevel: 10 },
  // Accessories
  { category: "Accessories", name: "MPPT Charge Controller 60A", sku: "ACC-MPPT60", unit: "pcs", costPrice: 18000, salePrice: 22000, stockQty: 34, reorderLevel: 6 },
  { category: "Accessories", name: "Junction Box IP68", sku: "ACC-JBOX", unit: "pcs", costPrice: 950, salePrice: 1300, stockQty: 130, reorderLevel: 20 },
  { category: "Accessories", name: "Earthing Kit Complete", sku: "ACC-EARTH", unit: "set", costPrice: 4500, salePrice: 6000, stockQty: 6, reorderLevel: 8 },
];

const SUPPLIERS = [
  { name: "Punjab Solar Distributors", phone: "+92 42 3567 1122", address: "Shahrah-e-Roomi, Lahore" },
  { name: "Karachi Renewable Imports", phone: "+92 21 3456 7890", address: "S.I.T.E. Industrial Area, Karachi" },
  { name: "Islamabad Green Energy Supplies", phone: "+92 51 2345 6789", address: "I-9 Industrial Area, Islamabad" },
  { name: "Faisalabad Battery House", phone: "+92 41 8765 4321", address: "Susan Road, Faisalabad" },
];

const CUSTOMERS = [
  { name: "Muhammad Farooq", phone: "0300-1234567", address: "Model Town, Lahore", openingBalance: 0 },
  { name: "Ahmed Solar Solutions", phone: "0321-2345678", address: "Gulshan-e-Iqbal, Karachi", openingBalance: 85000 },
  { name: "Bilal Traders", phone: "0333-3456789", address: "Jaranwala Road, Faisalabad", openingBalance: 0 },
  { name: "Sana Energy Systems", phone: "0345-4567890", address: "F-10, Islamabad", openingBalance: 42000 },
  { name: "Imran Khan Electricals", phone: "0301-5678901", address: "Nishtar Road, Multan", openingBalance: 0 },
  { name: "Green Power House", phone: "0312-6789012", address: "Committee Chowk, Rawalpindi", openingBalance: 120000 },
  { name: "Ali Hassan", phone: "0322-7890123", address: "University Town, Peshawar", openingBalance: 0 },
  { name: "Noor Solar Depot", phone: "0334-8901234", address: "Kutchery Road, Sialkot", openingBalance: 63500 },
  { name: "Tariq Mahmood", phone: "0302-9012345", address: "Trust Colony, Gujranwala", openingBalance: 0 },
  { name: "Zainab Enterprises", phone: "0346-0123456", address: "Latifabad, Hyderabad", openingBalance: 27000 },
  { name: "Khalid Solar Works", phone: "0335-1234567", address: "Shikarpur Road, Sukkur", openingBalance: 0 },
  { name: "Fatima Traders", phone: "0303-2345678", address: "Airport Road, Quetta", openingBalance: 0 },
];

async function main() {
  const existing = await prisma.company.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    console.log(`Demo company "${existing.name}" (slug: ${DEMO_SLUG}) already exists — skipping to avoid duplicate data.`);
    console.log(`To reseed from scratch, remove it first (e.g. from /super, or drop its rows in a scratch DB), then rerun "pnpm seed:demo".`);
    return;
  }

  console.log("Creating demo company...");
  const company = await prisma.company.create({
    data: {
      name: "Sunrise Solar Traders",
      slug: DEMO_SLUG,
      accentColor: "#0F7B4F",
      taxRate: TAX_RATE,
      currency: "PKR",
      lakhCroreFormat: true,
      status: "ACTIVE",
      onboardingComplete: true,
      phone: "+92 42 3512 3456",
      email: "info@sunrisesolar.pk",
      address: "123 Ferozepur Road, Lahore, Punjab, Pakistan",
      invoiceHeaderNote: "Thank you for choosing Sunrise Solar Traders.",
      invoiceFooterNote: "All products carry manufacturer warranty. Please retain this invoice for warranty claims.",
    },
  });

  console.log("Creating users...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const admin = await prisma.user.create({
    data: { companyId: company.id, name: "Ahmad Raza", email: "admin@demo-solar.pk", passwordHash, role: "ADMIN", status: "ACTIVE" },
  });
  const manager = await prisma.user.create({
    data: { companyId: company.id, name: "Sara Iqbal", email: "manager@demo-solar.pk", passwordHash, role: "MANAGER", status: "ACTIVE" },
  });
  const cashier = await prisma.user.create({
    data: { companyId: company.id, name: "Bilal Ahmed", email: "cashier@demo-solar.pk", passwordHash, role: "CASHIER", status: "ACTIVE" },
  });
  const staff = [admin, manager, cashier];

  console.log("Creating categories and products...");
  const categoryNames = [...new Set(PRODUCTS.map((p) => p.category))];
  const categoryIdByName = new Map<string, string>();
  for (const name of categoryNames) {
    const category = await prisma.category.create({ data: { companyId: company.id, name } });
    categoryIdByName.set(name, category.id);
  }
  const products: Product[] = [];
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        categoryId: categoryIdByName.get(p.category)!,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
      },
    });
    products.push(product);
  }
  // In-memory running stock so invoice generation below never oversells (this script doesn't
  // re-read the DB between writes, unlike the real oversell-checked createInvoice action).
  const stockById = new Map(products.map((p) => [p.id, p.stockQty]));

  console.log("Creating suppliers...");
  const suppliers: Supplier[] = [];
  for (const s of SUPPLIERS) {
    suppliers.push(await prisma.supplier.create({ data: { companyId: company.id, ...s } }));
  }

  console.log("Creating customers...");
  const customers = [];
  for (const c of CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: { companyId: company.id, name: c.name, phone: c.phone, address: c.address, openingBalance: c.openingBalance },
    });
    if (c.openingBalance > 0) {
      await prisma.ledgerEntry.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          userId: admin.id,
          type: "OPENING",
          debit: c.openingBalance,
          credit: 0,
          note: "Opening balance",
        },
      });
    }
    customers.push(customer);
  }

  let invoiceSeq = 1;
  const nextInvoiceNo = () => `INV-${String(invoiceSeq++).padStart(4, "0")}`;

  /** Mirrors createInvoice's real side effects (stock, StockAdjustment, ledger, payment, audit log). */
  async function seedInvoice(opts: {
    createdBy: string;
    customerId: string | null;
    items: { productId: string; unitPrice: number; costPrice: number; qty: number }[];
    paidFraction: number; // 0..1, ignored (forced to 1) for walk-in — matches the real walk-in-must-be-paid-in-full rule
    createdAt: Date;
  }) {
    const subtotal = opts.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const taxAmount = Math.round((subtotal * TAX_RATE) / 100);
    const total = subtotal + taxAmount;
    const paidAmount = opts.customerId ? Math.round(total * opts.paidFraction) : total;
    const status = paidAmount >= total ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";
    const invoiceNo = nextInvoiceNo();

    const invoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        invoiceNo,
        customerId: opts.customerId,
        type: "STANDARD",
        status,
        subtotal,
        discount: 0,
        taxAmount,
        total,
        paidAmount,
        createdBy: opts.createdBy,
        createdAt: opts.createdAt,
        items: {
          create: opts.items.map((i) => ({
            productId: i.productId,
            nameSnapshot: products.find((p) => p.id === i.productId)!.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.qty * i.unitPrice,
            costSnapshot: i.costPrice,
          })),
        },
      },
    });

    for (const item of opts.items) {
      await prisma.product.update({ where: { id: item.productId }, data: { stockQty: { decrement: item.qty } } });
      await prisma.stockAdjustment.create({
        data: {
          companyId: company.id,
          productId: item.productId,
          userId: opts.createdBy,
          qtyChange: -item.qty,
          reason: "SALE",
          refId: invoice.id,
          createdAt: opts.createdAt,
        },
      });
    }

    if (opts.customerId) {
      await prisma.ledgerEntry.create({
        data: {
          companyId: company.id,
          customerId: opts.customerId,
          userId: opts.createdBy,
          type: "INVOICE",
          debit: total,
          credit: 0,
          refId: invoice.id,
          note: `Invoice ${invoiceNo}`,
          createdAt: opts.createdAt,
        },
      });
    }

    if (paidAmount > 0) {
      const payment = await prisma.payment.create({
        data: {
          companyId: company.id,
          invoiceId: invoice.id,
          amount: paidAmount,
          method: pick(PAYMENT_METHODS),
          createdBy: opts.createdBy,
          createdAt: opts.createdAt,
        },
      });
      if (opts.customerId) {
        await prisma.ledgerEntry.create({
          data: {
            companyId: company.id,
            customerId: opts.customerId,
            userId: opts.createdBy,
            type: "PAYMENT",
            debit: 0,
            credit: paidAmount,
            refId: payment.id,
            note: `Payment for ${invoiceNo}`,
            createdAt: opts.createdAt,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: opts.createdBy,
        action: "invoice.create",
        entity: "Invoice",
        entityId: invoice.id,
        meta: { invoiceNo, total: total.toString() },
        createdAt: opts.createdAt,
      },
    });

    return invoice;
  }

  console.log("Creating ~60 days of invoices...");
  const allInvoices: { id: string; total: string; customerId: string | null; status: string; createdAt: Date }[] = [];
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const invoicesToday = chance(0.15) ? 0 : randomInt(1, 4);
    for (let i = 0; i < invoicesToday; i++) {
      const createdAt = dateDaysAgo(dayOffset);
      const lineCount = randomInt(1, 3);
      const cart: { productId: string; unitPrice: number; costPrice: number; qty: number }[] = [];
      const usedProductIds = new Set<string>();
      for (let l = 0; l < lineCount; l++) {
        const candidates = products.filter((p) => !usedProductIds.has(p.id) && (stockById.get(p.id) ?? 0) >= 1);
        if (candidates.length === 0) break;
        const product = pick(candidates);
        const maxQty = Math.min(stockById.get(product.id) ?? 0, product.unit === "meter" ? 50 : 6);
        if (maxQty < 1) continue;
        const qty = randomInt(1, maxQty);
        usedProductIds.add(product.id);
        stockById.set(product.id, (stockById.get(product.id) ?? 0) - qty);
        cart.push({ productId: product.id, unitPrice: Number(product.salePrice), costPrice: Number(product.costPrice), qty });
      }
      if (cart.length === 0) continue;

      const isWalkIn = chance(0.4);
      const customer = isWalkIn ? null : pick(customers);
      const paidFraction = chance(0.55) ? 1 : chance(0.6) ? 0.5 + Math.random() * 0.4 : 0;
      const invoice = await seedInvoice({
        createdBy: pick(staff).id,
        customerId: customer?.id ?? null,
        items: cart,
        paidFraction,
        createdAt,
      });
      allInvoices.push({ id: invoice.id, total: invoice.total.toString(), customerId: invoice.customerId, status: invoice.status, createdAt });
    }
  }
  console.log(`  ${allInvoices.length} invoices created`);

  console.log("Creating quotations...");
  let quoteSeq = 1;
  const nextQuoteNo = () => `QUO-${String(quoteSeq++).padStart(4, "0")}`;

  async function seedQuotation(opts: {
    createdBy: string;
    customerId: string | null;
    customerNameFree: string | null;
    status: "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "REJECTED";
    createdAt: Date;
  }) {
    const lineCount = randomInt(1, 3);
    const items = [];
    let subtotal = 0;
    for (let i = 0; i < lineCount; i++) {
      const product = pick(products);
      const qty = randomInt(1, 4);
      const unitPrice = Number(product.salePrice);
      subtotal += qty * unitPrice;
      items.push({ productId: product.id, nameSnapshot: product.name, qty, unitPrice, lineTotal: qty * unitPrice });
    }
    const taxAmount = Math.round((subtotal * TAX_RATE) / 100);
    const total = subtotal + taxAmount;
    const validUntil = new Date(opts.createdAt);
    validUntil.setDate(validUntil.getDate() + 14);

    const quotation = await prisma.quotation.create({
      data: {
        companyId: company.id,
        quoteNo: nextQuoteNo(),
        customerId: opts.customerId,
        customerNameFree: opts.customerNameFree,
        status: opts.status,
        subtotal,
        discount: 0,
        taxAmount,
        total,
        validUntil,
        createdBy: opts.createdBy,
        createdAt: opts.createdAt,
        items: { create: items },
      },
    });
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: opts.createdBy,
        action: "quotation.create",
        entity: "Quotation",
        entityId: quotation.id,
        meta: { quoteNo: quotation.quoteNo },
        createdAt: opts.createdAt,
      },
    });
    return quotation;
  }

  await seedQuotation({ createdBy: manager.id, customerId: pick(customers).id, customerNameFree: null, status: "DRAFT", createdAt: dateDaysAgo(2) });
  await seedQuotation({ createdBy: manager.id, customerId: null, customerNameFree: "Walk-in Inquiry — DHA Phase 6", status: "SENT", createdAt: dateDaysAgo(5) });
  await seedQuotation({ createdBy: admin.id, customerId: pick(customers).id, customerNameFree: null, status: "SENT", createdAt: dateDaysAgo(9) });
  await seedQuotation({ createdBy: admin.id, customerId: pick(customers).id, customerNameFree: null, status: "ACCEPTED", createdAt: dateDaysAgo(12) });
  await seedQuotation({ createdBy: manager.id, customerId: pick(customers).id, customerNameFree: null, status: "EXPIRED", createdAt: dateDaysAgo(45) });
  await seedQuotation({ createdBy: admin.id, customerId: pick(customers).id, customerNameFree: null, status: "REJECTED", createdAt: dateDaysAgo(30) });

  // One CONVERTED quote, linked to a real invoice — always UNPAID, per the real
  // convert-to-invoice rule (see lib/actions/quotations.ts).
  const convertCustomer = pick(customers);
  const convertedAt = dateDaysAgo(20);
  const conversionSourceProduct = pick(products);
  const convertedQuote = await seedQuotation({
    createdBy: admin.id,
    customerId: convertCustomer.id,
    customerNameFree: null,
    status: "ACCEPTED",
    createdAt: convertedAt,
  });
  if ((stockById.get(conversionSourceProduct.id) ?? 0) >= 2) {
    stockById.set(conversionSourceProduct.id, (stockById.get(conversionSourceProduct.id) ?? 0) - 2);
    const convertedInvoice = await seedInvoice({
      createdBy: admin.id,
      customerId: convertCustomer.id,
      items: [{ productId: conversionSourceProduct.id, unitPrice: Number(conversionSourceProduct.salePrice), costPrice: Number(conversionSourceProduct.costPrice), qty: 2 }],
      paidFraction: 0,
      createdAt: convertedAt,
    });
    await prisma.quotation.update({ where: { id: convertedQuote.id }, data: { status: "CONVERTED", convertedInvoiceId: convertedInvoice.id } });
    allInvoices.push({ id: convertedInvoice.id, total: convertedInvoice.total.toString(), customerId: convertedInvoice.customerId, status: convertedInvoice.status, createdAt: convertedAt });
  }

  console.log("Creating purchase orders...");
  let poSeq = 1;
  const nextPoNo = () => `PO-${String(poSeq++).padStart(4, "0")}`;

  async function seedPurchaseOrder(opts: { status: "DRAFT" | "ORDERED" | "RECEIVED"; createdAt: Date; receive?: boolean }) {
    const supplier = pick(suppliers);
    const lineCount = randomInt(2, 4);
    const items = [];
    let total = 0;
    const usedIds = new Set<string>();
    for (let i = 0; i < lineCount; i++) {
      const candidates = products.filter((p) => !usedIds.has(p.id));
      const product = pick(candidates);
      usedIds.add(product.id);
      const qty = randomInt(5, 20);
      const unitCost = Number(product.costPrice);
      total += qty * unitCost;
      items.push({ productId: product.id, qty, unitCost });
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        companyId: company.id,
        supplierId: supplier.id,
        poNo: nextPoNo(),
        status: opts.status,
        subtotal: total,
        total,
        createdBy: manager.id,
        createdAt: opts.createdAt,
        receivedAt: opts.status === "RECEIVED" ? opts.createdAt : null,
        items: { create: items },
      },
    });
    await prisma.auditLog.create({
      data: { companyId: company.id, userId: manager.id, action: "po.create", entity: "PurchaseOrder", entityId: po.id, meta: { poNo: po.poNo }, createdAt: opts.createdAt },
    });

    if (opts.status === "RECEIVED") {
      for (const item of items) {
        await prisma.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.qty } } });
        stockById.set(item.productId, (stockById.get(item.productId) ?? 0) + item.qty);
        await prisma.stockAdjustment.create({
          data: { companyId: company.id, productId: item.productId, userId: manager.id, qtyChange: item.qty, reason: "PURCHASE", refId: po.id, createdAt: opts.createdAt },
        });
      }
      await prisma.auditLog.create({
        data: { companyId: company.id, userId: manager.id, action: "po.receive", entity: "PurchaseOrder", entityId: po.id, meta: { poNo: po.poNo }, createdAt: opts.createdAt },
      });
    }
    return po;
  }

  await seedPurchaseOrder({ status: "RECEIVED", createdAt: dateDaysAgo(40) });
  await seedPurchaseOrder({ status: "RECEIVED", createdAt: dateDaysAgo(18) });
  await seedPurchaseOrder({ status: "ORDERED", createdAt: dateDaysAgo(4) });
  await seedPurchaseOrder({ status: "DRAFT", createdAt: dateDaysAgo(1) });

  console.log("Creating expenses...");
  const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Transport", "Utilities", "Marketing", "Other"] as const;
  for (let dayOffset = 59; dayOffset >= 0; dayOffset -= randomInt(3, 7)) {
    const category = pick([...EXPENSE_CATEGORIES]);
    const amount = category === "Rent" ? 85000 : category === "Salaries" ? randomInt(150000, 220000) : randomInt(2000, 25000);
    const expense = await prisma.expense.create({
      data: {
        companyId: company.id,
        category,
        amount,
        date: dateDaysAgo(dayOffset),
        createdBy: pick([admin.id, manager.id]),
      },
    });
    await prisma.auditLog.create({
      data: { companyId: company.id, userId: expense.createdBy, action: "expense.create", entity: "Expense", entityId: expense.id, meta: { category, amount: String(amount) }, createdAt: expense.date },
    });
  }

  console.log("Creating a few returns...");
  const returnCandidates = allInvoices.filter((inv) => inv.status !== "UNPAID").slice(0, 30);
  let returnsCreated = 0;
  for (const inv of returnCandidates) {
    if (returnsCreated >= 3) break;
    if (!chance(0.15)) continue;
    const items = await prisma.invoiceItem.findMany({ where: { invoiceId: inv.id } });
    if (items.length === 0) continue;
    const line = pick(items);
    const returnQty = Math.min(line.qty, randomInt(1, line.qty));
    const returnTotal = returnQty * Number(line.unitPrice);
    const returnedAt = new Date(inv.createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000);
    if (returnedAt > new Date()) continue;

    const ret = await prisma.return.create({
      data: {
        companyId: company.id,
        invoiceId: inv.id,
        total: returnTotal,
        restock: true,
        note: "Customer returned unused units",
        createdBy: admin.id,
        createdAt: returnedAt,
        items: { create: [{ productId: line.productId, qty: returnQty, unitPrice: line.unitPrice }] },
      },
    });
    await prisma.product.update({ where: { id: line.productId }, data: { stockQty: { increment: returnQty } } });
    await prisma.stockAdjustment.create({
      data: { companyId: company.id, productId: line.productId, userId: admin.id, qtyChange: returnQty, reason: "RETURN", refId: ret.id, createdAt: returnedAt },
    });
    if (inv.customerId) {
      await prisma.ledgerEntry.create({
        data: { companyId: company.id, customerId: inv.customerId, userId: admin.id, type: "RETURN", debit: 0, credit: returnTotal, refId: ret.id, note: `Return for invoice`, createdAt: returnedAt },
      });
    }
    await prisma.auditLog.create({
      data: { companyId: company.id, userId: admin.id, action: "return.create", entity: "Invoice", entityId: inv.id, meta: { returnId: ret.id, total: String(returnTotal) }, createdAt: returnedAt },
    });
    returnsCreated++;
  }
  console.log(`  ${returnsCreated} returns created`);

  console.log("\nDemo seed complete.");
  console.log(`Company: ${company.name} (${DEMO_SLUG})`);
  console.log(`  ADMIN:   ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`  MANAGER: ${manager.email} / ${DEMO_PASSWORD}`);
  console.log(`  CASHIER: ${cashier.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import * as fs from "fs";
import { test, expect, type Page } from "@playwright/test";
import {
  prisma,
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestCustomer,
  createTestInvoice,
  createTestReturn,
  createTestExpense,
} from "./helpers/db";
import { loginAs } from "./helpers/auth";

/**
 * Hand-computed fixture (also manually verified against the running app before this suite
 * was written):
 *
 * Product: costPrice 1000, salePrice 2000, starting stock 20.
 * Invoice 1 (walk-in, PAID): qty 5 @ 2000 -> subtotal 10000, tax 1000, total 11000.
 * Invoice 2 (customer, UNPAID): qty 3 @ 2000 -> subtotal 6000, tax 600, total 6600.
 * Return against invoice 2: qty 1 @ 2000 -> total 2000, restocked.
 * Expense: Rent 2000.
 * Final stock: 20 - 5 - 3 + 1 = 13.
 *
 * Sales:    invoiceCount 2, revenue 11000 + 6600 = 17600
 * Profit:   revenue (10000 + 6000) - return.total 2000 = 14000
 *           cogs (1000*5 + 1000*3) - (1000*1) = 8000 - 1000 = 7000
 *           expenses 2000
 *           profit 14000 - 7000 - 2000 = 5000
 * Stock valuation: 13 * 1000 = 13000
 * Customer dues: 6600 (debit) - 2000 (credit) = 4600
 * Top products: qty 5 + 3 = 8, revenue (pre-tax lineTotal) 10000 + 6000 = 16000
 */
async function seedFixture() {
  const company = await createTestCompany({ name: "Reports Test Co", taxRate: 10 });
  const admin = await createTestUser(company.id, "ADMIN", "reports-admin");
  const product = await createTestProduct(company.id, {
    name: "Report Test Panel",
    salePrice: 2000,
    stockQty: 20,
    costPrice: 1000,
  });
  const customer = await createTestCustomer(company.id, "Report Customer");

  const invoice1 = await createTestInvoice(company.id, {
    customerId: null,
    createdBy: admin.id,
    items: [{ productId: product.id, qty: 5, unitPrice: 2000, costSnapshot: 1000 }],
    taxAmount: 1000,
    status: "PAID",
  });
  const invoice2 = await createTestInvoice(company.id, {
    customerId: customer.id,
    createdBy: admin.id,
    items: [{ productId: product.id, qty: 3, unitPrice: 2000, costSnapshot: 1000 }],
    taxAmount: 600,
    status: "UNPAID",
    paidAmount: 0,
  });
  // createTestInvoice is a direct-DB shortcut (see helpers/db.ts) that intentionally skips
  // stock decrement, matching returns.spec.ts's convention. Decrement it here explicitly to
  // mirror what a real sale does, since the Stock valuation report is a live snapshot.
  await prisma.product.update({ where: { id: product.id }, data: { stockQty: { decrement: 5 + 3 } } });
  await createTestReturn(company.id, {
    invoiceId: invoice2.id,
    customerId: customer.id,
    createdBy: admin.id,
    restock: true,
    items: [{ productId: product.id, qty: 1, unitPrice: 2000 }],
  });
  await createTestExpense(company.id, { createdBy: admin.id, category: "Rent", amount: 2000, date: new Date() });

  return { company, admin, product, customer, invoice1, invoice2 };
}

/**
 * lib/exportCsv.ts quotes any cell containing a comma/quote/newline (e.g. the Profit tab's
 * "Revenue (pre-tax, net of discount and returns)" label), so a naive split(",") would
 * misparse those rows. This is a minimal RFC-4180-style parser handling quoted fields.
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else if (c === "\r") {
      // ignore
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

async function downloadCsvRows(page: Page): Promise<string[][]> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export csv/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const content = fs.readFileSync(path!, "utf-8");
  return parseCsv(content.trimEnd());
}

test.describe("Reports", () => {
  test("Sales tab: invoice count, revenue, and CSV export match the fixture", async ({ page }) => {
    const { admin } = await seedFixture();
    await loginAs(page, admin.email, admin.password);
    await page.goto("/reports/sales");

    await expect(page.getByText("2", { exact: true })).toBeVisible();
    // recharts keeps an off-screen tooltip node in the DOM with the same text — disambiguate.
    await expect(page.getByText("Rs 17,600.00").first()).toBeVisible();

    const rows = await downloadCsvRows(page);
    expect(rows[0]).toEqual(["Date", "Revenue"]);
    const total = rows.slice(1).reduce((sum, r) => sum + Number(r[1]), 0);
    expect(total).toBe(17600);
  });

  test("Profit tab: revenue, COGS, expenses, and profit match the fixture including returns", async ({ page }) => {
    const { admin } = await seedFixture();
    await loginAs(page, admin.email, admin.password);
    await page.goto("/reports/profit");

    await expect(page.getByText("Rs 14,000.00")).toBeVisible(); // revenue
    await expect(page.getByText("-Rs 7,000.00")).toBeVisible(); // cogs
    await expect(page.getByText("-Rs 2,000.00")).toBeVisible(); // expenses
    await expect(page.getByText("Rs 5,000.00")).toBeVisible(); // profit

    // CSV rows carry the raw (unsigned) figures — the "-" in front of COGS/Expenses on
    // screen is purely a display affordance added by the view component.
    const [, revenueRow, cogsRow, expensesRow, profitRow] = await downloadCsvRows(page);
    expect(revenueRow[0]).toContain("Revenue");
    expect(Number(revenueRow[1])).toBe(14000);
    expect(cogsRow[0]).toContain("COGS");
    expect(Number(cogsRow[1])).toBe(7000);
    expect(expensesRow[0]).toBe("Expenses");
    expect(Number(expensesRow[1])).toBe(2000);
    expect(profitRow[0]).toBe("Profit");
    expect(Number(profitRow[1])).toBe(5000);
  });

  test("Stock valuation tab: current qty x current cost price, and CSV export match", async ({ page }) => {
    const { admin, product } = await seedFixture();
    await loginAs(page, admin.email, admin.password);
    await page.goto("/reports/stock-valuation");

    await expect(page.getByText("13", { exact: true })).toBeVisible();
    await expect(page.getByText("Rs 13,000.00").first()).toBeVisible();

    const rows = await downloadCsvRows(page);
    expect(rows[0]).toEqual(["SKU", "Product", "Qty", "Cost price", "Value"]);
    const row = rows.find((r) => r[0] === product.sku)!;
    expect(row[2]).toBe("13");
    expect(row[3]).toBe("1000");
    expect(row[4]).toBe("13000");
  });

  test("Customer dues tab: outstanding balance, and CSV export match", async ({ page }) => {
    const { admin, customer } = await seedFixture();
    await loginAs(page, admin.email, admin.password);
    await page.goto("/reports/customer-dues");

    await expect(page.getByText("Rs 4,600.00").first()).toBeVisible();

    const rows = await downloadCsvRows(page);
    expect(rows[0]).toEqual(["Customer", "Phone", "Balance"]);
    const row = rows.find((r) => r[0] === customer.name)!;
    expect(row[2]).toBe("4600");
  });

  test("Top products tab: qty and revenue for the range, and CSV export match", async ({ page }) => {
    const { admin, product } = await seedFixture();
    await loginAs(page, admin.email, admin.password);
    await page.goto("/reports/top-products");

    await expect(page.getByText("8", { exact: true })).toBeVisible();
    await expect(page.getByText("Rs 16,000.00")).toBeVisible();

    const rows = await downloadCsvRows(page);
    expect(rows[0]).toEqual(["SKU", "Product", "Qty sold", "Revenue"]);
    const row = rows.find((r) => r[0] === product.sku)!;
    expect(row[2]).toBe("8");
    expect(row[3]).toBe("16000");
  });

  test("tenant isolation: another company's reports never show this fixture's numbers", async ({ page }) => {
    await seedFixture();
    const otherCompany = await createTestCompany({ name: "Reports Isolation Co" });
    const otherAdmin = await createTestUser(otherCompany.id, "ADMIN", "reports-isolation-admin");

    await loginAs(page, otherAdmin.email, otherAdmin.password);

    await page.goto("/reports/sales");
    await expect(page.getByText("Rs 17,600.00")).toHaveCount(0);
    await expect(page.getByText("0", { exact: true })).toBeVisible();

    await page.goto("/reports/profit");
    await expect(page.getByText("Rs 5,000.00")).toHaveCount(0);

    await page.goto("/reports/stock-valuation");
    await expect(page.getByText("Rs 13,000.00")).toHaveCount(0);
    await expect(page.getByText("No products in stock.")).toBeVisible();

    await page.goto("/reports/customer-dues");
    await expect(page.getByText("Rs 4,600.00")).toHaveCount(0);
    await expect(page.getByText("No outstanding balances.")).toBeVisible();

    await page.goto("/reports/top-products");
    await expect(page.getByText("Rs 16,000.00")).toHaveCount(0);
    await expect(page.getByText("No sales in this range.")).toBeVisible();
  });
});

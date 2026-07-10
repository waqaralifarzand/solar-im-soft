import { test, expect } from "@playwright/test";
import {
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestCustomer,
  createTestInvoice,
} from "./helpers/db";
import { loginAs } from "./helpers/auth";

/**
 * Fixture (all "today", so it lands in both the "Today's sales" widget and the current
 * month's revenue chart):
 * - Product: stock 3, reorder-at 5 -> already low stock (1 low-stock item).
 * - Invoice 1: walk-in, PAID, qty 2 @ 2000 -> total 4000.
 * - Invoice 2: customer-attached, UNPAID, qty 1 @ 2000 -> total 2000, books a ledger debit
 *   of 2000 (the customer's full due, since nothing's been paid).
 *
 * Today's sales: 2 invoices, Rs 6,000.00 (4000 + 2000, gross).
 * Customer dues: Rs 2,000.00 (ADMIN only).
 * Low stock items: 1 (ADMIN and MANAGER).
 */
async function seedDashboardFixture() {
  const company = await createTestCompany({ name: "Dashboard Test Co" });
  const admin = await createTestUser(company.id, "ADMIN", "dash-admin");
  const manager = await createTestUser(company.id, "MANAGER", "dash-manager");
  const cashier = await createTestUser(company.id, "CASHIER", "dash-cashier");
  const product = await createTestProduct(company.id, {
    name: "Dashboard Test Panel",
    salePrice: 2000,
    stockQty: 3,
    reorderLevel: 5,
  });
  const customer = await createTestCustomer(company.id, "Dashboard Customer");

  const invoice1 = await createTestInvoice(company.id, {
    customerId: null,
    createdBy: admin.id,
    items: [{ productId: product.id, qty: 2, unitPrice: 2000 }],
    status: "PAID",
  });
  const invoice2 = await createTestInvoice(company.id, {
    customerId: customer.id,
    createdBy: admin.id,
    items: [{ productId: product.id, qty: 1, unitPrice: 2000 }],
    status: "UNPAID",
    paidAmount: 0,
  });

  return { company, admin, manager, cashier, product, customer, invoice1, invoice2 };
}

test.describe("Dashboard", () => {
  test("ADMIN sees the full KPI set with correct values, and the low-stock link filters inventory", async ({ page }) => {
    const { admin, invoice1, invoice2 } = await seedDashboardFixture();
    await loginAs(page, admin.email, admin.password);
    await page.goto("/dashboard");

    await expect(page.locator("h1")).toHaveText(/^Good (morning|afternoon|evening), dash-admin$/i);

    await expect(page.getByText("2 · Rs 6,000.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Rs 2,000.00").first()).toBeVisible();
    await expect(page.getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText("This month's revenue")).toBeVisible();
    await expect(page.getByText("No sales yet this month")).toHaveCount(0);

    await expect(page.getByText(invoice1.invoiceNo)).toBeVisible();
    await expect(page.getByText(invoice2.invoiceNo)).toBeVisible();

    await page.getByRole("link").filter({ hasText: "Low stock items" }).click();
    await page.waitForURL(/\/inventory\?lowStock=true/);
    await expect(page.getByLabel("Low stock only")).toBeChecked();
    await expect(page.getByText("Dashboard Test Panel")).toBeVisible();
  });

  test("MANAGER sees inventory + sales widgets only, no dues total or revenue chart", async ({ page }) => {
    const { manager, invoice1 } = await seedDashboardFixture();
    await loginAs(page, manager.email, manager.password);
    await page.goto("/dashboard");

    await expect(page.getByText("2 · Rs 6,000.00", { exact: true })).toBeVisible();
    await expect(page.getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText(invoice1.invoiceNo)).toBeVisible();

    await expect(page.getByText("Customer dues")).toHaveCount(0);
    await expect(page.getByText("This month's revenue")).toHaveCount(0);
  });

  test("CASHIER is redirected straight to /pos", async ({ page }) => {
    const { cashier } = await seedDashboardFixture();
    await loginAs(page, cashier.email, cashier.password);
    await page.goto("/dashboard");
    await page.waitForURL(/\/pos/);
    expect(page.url()).toContain("/pos");
  });
});

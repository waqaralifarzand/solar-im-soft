import { test, expect } from "@playwright/test";
import { prisma, createTestCompany, createTestUser, createTestProduct, createTestCustomer } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test("standard invoice creation form, list status filter, and search", async ({ page }) => {
  const company = await createTestCompany({ name: "Standard Invoice Co" });
  const admin = await createTestUser(company.id, "ADMIN", "std-admin");
  const productPaid = await createTestProduct(company.id, { name: "Cable Roll 100m", salePrice: 12000, stockQty: 10 });
  const productCredit = await createTestProduct(company.id, { name: "Charge Controller", salePrice: 18000, stockQty: 10 });
  const customer = await createTestCustomer(company.id, "List Test Customer");

  await loginAs(page, admin.email, admin.password);

  // A fully-paid walk-in standard invoice
  await page.goto("/invoices/new");
  await page.getByPlaceholder(/search product name or sku/i).fill(productPaid.name);
  await page.getByText(productPaid.name, { exact: false }).first().click();
  await page.getByRole("button", { name: /create invoice/i }).click();
  await page.waitForURL(/\/invoices\/.+/);
  await expect(page.getByText("PAID", { exact: true })).toBeVisible();
  const paidInvoiceNo = (await page.locator("h1").textContent())!;

  // An unpaid credit standard invoice
  await page.goto("/invoices/new");
  await page.getByLabel("Customer").selectOption({ label: customer.name });
  await page.getByPlaceholder(/search product name or sku/i).fill(productCredit.name);
  await page.getByText(productCredit.name, { exact: false }).first().click();
  await page.getByLabel("Amount paid now").fill("0");
  await page.getByRole("button", { name: /create invoice/i }).click();
  await page.waitForURL(/\/invoices\/.+/);
  await expect(page.getByText("UNPAID", { exact: true })).toBeVisible();
  const unpaidInvoiceNo = (await page.locator("h1").textContent())!;

  // AuditLog rows exist for both invoice creations
  const createLogs = await prisma.auditLog.count({ where: { companyId: company.id, action: "invoice.create" } });
  expect(createLogs).toBe(2);

  // list page: both show up, status chips correct, search + status filter both work
  await page.goto("/invoices");
  await expect(page.getByText(paidInvoiceNo, { exact: true })).toBeVisible();
  await expect(page.getByText(unpaidInvoiceNo, { exact: true })).toBeVisible();

  await page.getByPlaceholder(/search invoice/i).fill(paidInvoiceNo);
  await expect(page.getByText(paidInvoiceNo, { exact: true })).toBeVisible();
  await expect(page.getByText(unpaidInvoiceNo, { exact: true })).toHaveCount(0);
  await page.getByPlaceholder(/search invoice/i).fill("");

  await page.locator("select").selectOption("UNPAID");
  await expect(page.getByText(unpaidInvoiceNo, { exact: true })).toBeVisible();
  await expect(page.getByText(paidInvoiceNo, { exact: true })).toHaveCount(0);

  await page.locator("select").selectOption("");
  await expect(page.getByText(paidInvoiceNo, { exact: true })).toBeVisible();
  await expect(page.getByText(unpaidInvoiceNo, { exact: true })).toBeVisible();
});

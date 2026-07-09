import { test, expect } from "@playwright/test";
import {
  prisma,
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestCustomer,
  getProductStock,
} from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.describe("POS and invoicing core", () => {
  let companyId: string;
  let cashier: { email: string; password: string };
  let admin: { email: string; password: string };

  test.beforeAll(async () => {
    const company = await createTestCompany({ name: "Sales Test Co", taxRate: 10 });
    companyId = company.id;
    cashier = await createTestUser(companyId, "CASHIER", "cashier");
    admin = await createTestUser(companyId, "ADMIN", "admin");
  });

  test("walk-in cash sale: full payment, stock decrement, PAID status", async ({ browser }) => {
    const product = await createTestProduct(companyId, { name: "Solar Panel 400W", salePrice: 25000, stockQty: 10 });

    const cashierPage = await (await browser.newContext()).newPage();
    await loginAs(cashierPage, cashier.email, cashier.password);
    await expect(cashierPage).toHaveURL(/\/pos$/);

    await cashierPage.getByPlaceholder(/search product/i).fill(product.name);
    await cashierPage.getByPlaceholder(/search product/i).press("Enter");
    await expect(cashierPage.getByText("Cart (1)")).toBeVisible();

    // default amount-paid auto-fills to the full total (cash, walk-in) — just submit
    await cashierPage.getByRole("button", { name: /complete sale/i }).click();
    await cashierPage.waitForURL(/\/invoices\/.+/);

    await expect(cashierPage.getByText("PAID", { exact: true })).toBeVisible();
    const invoiceNo = await cashierPage.locator("h1").textContent();
    expect(invoiceNo).toMatch(/^INV-\d{4}$/);

    expect(await getProductStock(product.id)).toBe(9);

    // cross-check against the Phase 3 inventory page, as a different logged-in identity
    const adminPage = await (await browser.newContext()).newPage();
    await loginAs(adminPage, admin.email, admin.password);
    await adminPage.goto("/inventory");
    const row = adminPage.locator("tr", { hasText: product.name });
    await expect(row).toContainText("9");
  });

  test("oversell is rejected server-side and stock is untouched", async ({ page }) => {
    const product = await createTestProduct(companyId, { name: "Inverter 5kW", salePrice: 80000, stockQty: 2 });

    await loginAs(page, cashier.email, cashier.password);
    await page.getByPlaceholder(/search product/i).fill(product.name);
    await page.getByPlaceholder(/search product/i).press("Enter");
    await expect(page.getByText("Cart (1)")).toBeVisible();

    // request more than the 2 in stock
    await page.getByLabel("Qty").fill("5");
    await expect(page.getByText(/only 2 pcs in stock/i)).toBeVisible();

    await page.getByRole("button", { name: /complete sale/i }).click();
    await expect(page.getByText(/not enough stock/i)).toBeVisible();

    // still on /pos, nothing was persisted
    await expect(page).toHaveURL(/\/pos$/);
    expect(await getProductStock(product.id)).toBe(2);
  });

  test("credit sale: UNPAID -> PARTIAL -> PAID with ledger cross-checked at each step", async ({ browser }) => {
    const product = await createTestProduct(companyId, { name: "Battery 200Ah", salePrice: 40000, stockQty: 10 });
    const customer = await createTestCustomer(companyId, "Khata Customer");

    const cashierPage = await (await browser.newContext()).newPage();
    await loginAs(cashierPage, cashier.email, cashier.password);
    await cashierPage.getByPlaceholder(/search product/i).fill(product.name);
    await cashierPage.getByPlaceholder(/search product/i).press("Enter");
    await expect(cashierPage.getByText("Cart (1)")).toBeVisible();

    await cashierPage.getByLabel("Customer").selectOption({ label: customer.name });
    await cashierPage.getByLabel("Amount paid now").fill("0");

    await cashierPage.getByRole("button", { name: /complete sale/i }).click();
    await cashierPage.waitForURL(/\/invoices\/.+/);
    await expect(cashierPage.getByText("UNPAID", { exact: true })).toBeVisible();

    // total = 40000 subtotal + 10% tax = 44000
    const adminPage = await (await browser.newContext()).newPage();
    await loginAs(adminPage, admin.email, admin.password);
    await adminPage.goto(`/customers/${customer.id}`);
    await expect(adminPage.getByText("Rs 44,000.00").first()).toBeVisible();

    // record a partial payment from the invoice detail page
    const invoiceUrl = await getInvoiceUrlForCustomer(customer.id);
    await adminPage.goto(invoiceUrl);
    await adminPage.getByRole("button", { name: /record payment/i }).click();
    await adminPage.getByLabel("Amount").fill("20000");
    await adminPage.getByRole("dialog").getByRole("button", { name: /record payment/i }).click();
    await expect(adminPage.getByText("PARTIAL", { exact: true })).toBeVisible();

    await adminPage.goto(`/customers/${customer.id}`);
    await expect(adminPage.getByText("Rs 24,000.00").first()).toBeVisible();

    // record the remaining balance — the dialog pre-fills the exact remainder
    await adminPage.goto(invoiceUrl);
    await adminPage.getByRole("button", { name: /record payment/i }).click();
    await adminPage.getByRole("dialog").getByRole("button", { name: /record payment/i }).click();
    await expect(adminPage.getByText("PAID", { exact: true })).toBeVisible();

    await adminPage.goto(`/customers/${customer.id}`);
    await expect(adminPage.getByText("Rs 0.00").first()).toBeVisible();
  });
});

async function getInvoiceUrlForCustomer(customerId: string): Promise<string> {
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { customerId } });
  return `/invoices/${invoice.id}`;
}

import { test, expect } from "@playwright/test";
import { prisma, createTestCompany, createTestUser, createTestProduct, createTestCustomer } from "./helpers/db";
import { loginAs } from "./helpers/auth";
import { selectOptionByText } from "./helpers/ui";

test.describe("Quotations", () => {
  let companyId: string;
  let admin: { email: string; password: string };

  test.beforeAll(async () => {
    const company = await createTestCompany({ name: "Quote Test Co", taxRate: 10 });
    companyId = company.id;
    admin = await createTestUser(companyId, "ADMIN", "quote-admin");
  });

  test("full lifecycle: DRAFT -> SENT -> ACCEPTED -> convert, with invoice cross-check; quote never touches stock", async ({
    page,
  }) => {
    const product = await createTestProduct(companyId, { name: "Charge Controller", salePrice: 10000, stockQty: 10 });
    const customer = await createTestCustomer(companyId, "Lifecycle Customer");

    await loginAs(page, admin.email, admin.password);

    await page.goto("/quotations/new");
    await selectOptionByText(page.getByLabel("Saved customer (optional)"), customer.name);
    await page.getByPlaceholder(/search product name or sku/i).fill(product.name);
    await page.getByText(product.name, { exact: false }).first().click();
    await page.locator("table input").first().fill("2"); // qty
    await page.getByRole("button", { name: /create quotation/i }).click();
    await page.waitForURL(/\/quotations\/(?!new$)[a-zA-Z0-9]+$/);

    const quoteNo = (await page.locator("h1").textContent())!;
    expect(quoteNo).toMatch(/^QUO-\d{4}$/);
    await expect(page.getByText("DRAFT", { exact: true }).first()).toBeVisible();

    // quote alone never touches stock
    expect(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }).then((p) => p.stockQty)).toBe(10);

    await page.getByRole("combobox").selectOption("SENT");
    await expect(page.getByText("SENT", { exact: true }).first()).toBeVisible();
    await page.getByRole("combobox").selectOption("ACCEPTED");
    await expect(page.getByText("ACCEPTED", { exact: true }).first()).toBeVisible();

    // still untouched right up to conversion
    expect(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }).then((p) => p.stockQty)).toBe(10);

    await page.getByRole("button", { name: /convert to invoice/i }).click();
    await page.waitForURL(/\/invoices\/.+/);

    const invoiceNo = (await page.locator("h1").textContent())!;
    expect(invoiceNo).toMatch(/^INV-\d{4}$/);
    await expect(page.getByText("UNPAID", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(`Converted from ${quoteNo}`)).toBeVisible();

    // total = 2 * 10000 subtotal + 10% tax = 22000
    await expect(page.getByText("Rs 22,000.00").first()).toBeVisible();

    // stock only decrements once the quote becomes a real invoice
    expect(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }).then((p) => p.stockQty)).toBe(8);

    const quotation = await prisma.quotation.findFirstOrThrow({ where: { companyId, quoteNo } });
    expect(quotation.status).toBe("CONVERTED");
    expect(quotation.convertedInvoiceId).toBeTruthy();

    await page.goto(`/quotations/${quotation.id}`);
    await expect(page.getByText("CONVERTED", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(`Converted to ${invoiceNo}`)).toBeVisible();
    await expect(page.getByRole("button", { name: /convert to invoice/i })).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });

  test("EXPIRED and REJECTED status transitions", async ({ page }) => {
    const product = await createTestProduct(companyId, { name: "Junction Box", salePrice: 3000, stockQty: 10 });

    await loginAs(page, admin.email, admin.password);
    await page.goto("/quotations/new");
    await page.getByPlaceholder(/search product name or sku/i).fill(product.name);
    await page.getByText(product.name, { exact: false }).first().click();
    await page.getByRole("button", { name: /create quotation/i }).click();
    await page.waitForURL(/\/quotations\/(?!new$)[a-zA-Z0-9]+$/);

    await page.getByRole("combobox").selectOption("EXPIRED");
    await expect(page.getByText("EXPIRED", { exact: true }).first()).toBeVisible();

    await page.getByRole("combobox").selectOption("REJECTED");
    await expect(page.getByText("REJECTED", { exact: true }).first()).toBeVisible();
  });

  test("a quote with only a free-text customer name cannot be converted", async ({ page }) => {
    const product = await createTestProduct(companyId, { name: "DC Cable 6mm", salePrice: 500, stockQty: 10 });

    await loginAs(page, admin.email, admin.password);
    await page.goto("/quotations/new");
    await page.getByLabel("Customer name (if not saved above)").fill("Walk-in Prospect");
    await page.getByPlaceholder(/search product name or sku/i).fill(product.name);
    await page.getByText(product.name, { exact: false }).first().click();
    await page.getByRole("button", { name: /create quotation/i }).click();
    await page.waitForURL(/\/quotations\/(?!new$)[a-zA-Z0-9]+$/);

    await expect(page.getByText("Walk-in Prospect")).toBeVisible();
    await expect(page.getByRole("button", { name: /convert to invoice/i })).toHaveCount(0);
    await expect(page.getByText(/attach a saved customer to convert/i)).toBeVisible();
  });

  test("tenant isolation: quotations are scoped per company", async ({ browser }) => {
    const companyB = await createTestCompany({ name: "Quote Test Co B" });
    const adminB = await createTestUser(companyB.id, "ADMIN", "quote-admin-b");
    const productA = await createTestProduct(companyId, { name: "Isolation Panel", salePrice: 9000, stockQty: 5 });

    const pageA = await (await browser.newContext()).newPage();
    await loginAs(pageA, admin.email, admin.password);
    await pageA.goto("/quotations/new");
    await pageA.getByPlaceholder(/search product name or sku/i).fill(productA.name);
    await pageA.getByText(productA.name, { exact: false }).first().click();
    await pageA.getByRole("button", { name: /create quotation/i }).click();
    await pageA.waitForURL(/\/quotations\/(?!new$)[a-zA-Z0-9]+$/);
    const quoteAUrl = pageA.url();
    const quoteANo = (await pageA.locator("h1").textContent())!;

    const pageB = await (await browser.newContext()).newPage();
    await loginAs(pageB, adminB.email, adminB.password);
    await pageB.goto("/quotations");
    await expect(pageB.getByText(quoteANo, { exact: true })).toHaveCount(0);

    const response = await pageB.goto(quoteAUrl);
    expect(response?.status()).toBe(404);
  });
});

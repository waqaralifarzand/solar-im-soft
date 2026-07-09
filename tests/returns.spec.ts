import { test, expect } from "@playwright/test";
import {
  prisma,
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestCustomer,
  createTestInvoice,
  getProductStock,
} from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.describe("Returns", () => {
  let companyId: string;
  let admin: { email: string; password: string; id: string };

  test.beforeAll(async () => {
    const company = await createTestCompany({ name: "Return Test Co" });
    companyId = company.id;
    admin = await createTestUser(companyId, "ADMIN", "return-admin");
  });

  test("partial return restocks and credits the customer; over-return is rejected", async ({ page }) => {
    const product = await createTestProduct(companyId, { name: "Battery 100Ah", salePrice: 20000, stockQty: 5 });
    const customer = await createTestCustomer(companyId, "Return Customer");
    const invoice = await createTestInvoice(companyId, {
      customerId: customer.id,
      createdBy: admin.id,
      items: [{ productId: product.id, qty: 4, unitPrice: 20000 }],
    });

    await loginAs(page, admin.email, admin.password);
    await page.goto(`/customers/${customer.id}`);
    await expect(page.getByText("Rs 80,000.00").first()).toBeVisible(); // 4 * 20000

    await page.goto(`/invoices/${invoice.id}`);
    await page.getByRole("button", { name: /return items/i }).click();
    await expect(page.getByText(/sold 4, returned 0, up to 4 left/i)).toBeVisible();
    await page.getByPlaceholder("0").fill("2");
    await page.getByRole("button", { name: /record return/i }).click();
    await expect(page.getByText("Returned 2", { exact: true })).toBeVisible();

    expect(await getProductStock(product.id)).toBe(7); // 5 + 2 restocked

    await page.goto(`/customers/${customer.id}`);
    await expect(page.getByText("Rs 40,000.00").first()).toBeVisible(); // 80000 - 2*20000 credit

    // only 2 of the original 4 remain returnable
    await page.goto(`/invoices/${invoice.id}`);
    await page.getByRole("button", { name: /return items/i }).click();
    await expect(page.getByText(/sold 4, returned 2, up to 2 left/i)).toBeVisible();
    await page.getByPlaceholder("0").fill("3");
    await page.getByRole("button", { name: /record return/i }).click();
    await expect(page.getByText(/cannot return more than 2/i)).toBeVisible();

    // rejected attempt changed nothing
    expect(await getProductStock(product.id)).toBe(7);
    const ledgerCount = await prisma.ledgerEntry.count({ where: { customerId: customer.id, type: "RETURN" } });
    expect(ledgerCount).toBe(1);

    // never touches invoice status/paidAmount — conservative accounting
    const refreshedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(refreshedInvoice.status).toBe("PAID");
    expect(refreshedInvoice.paidAmount.toString()).toBe(invoice.total.toString());
  });

  test("return on a walk-in invoice restocks but writes no ledger entry", async ({ page }) => {
    const product = await createTestProduct(companyId, { name: "Cable Ties Pack", salePrice: 500, stockQty: 10 });
    const invoice = await createTestInvoice(companyId, {
      customerId: null,
      createdBy: admin.id,
      items: [{ productId: product.id, qty: 3, unitPrice: 500 }],
    });

    await loginAs(page, admin.email, admin.password);
    await page.goto(`/invoices/${invoice.id}`);
    await page.getByRole("button", { name: /return items/i }).click();
    await page.getByPlaceholder("0").fill("1");
    await page.getByRole("button", { name: /record return/i }).click();
    await expect(page.getByText("Returned 1", { exact: true })).toBeVisible();

    expect(await getProductStock(product.id)).toBe(11); // 10 + 1

    // Scoped to this specific return (not the whole company) since other tests in this
    // file share companyId and may have their own RETURN ledger entries.
    const returnRow = await prisma.return.findFirstOrThrow({ where: { invoiceId: invoice.id } });
    expect(returnRow.restock).toBe(true);
    const ledgerCount = await prisma.ledgerEntry.count({ where: { refId: returnRow.id } });
    expect(ledgerCount).toBe(0);
  });

  test("tenant isolation: a return can't be recorded against another company's invoice", async ({ browser }) => {
    const companyB = await createTestCompany({ name: "Return Test Co B" });
    const adminB = await createTestUser(companyB.id, "ADMIN", "return-admin-b");
    const product = await createTestProduct(companyId, { name: "Isolation Battery", salePrice: 15000, stockQty: 10 });
    const invoice = await createTestInvoice(companyId, {
      customerId: null,
      createdBy: admin.id,
      items: [{ productId: product.id, qty: 2, unitPrice: 15000 }],
    });

    const pageB = await (await browser.newContext()).newPage();
    await loginAs(pageB, adminB.email, adminB.password);
    const response = await pageB.goto(`/invoices/${invoice.id}`);
    expect(response?.status()).toBe(404);

    // no return dialog is reachable, and nothing changed on company A's data
    expect(await getProductStock(product.id)).toBe(10);
  });
});

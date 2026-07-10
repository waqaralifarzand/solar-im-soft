import { test, expect } from "@playwright/test";
import {
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestCustomer,
  createTestInvoice,
} from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.describe("Command palette", () => {
  test("Ctrl+K searches products, customers, and invoices, and navigates to each", async ({ page }) => {
    const company = await createTestCompany({ name: "Palette Test Co" });
    const admin = await createTestUser(company.id, "ADMIN", "palette-admin");
    const product = await createTestProduct(company.id, { name: "Palette Search Panel", salePrice: 5000, stockQty: 10 });
    const customer = await createTestCustomer(company.id, "Palette Search Customer");
    const invoice = await createTestInvoice(company.id, {
      customerId: customer.id,
      createdBy: admin.id,
      items: [{ productId: product.id, qty: 1, unitPrice: 5000 }],
    });

    await loginAs(page, admin.email, admin.password);
    await page.goto("/dashboard");

    // Scoped to the dialog throughout: the dashboard's own "Recent invoices" card can show
    // this same customer's name/invoice number behind the overlay, so an unscoped getByText
    // would ambiguously (or wrongly) match page content hidden under the dialog.
    const dialog = page.getByRole("dialog");

    // products
    await page.keyboard.press("Control+k");
    const input = page.getByPlaceholder(/search products, customers, invoices/i);
    await expect(input).toBeVisible();
    await input.fill("Palette Search Panel");
    await expect(dialog.getByText("Products", { exact: true })).toBeVisible();
    await dialog.getByText(product.name).click();
    await page.waitForURL(new RegExp(`/inventory/${product.id}`));

    // customers
    await page.goto("/dashboard");
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/search products, customers, invoices/i).fill("Palette Search Customer");
    await expect(dialog.getByText("Customers", { exact: true })).toBeVisible();
    await dialog.getByText(customer.name, { exact: true }).click();
    await page.waitForURL(new RegExp(`/customers/${customer.id}`));

    // invoices
    await page.goto("/dashboard");
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/search products, customers, invoices/i).fill(invoice.invoiceNo);
    await expect(dialog.getByText("Invoices", { exact: true })).toBeVisible();
    await dialog.getByText(invoice.invoiceNo, { exact: true }).click();
    await page.waitForURL(new RegExp(`/invoices/${invoice.id}`));

    // navigation (no query needed, just matches nav item labels)
    await page.keyboard.press("Control+k");
    await expect(dialog.getByText("Navigate", { exact: true })).toBeVisible();
    await page.getByPlaceholder(/search products, customers, invoices/i).fill("Reports");
    await dialog.getByRole("button", { name: "Reports" }).click();
    await page.waitForURL(/\/reports/);
  });

  test("tenant isolation: search never returns another company's records", async ({ page }) => {
    const companyA = await createTestCompany({ name: "Palette Iso Co A" });
    await createTestUser(companyA.id, "ADMIN", "palette-iso-a");
    const productA = await createTestProduct(companyA.id, { name: "Isolation Only Panel", salePrice: 3000, stockQty: 5 });

    const companyB = await createTestCompany({ name: "Palette Iso Co B" });
    const adminB = await createTestUser(companyB.id, "ADMIN", "palette-iso-b");

    await loginAs(page, adminB.email, adminB.password);
    await page.goto("/dashboard");
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/search products, customers, invoices/i).fill(productA.name);
    await expect(page.getByText("No matches.")).toBeVisible();
    await expect(page.getByText(productA.name)).toHaveCount(0);
  });
});

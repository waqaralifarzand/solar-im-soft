import { test, expect } from "@playwright/test";
import { prisma, createTestCompany, createTestUser, createTestProduct } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test("invoices, products, and invoice numbering are isolated per company", async ({ browser }) => {
  const companyA = await createTestCompany({ name: "Tenant A" });
  const companyB = await createTestCompany({ name: "Tenant B" });
  const adminA = await createTestUser(companyA.id, "ADMIN", "tenant-a-admin");
  const adminB = await createTestUser(companyB.id, "ADMIN", "tenant-b-admin");
  const productA = await createTestProduct(companyA.id, { name: "Tenant A Only Panel", salePrice: 15000, stockQty: 20 });
  const productB = await createTestProduct(companyB.id, { name: "Tenant B Only Panel", salePrice: 15000, stockQty: 20 });

  {
    const pageA = await (await browser.newContext()).newPage();
    await loginAs(pageA, adminA.email, adminA.password);
    await pageA.goto("/pos");
    await pageA.getByPlaceholder(/search product/i).fill(productA.name);
    await pageA.getByPlaceholder(/search product/i).press("Enter");
    await pageA.getByRole("button", { name: /complete sale/i }).click();
    await pageA.waitForURL(/\/invoices\/.+/);
    const invoiceAUrl = pageA.url();
    const invoiceANo = await pageA.locator("h1").textContent();
    expect(invoiceANo).toBe("INV-0001");

    // company B's product picker must never see company A's product
    const pageB = await (await browser.newContext()).newPage();
    await loginAs(pageB, adminB.email, adminB.password);
    await pageB.goto("/pos");
    await pageB.getByPlaceholder(/search product/i).fill("Tenant A Only Panel");
    await expect(pageB.getByText("No matching products")).toBeVisible();

    // company B's invoice list must never show company A's invoice
    await pageB.goto("/invoices");
    await expect(pageB.getByText("INV-0001")).toHaveCount(0);

    // direct URL access to company A's invoice from company B's session -> not found, not a leak
    const response = await pageB.goto(invoiceAUrl);
    expect(response?.status()).toBe(404);
    await expect(pageB.getByText(/this page could not be found/i)).toBeVisible();

    // company B gets its own independent INV-0001 — the per-company sequence isn't shared
    await pageB.goto("/pos");
    await pageB.getByPlaceholder(/search product/i).fill(productB.name);
    await pageB.getByPlaceholder(/search product/i).press("Enter");
    await pageB.getByRole("button", { name: /complete sale/i }).click();
    await pageB.waitForURL(/\/invoices\/.+/);
    const invoiceBNo = await pageB.locator("h1").textContent();
    expect(invoiceBNo).toBe("INV-0001");
  }
});

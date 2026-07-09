import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { prisma, createTestCompany, createTestUser, createTestProduct, createTestCustomer } from "./helpers/db";
import { loginAs } from "./helpers/auth";

const TEST_LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test("PDF renders for a walk-in invoice, a customer invoice, and a no-logo company; branding differs per company", async ({
  browser,
}) => {
  const noLogoCompany = await createTestCompany({ name: "PDF NoLogo Co", taxRate: 5 });
  const logoCompany = await createTestCompany({ name: "PDF Logo Co", taxRate: 5 });
  await prisma.company.update({
    where: { id: logoCompany.id },
    data: { logoUrl: TEST_LOGO, accentColor: "#12A150" },
  });

  const noLogoAdmin = await createTestUser(noLogoCompany.id, "ADMIN", "nologo-admin");
  const logoAdmin = await createTestUser(logoCompany.id, "ADMIN", "logo-admin");
  const productA = await createTestProduct(noLogoCompany.id, { name: "Panel A", salePrice: 25000, stockQty: 10 });
  const productB = await createTestProduct(logoCompany.id, { name: "Panel B", salePrice: 25000, stockQty: 10 });
  const customer = await createTestCustomer(logoCompany.id, "Branding Customer");

  // Walk-in sale, no-logo company
  const page1 = await (await browser.newContext()).newPage();
  await loginAs(page1, noLogoAdmin.email, noLogoAdmin.password);
  await page1.goto("/pos");
  await page1.getByPlaceholder(/search product/i).fill(productA.name);
  await page1.getByPlaceholder(/search product/i).press("Enter");
  await page1.getByRole("button", { name: /complete sale/i }).click();
  await expect(page1.getByText(/sale complete/i)).toBeVisible();
  await page1.getByRole("button", { name: /view invoice/i }).click();
  await page1.waitForURL(/\/invoices\/.+/);

  const [download1] = await Promise.all([
    page1.waitForEvent("download"),
    page1.getByRole("button", { name: /download pdf/i }).click(),
  ]);
  const noLogoBytes = fs.readFileSync(await download1.path());
  expect(noLogoBytes.subarray(0, 4).toString()).toBe("%PDF");

  // Customer sale, logo + accent company
  const page2 = await (await browser.newContext()).newPage();
  await loginAs(page2, logoAdmin.email, logoAdmin.password);
  await page2.goto("/pos");
  await page2.getByPlaceholder(/search product/i).fill(productB.name);
  await page2.getByPlaceholder(/search product/i).press("Enter");
  const customerOptionValue = await page2
    .locator("#posCustomer option", { hasText: customer.name })
    .getAttribute("value");
  await page2.getByLabel("Customer").selectOption(customerOptionValue!);
  await page2.getByRole("button", { name: /complete sale/i }).click();
  await expect(page2.getByText(/sale complete/i)).toBeVisible();
  await page2.getByRole("button", { name: /view invoice/i }).click();
  await page2.waitForURL(/\/invoices\/.+/);
  await expect(page2.getByText(customer.name).first()).toBeVisible();

  const [download2] = await Promise.all([
    page2.waitForEvent("download"),
    page2.getByRole("button", { name: /download pdf/i }).click(),
  ]);
  const logoBytes = fs.readFileSync(await download2.path());
  expect(logoBytes.subarray(0, 4).toString()).toBe("%PDF");

  // The logo/accent company embeds a real image, so its PDF is measurably bigger — a
  // structural signal that branding actually differs between the two rendered documents.
  expect(logoBytes.length).toBeGreaterThan(noLogoBytes.length);
});

test("WhatsApp share serves the right invoice through a signed public link; tampered and bogus tokens 404; receipt renders", async ({
  browser,
}) => {
  const company = await createTestCompany({ name: "Share Test Co" });
  const admin = await createTestUser(company.id, "ADMIN", "share-admin");
  const product = await createTestProduct(company.id, { name: "Battery Pack", salePrice: 30000, stockQty: 10 });
  const customer = await createTestCustomer(company.id, "Share Customer");
  await prisma.customer.update({ where: { id: customer.id }, data: { phone: "0300-5551234" } });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await loginAs(page, admin.email, admin.password);
  await page.goto("/pos");
  await page.getByPlaceholder(/search product/i).fill(product.name);
  await page.getByPlaceholder(/search product/i).press("Enter");
  const customerOptionValue = await page
    .locator("#posCustomer option", { hasText: customer.name })
    .getAttribute("value");
  await page.getByLabel("Customer").selectOption(customerOptionValue!);
  await page.getByRole("button", { name: /complete sale/i }).click();
  await expect(page.getByText(/sale complete/i)).toBeVisible();

  // Receipt print view: the printable node is attached (off-screen) and holds the right data.
  const receipt = page.getByTestId("thermal-receipt");
  await expect(receipt).toContainText(product.name);
  await expect(receipt).toContainText(company.name);
  await page.getByRole("button", { name: /print receipt/i }).click();
  await page.waitForTimeout(300);
  expect(pageErrors).toEqual([]);

  await page.getByRole("button", { name: /view invoice/i }).click();
  await page.waitForURL(/\/invoices\/.+/);
  const invoiceNo = (await page.locator("h1").textContent())!;

  let capturedWaUrl: string | null = null;
  await ctx.route("https://wa.me/**", async (route) => {
    capturedWaUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
  });
  const [waPage] = await Promise.all([
    ctx.waitForEvent("page"),
    page.getByRole("button", { name: /share on whatsapp/i }).click(),
  ]);
  await waPage.waitForLoadState("domcontentloaded").catch(() => {});

  expect(capturedWaUrl).toBeTruthy();
  expect(capturedWaUrl).toContain("wa.me/03005551234"); // customer's phone, digits only
  const decoded = decodeURIComponent(capturedWaUrl!.split("?text=")[1]);
  expect(decoded).toContain(invoiceNo);
  const publicUrl = decoded.split("\n").find((line) => line.startsWith("http"))!;

  // Public route: no auth cookies at all, must still serve the correct invoice's PDF.
  const anonCtx = await browser.newContext();
  const okResp = await anonCtx.request.get(publicUrl);
  expect(okResp.status()).toBe(200);
  expect(okResp.headers()["content-type"]).toBe("application/pdf");
  expect(okResp.headers()["content-disposition"]).toContain(invoiceNo);
  const okBody = await okResp.body();
  expect(okBody.subarray(0, 4).toString()).toBe("%PDF");

  // A tampered signature must 404, never 200 or 500.
  const tamperedUrl = publicUrl.replace(/(\/invoices\/)([^/]+)(\/pdf)/, (_m, pre, token, post) => {
    const flipped = token.slice(0, -1) + (token.slice(-1) === "A" ? "B" : "A");
    return `${pre}${flipped}${post}`;
  });
  expect(tamperedUrl).not.toBe(publicUrl);
  const tamperedResp = await anonCtx.request.get(tamperedUrl);
  expect(tamperedResp.status()).toBe(404);

  // A token for an invoice that doesn't exist must also 404, not enumerate.
  const bogusUrl = publicUrl.replace(/invoices\/[^/]+\/pdf/, "invoices/not-a-real-token/pdf");
  const bogusResp = await anonCtx.request.get(bogusUrl);
  expect(bogusResp.status()).toBe(404);

  const shareLogs = await prisma.auditLog.count({
    where: { companyId: company.id, action: "invoice.share_link_generate" },
  });
  expect(shareLogs).toBe(1);
});

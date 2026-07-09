import { test, expect, type Page, type Browser } from "@playwright/test";

test.setTimeout(180_000);

const RUN_ID = Date.now().toString(36);

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector("#email", { state: "visible", timeout: 15_000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}

async function setupCompany(browser: Browser, superPage: Page, label: string) {
  const companyName = `${label}-${RUN_ID}`;
  const slug = companyName.toLowerCase().replace(/\s/g, "-");
  const adminEmail = `admin@${slug}.test`;

  await superPage.goto("/super/companies/new");
  await superPage.waitForSelector("#companyName", { timeout: 10_000 });
  await superPage.fill("#companyName", companyName);
  await superPage.fill("#adminName", `Admin ${label}`);
  await superPage.fill("#adminEmail", adminEmail);
  await superPage.click('button[type="submit"]');
  await superPage.waitForSelector('[role="dialog"]', { timeout: 30_000 });
  const tempPassword = (await superPage.locator('[role="dialog"] code').textContent())?.trim() ?? "";

  const closeBtn = superPage.locator('[role="dialog"] button').first();
  await closeBtn.click();
  await superPage.waitForTimeout(500);

  const ctx = await browser.newContext();
  const adminPage = await ctx.newPage();
  await login(adminPage, adminEmail, tempPassword);

  // Navigate directly to /onboarding to avoid race with redirect chain
  await adminPage.goto("/onboarding");
  await adminPage.waitForLoadState("networkidle");

  if (adminPage.url().includes("/onboarding")) {
    await adminPage.fill("#onboardingCompanyName", companyName);
    await adminPage.click('button:has-text("Continue")');
    await adminPage.locator('h2:has-text("Make it yours")').waitFor({ timeout: 15_000 });

    await adminPage.click('button:has-text("Skip")');
    await adminPage.locator('h2:has-text("Tax")').waitFor({ timeout: 15_000 });

    await adminPage.click('button:has-text("Skip")');
    await adminPage.locator('h2:has-text("Invoice notes")').waitFor({ timeout: 15_000 });

    await adminPage.click('button:has-text("Skip")');
    await adminPage.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }
  await adminPage.close();
  await ctx.close();

  return { email: adminEmail, password: tempPassword };
}

test.describe("Phase 4 — Customers, khata, suppliers", () => {
  let companyACreds: { email: string; password: string };
  let companyBCreds: { email: string; password: string };

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "super@test.local", "SuperTest1234!");
    companyACreds = await setupCompany(browser, page, "KhataA");
    companyBCreds = await setupCompany(browser, page, "KhataB");
    await page.close();
    await ctx.close();
  });

  test("customer CRUD with opening balance and ledger entry", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers/new");
    await page.waitForSelector("#customerName", { timeout: 10_000 });
    await page.fill("#customerName", "Ali Khan");
    await page.fill("#customerPhone", "03001234567");
    await page.fill("#customerOpeningBalance", "5000");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customers\/.+/, { timeout: 15_000 });
    await expect(page.locator("h1")).toHaveText("Ali Khan");

    const balanceText = await page.locator("text=Balance:").textContent();
    expect(balanceText).toContain("5,000");

    const ledgerTable = page.locator("table").last();
    await expect(ledgerTable).toContainText("Opening balance");

    await page.goto("/customers");
    await expect(page.locator("table tbody")).toContainText("Ali Khan");
    await expect(page.locator("table tbody")).toContainText("5,000");

    await page.close();
    await ctx.close();
  });

  test("manual debit increases balance", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers");
    await page.click('a:has-text("Ali Khan")');
    await page.waitForURL(/\/customers\/.+/);

    await page.click('button:has-text("Add entry")');
    await page.waitForSelector('[role="dialog"]');

    await page.selectOption("#entryType", "MANUAL_DEBIT");
    await page.fill("#entryAmount", "2000");
    await page.fill("#entryNote", "Parts purchased on credit");
    await page.click('[role="dialog"] button[type="submit"]');

    await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    await page.waitForTimeout(1000);

    const balanceText = await page.locator("text=Balance:").textContent();
    expect(balanceText).toContain("7,000");

    const ledgerTable = page.locator("table").last();
    await expect(ledgerTable).toContainText("Manual debit");
    await expect(ledgerTable).toContainText("Parts purchased on credit");

    await page.close();
    await ctx.close();
  });

  test("receive payment reduces balance", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers");
    await page.click('a:has-text("Ali Khan")');
    await page.waitForURL(/\/customers\/.+/);

    await page.click('button:has-text("Receive payment")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill("#payAmount", "3000");
    await page.selectOption("#payMethod", "CASH");
    await page.fill("#payNote", "Partial payment received");
    await page.click('[role="dialog"] button[type="submit"]');

    await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    await page.waitForTimeout(1000);

    const balanceText = await page.locator("text=Balance:").textContent();
    expect(balanceText).toContain("4,000");

    await page.close();
    await ctx.close();
  });

  test("running balance math: opening 5000 + debit 2000 - payment 3000 = 4000", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers");
    await page.click('a:has-text("Ali Khan")');
    await page.waitForURL(/\/customers\/.+/);

    const ledgerTable = page.locator("table").last();
    const rows = ledgerTable.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(4);

    const balanceCells: string[] = [];
    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator("td");
      const balanceCell = await cells.nth(5).textContent();
      if (balanceCell) balanceCells.push(balanceCell.trim());
    }

    expect(balanceCells[0]).toContain("5,000");
    expect(balanceCells[1]).toContain("5,000");
    expect(balanceCells[2]).toContain("7,000");
    expect(balanceCells[3]).toContain("4,000");

    await page.close();
    await ctx.close();
  });

  test("soft delete hides customer from list", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers/new");
    await page.waitForSelector("#customerName");
    await page.fill("#customerName", "To Delete");
    await page.fill("#customerOpeningBalance", "0");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/customers\/.+/);

    await page.goto("/customers");
    await expect(page.locator("table")).toContainText("To Delete");

    page.once("dialog", (d) => d.accept());
    const deleteRow = page.locator("tr", { hasText: "To Delete" });
    await deleteRow.locator('button[title="Delete"]').click();
    await page.waitForTimeout(2000);
    await expect(page.locator("table")).not.toContainText("To Delete");

    await page.close();
    await ctx.close();
  });

  test("tenant isolation: Company B cannot see Company A customers", async ({ browser }) => {
    const ctx = await browser.newContext();
    const pageB = await ctx.newPage();
    await login(pageB, companyBCreds.email, companyBCreds.password);

    await pageB.goto("/customers");
    await pageB.waitForTimeout(1000);
    await expect(pageB.locator("body")).not.toContainText("Ali Khan");

    await pageB.close();
    await ctx.close();
  });

  test("supplier CRUD", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/suppliers/new");
    await page.waitForSelector("#supplierName");
    await page.fill("#supplierName", "Pakistan Solar Panels");
    await page.fill("#supplierPhone", "042-1234567");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/suppliers/, { timeout: 10_000 });
    await expect(page.locator("table")).toContainText("Pakistan Solar Panels");

    await page.click('a:has-text("Pakistan Solar Panels")');
    await page.waitForURL(/\/suppliers\/.+/);
    await page.fill("#supplierName", "Pakistan Solar Panels Ltd");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === "/suppliers", { timeout: 10_000 });
    await expect(page.locator("table")).toContainText("Pakistan Solar Panels Ltd");

    page.once("dialog", (d) => d.accept());
    const row = page.locator("tr", { hasText: "Pakistan Solar Panels Ltd" });
    await row.locator('button[title="Delete"]').click();
    await page.waitForTimeout(2000);
    await expect(page.locator("table")).not.toContainText("Pakistan Solar Panels Ltd");

    await page.close();
    await ctx.close();
  });

  test("tenant isolation for suppliers", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const page = await ctx1.newPage();
    await login(page, companyACreds.email, companyACreds.password);
    await page.goto("/suppliers/new");
    await page.waitForSelector("#supplierName");
    await page.fill("#supplierName", "IsoTestSupplier");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/suppliers/, { timeout: 10_000 });
    await page.close();
    await ctx1.close();

    const ctx2 = await browser.newContext();
    const pageB = await ctx2.newPage();
    await login(pageB, companyBCreds.email, companyBCreds.password);
    await pageB.goto("/suppliers");
    await pageB.waitForTimeout(1000);
    await expect(pageB.locator("body")).not.toContainText("IsoTestSupplier");
    await pageB.close();
    await ctx2.close();
  });

  test("balance column is sortable", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers/new");
    await page.waitForSelector("#customerName");
    await page.fill("#customerName", "Zero Balance");
    await page.fill("#customerOpeningBalance", "0");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/customers\/.+/);

    await page.goto("/customers");
    const balanceHeader = page.locator("th button", { hasText: "Balance" });
    await balanceHeader.click();
    await page.waitForTimeout(500);

    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThanOrEqual(2);

    await balanceHeader.click();
    await page.waitForTimeout(500);
    expect(await rows.count()).toBeGreaterThanOrEqual(2);

    await page.close();
    await ctx.close();
  });

  test("manual credit reduces balance", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers");
    await page.click('a:has-text("Ali Khan")');
    await page.waitForURL(/\/customers\/.+/);

    await page.click('button:has-text("Add entry")');
    await page.waitForSelector('[role="dialog"]');

    await page.selectOption("#entryType", "MANUAL_CREDIT");
    await page.fill("#entryAmount", "1000");
    await page.fill("#entryNote", "Discount given");
    await page.click('[role="dialog"] button[type="submit"]');

    await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    await page.waitForTimeout(1000);

    const balanceText = await page.locator("text=Balance:").textContent();
    expect(balanceText).toContain("3,000");

    await page.close();
    await ctx.close();
  });

  test("payment via JazzCash", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, companyACreds.email, companyACreds.password);

    await page.goto("/customers");
    await page.click('a:has-text("Ali Khan")');
    await page.waitForURL(/\/customers\/.+/);

    await page.click('button:has-text("Receive payment")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill("#payAmount", "500");
    await page.selectOption("#payMethod", "JAZZCASH");
    await page.click('[role="dialog"] button[type="submit"]');

    await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    await page.waitForTimeout(1000);

    const balanceText = await page.locator("text=Balance:").textContent();
    expect(balanceText).toContain("2,500");

    await page.close();
    await ctx.close();
  });
});

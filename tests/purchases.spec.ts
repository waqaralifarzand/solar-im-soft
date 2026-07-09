import { test, expect } from "@playwright/test";
import {
  prisma,
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestSupplier,
  getProductStock,
} from "./helpers/db";
import { loginAs } from "./helpers/auth";
import { selectOptionByText } from "./helpers/ui";

test.describe("Purchase orders", () => {
  test("lifecycle: create, order, receive with per-item cost price update, stock increments", async ({ page }) => {
    const company = await createTestCompany({ name: "PO Test Co" });
    const admin = await createTestUser(company.id, "ADMIN", "po-admin");
    const supplier = await createTestSupplier(company.id, "Solar Supplies Co");
    const productKeepCost = await createTestProduct(company.id, {
      name: "PO Panel Keep Cost",
      salePrice: 2000,
      stockQty: 10,
      costPrice: 1000,
    });
    const productUpdateCost = await createTestProduct(company.id, {
      name: "PO Panel Update Cost",
      salePrice: 3000,
      stockQty: 15,
      costPrice: 1500,
    });

    await loginAs(page, admin.email, admin.password);
    await page.goto("/purchases/new");

    await selectOptionByText(page.getByLabel("Supplier"), supplier.name);

    for (const [product, qty, unitCost] of [
      [productKeepCost, "6", "1100"],
      [productUpdateCost, "4", "1800"],
    ] as const) {
      await page.getByPlaceholder(/search product name or sku/i).fill(product.name);
      await page.locator("button", { hasText: product.sku }).first().click();
      const row = page.locator("tbody tr", { hasText: product.sku });
      await row.locator("input").nth(0).fill(qty);
      await row.locator("input").nth(1).fill(unitCost);
    }

    await page.getByRole("button", { name: /create purchase order/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/purchases/") && url.pathname !== "/purchases/new");
    await expect(page.locator("h1")).toHaveText("PO-0001");

    let po = await prisma.purchaseOrder.findFirstOrThrow({ where: { companyId: company.id } });
    expect(po.status).toBe("DRAFT");

    // move DRAFT -> ORDERED
    await page.locator("select").first().selectOption("ORDERED");
    await expect(async () => {
      po = await prisma.purchaseOrder.findFirstOrThrow({ where: { id: po.id } });
      expect(po.status).toBe("ORDERED");
    }).toPass({ timeout: 5000 });

    // Receive: check cost-price update for productUpdateCost, uncheck for productKeepCost
    await page.getByRole("button", { name: "Receive" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Each item row is `<p>{productName}</p>`'s grandparent (the row div that also holds the checkbox).
    const keepCostRow = page.locator("p", { hasText: productKeepCost.name }).locator("xpath=ancestor::div[2]");
    await keepCostRow.locator('input[type="checkbox"]').uncheck();
    // productUpdateCost's checkbox stays checked (default)
    await page.getByRole("button", { name: /confirm receive/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await expect(page.locator("span", { hasText: "RECEIVED" })).toBeVisible();
    // once RECEIVED, neither the status select nor the Receive button remain
    await expect(page.locator("select")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Receive" })).toHaveCount(0);

    expect(await getProductStock(productKeepCost.id)).toBe(16); // 10 + 6
    expect(await getProductStock(productUpdateCost.id)).toBe(19); // 15 + 4

    const keepCostProduct = await prisma.product.findUniqueOrThrow({ where: { id: productKeepCost.id } });
    expect(keepCostProduct.costPrice.toString()).toBe("1000"); // unchanged, checkbox unticked

    const updatedCostProduct = await prisma.product.findUniqueOrThrow({ where: { id: productUpdateCost.id } });
    expect(updatedCostProduct.costPrice.toString()).toBe("1800"); // set to this PO's unit cost

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { reason: "PURCHASE", productId: { in: [productKeepCost.id, productUpdateCost.id] } },
    });
    expect(adjustments).toHaveLength(2);
    for (const adj of adjustments) {
      expect(adj.refId).toBe(po.id);
    }

    po = await prisma.purchaseOrder.findFirstOrThrow({ where: { id: po.id } });
    expect(po.status).toBe("RECEIVED");
    expect(po.receivedAt).not.toBeNull();

    // the receipt also shows up in the product's own adjustment history (Inventory, Phase 4)
    await page.goto(`/inventory/${productKeepCost.id}`);
    await expect(page.getByText("PURCHASE", { exact: true })).toBeVisible();
    await expect(page.getByText("+6", { exact: true })).toBeVisible();
  });

  test("a purchase order can only be received once (concurrent receive attempts)", async ({ browser }) => {
    test.setTimeout(60_000); // two sequential logins + PO creation before the concurrent step
    const company = await createTestCompany({ name: "PO Double Receive Co" });
    const adminA = await createTestUser(company.id, "ADMIN", "po-double-a");
    const adminB = await createTestUser(company.id, "MANAGER", "po-double-b");
    const supplier = await createTestSupplier(company.id, "Double Receive Supplier");
    const product = await createTestProduct(company.id, { name: "Double Receive Panel", salePrice: 2000, stockQty: 5, costPrice: 1000 });

    const pageA = await (await browser.newContext()).newPage();
    await loginAs(pageA, adminA.email, adminA.password);
    await pageA.goto("/purchases/new");
    await selectOptionByText(pageA.getByLabel("Supplier"), supplier.name);
    await pageA.getByPlaceholder(/search product name or sku/i).fill(product.name);
    await pageA.locator("button", { hasText: product.sku }).first().click();
    const row = pageA.locator("tbody tr", { hasText: product.sku });
    await row.locator("input").nth(0).fill("3");
    await row.locator("input").nth(1).fill("1200");
    await pageA.getByRole("button", { name: /create purchase order/i }).click();
    await pageA.waitForURL((url) => url.pathname.startsWith("/purchases/") && url.pathname !== "/purchases/new");
    const poUrl = pageA.url();

    // both browser contexts load the detail page while status is still DRAFT, so both see
    // the Receive button before either one acts.
    const pageB = await (await browser.newContext()).newPage();
    await loginAs(pageB, adminB.email, adminB.password);
    await pageB.goto(poUrl);

    await pageA.getByRole("button", { name: "Receive" }).click();
    await pageB.getByRole("button", { name: "Receive" }).click();

    await Promise.all([
      pageA.getByRole("button", { name: /confirm receive/i }).click(),
      pageB.getByRole("button", { name: /confirm receive/i }).click(),
    ]);

    const [aRejected, bRejected] = await Promise.all([
      pageA
        .getByText(/already been received/i)
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false),
      pageB
        .getByText(/already been received/i)
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false),
    ]);

    // exactly one of the two concurrent receive attempts lost the race
    expect(aRejected).not.toBe(bRejected);

    expect(await getProductStock(product.id)).toBe(8); // 5 + 3, incremented exactly once
    const adjustmentCount = await prisma.stockAdjustment.count({ where: { productId: product.id, reason: "PURCHASE" } });
    expect(adjustmentCount).toBe(1);

    const po = await prisma.purchaseOrder.findFirstOrThrow({ where: { companyId: company.id } });
    expect(po.status).toBe("RECEIVED");
  });
});

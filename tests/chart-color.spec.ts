import { test, expect } from "@playwright/test";
import { createTestCompany, createTestUser, createTestProduct, prisma } from "./helpers/db";
import { loginAs } from "./helpers/auth";

const CHART_PRIMARY = "#2563EB";

test.describe("Chart color (fixed, independent of tenant accent)", () => {
  test("dashboard and reports charts use the fixed chart-primary blue, not the company accent color", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const company = await createTestCompany({ name: "Chart Color Co" });
    // A loud, obviously-not-blue accent color, so a chart that accidentally picked it up
    // would fail this assertion instead of coincidentally passing.
    await prisma.company.update({ where: { id: company.id }, data: { accentColor: "#F79009" } });
    const admin = await createTestUser(company.id, "ADMIN", "chart-admin");
    const product = await createTestProduct(company.id, { name: "Chart Panel", salePrice: 2000, stockQty: 10 });

    await prisma.invoice.create({
      data: {
        companyId: company.id,
        invoiceNo: "INV-0001",
        type: "POS",
        status: "PAID",
        subtotal: 2000,
        discount: 0,
        taxAmount: 0,
        total: 2000,
        paidAmount: 2000,
        createdBy: admin.id,
        items: {
          create: [{ productId: product.id, nameSnapshot: product.name, qty: 1, unitPrice: 2000, lineTotal: 2000, costSnapshot: 1000 }],
        },
      },
    });

    await loginAs(page, admin.email, admin.password);

    // Generous per-navigation timeouts: this environment has an isolated, undiagnosed
    // single-request slowdown on cold dev-mode compiles that shows up intermittently
    // across every phase of this project (see SCRATCHPAD.md's Phase 7/8/9 reports) — never
    // reproducible standalone, never tied to a real server error, healthy logs throughout.
    // A longer budget absorbs it without masking a real regression: a genuinely broken page
    // would still fail the same way, just slower.
    await page.goto("/dashboard", { timeout: 60_000 });
    const dashboardBar = page.locator(".recharts-bar-rectangle path").first();
    await expect(dashboardBar).toBeVisible({ timeout: 15_000 });
    await expect(dashboardBar).toHaveAttribute("fill", CHART_PRIMARY);

    await page.goto("/reports/sales", { timeout: 60_000 });
    const reportsBar = page.locator(".recharts-bar-rectangle path").first();
    await expect(reportsBar).toBeVisible({ timeout: 15_000 });
    await expect(reportsBar).toHaveAttribute("fill", CHART_PRIMARY);
  });
});

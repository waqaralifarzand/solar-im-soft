import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as XLSX from "xlsx";
import { test, expect } from "@playwright/test";
import { createTestCompany, createTestUser, createTestProduct, prisma } from "./helpers/db";
import { loginAs } from "./helpers/auth";

function writeTempFile(name: string, content: string | Buffer): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "import-test-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function buildCsv(rows: string[][]): string {
  return rows.map((r) => r.join(",")).join("\n");
}

function buildXlsx(rows: (string | number)[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const HEADERS = ["Name", "SKU", "Barcode", "Category", "Unit", "Cost price", "Sale price", "Stock qty", "Reorder level"];

test.describe("Product CSV/XLSX import", () => {
  test("CSV happy path: creates products, auto-creates a new category, writes OPENING stock adjustments", async ({
    page,
  }) => {
    const company = await createTestCompany({ name: "Import Happy Co" });
    const admin = await createTestUser(company.id, "ADMIN", "import-happy-admin");
    await loginAs(page, admin.email, admin.password);

    const suffix = Date.now().toString(36);
    // Both products share one new category, so "Created 1 new category" is unambiguous —
    // categoriesCreated counts distinct new category *names*, not rows.
    const csvPath = writeTempFile(
      "products.csv",
      buildCsv([
        HEADERS,
        [`Mono Panel 550W`, `PNL-${suffix}-1`, "", "Solar Panels", "pcs", "28000", "32000", "10", "5"],
        [`Hybrid Inverter 5kW`, `INV-${suffix}-1`, "", "Solar Panels", "pcs", "45000", "60000", "4", "2"],
      ]),
    );

    await page.goto("/inventory/import");
    await page.setInputFiles('input[type="file"]', csvPath);
    await expect(page.getByText("Match each field to a column")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Review before importing")).toBeVisible();
    await expect(page.getByText("2 valid")).toBeVisible();
    await expect(page.getByText("0 with errors")).toBeVisible();

    await page.getByRole("button", { name: /^Import 2 products/ }).click();
    // Note: the page also has a permanent "Back to inventory" breadcrumb link at the top,
    // present since page load — it is NOT a reliable signal that the import finished, so
    // wait on the done-stage's own distinguishing text instead (scoped with .first() since
    // the identical string also briefly appears in the toast, same duplicate-text-locator
    // trap tests/command-palette.spec.ts hit in the Phase 8 report).
    await expect(page.getByText(/^Imported 2 products/).first()).toBeVisible();
    await expect(page.getByText("Created 1 new category")).toBeVisible();

    const panel = await prisma.product.findFirstOrThrow({ where: { companyId: company.id, sku: `PNL-${suffix}-1` } });
    const inverter = await prisma.product.findFirstOrThrow({ where: { companyId: company.id, sku: `INV-${suffix}-1` } });
    expect(panel.stockQty).toBe(10);
    expect(inverter.stockQty).toBe(4);
    expect(Number(panel.costPrice)).toBe(28000);
    expect(Number(panel.salePrice)).toBe(32000);

    const category = await prisma.category.findFirstOrThrow({ where: { companyId: company.id, name: "Solar Panels" } });
    expect(panel.categoryId).toBe(category.id);
    expect(inverter.categoryId).toBe(category.id);

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { companyId: company.id, reason: "OPENING", productId: { in: [panel.id, inverter.id] } },
    });
    expect(adjustments).toHaveLength(2);
    expect(adjustments.map((a) => a.qtyChange).sort((a, b) => a - b)).toEqual([4, 10]);
  });

  test("rejects a row missing a required field and a duplicate SKU (in-file and against an existing product), writing zero products for those rows", async ({
    page,
  }) => {
    const company = await createTestCompany({ name: "Import Reject Co" });
    const admin = await createTestUser(company.id, "ADMIN", "import-reject-admin");
    const existing = await createTestProduct(company.id, { name: "Already Here", salePrice: 800, stockQty: 2, sku: "EXISTING-SKU" });
    await loginAs(page, admin.email, admin.password);

    const suffix = Date.now().toString(36);
    const goodSku = `GOOD-${suffix}`;
    const csvPath = writeTempFile(
      "reject.csv",
      buildCsv([
        HEADERS,
        [`Valid Product`, goodSku, "", "Batteries", "pcs", "10000", "15000", "6", "2"],
        [``, `MISSING-NAME-${suffix}`, "", "", "pcs", "1000", "2000", "1", "5"], // missing name
        [`Clashes With Existing`, "EXISTING-SKU", "", "", "pcs", "1000", "2000", "1", "5"], // dup vs existing
        [`Second Copy`, goodSku, "", "", "pcs", "1000", "2000", "1", "5"], // dup within file
      ]),
    );

    await page.goto("/inventory/import");
    await page.setInputFiles('input[type="file"]', csvPath);
    await expect(page.getByText("Match each field to a column")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Review before importing")).toBeVisible();
    await expect(page.getByText("1 valid")).toBeVisible();
    await expect(page.getByText("3 with errors")).toBeVisible();
    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("SKU already exists for another product")).toBeVisible();
    await expect(page.getByText(/Duplicate SKU/)).toBeVisible();

    await page.getByRole("button", { name: /^Import 1 product/ }).click();
    await expect(page.getByText(/^Imported 1 product/).first()).toBeVisible();

    // The one good row was written...
    const created = await prisma.product.findMany({ where: { companyId: company.id, sku: goodSku } });
    expect(created).toHaveLength(1);

    // ...and every rejected row left zero trace: no product for the missing-name row, no
    // second product for either duplicate-SKU case, and the pre-existing product is untouched.
    const missingNameProduct = await prisma.product.findFirst({ where: { companyId: company.id, name: "" } });
    expect(missingNameProduct).toBeNull();
    const clashProducts = await prisma.product.findMany({ where: { companyId: company.id, sku: "EXISTING-SKU" } });
    expect(clashProducts).toHaveLength(1);
    expect(clashProducts[0].id).toBe(existing.id);
    expect(clashProducts[0].name).toBe(existing.name);
    const totalProducts = await prisma.product.count({ where: { companyId: company.id } });
    expect(totalProducts).toBe(2); // the pre-existing one + the single valid import
  });

  test("xlsx variant: parses and imports an .xlsx file the same way as .csv", async ({ page }) => {
    const company = await createTestCompany({ name: "Import Xlsx Co" });
    const admin = await createTestUser(company.id, "ADMIN", "import-xlsx-admin");
    await loginAs(page, admin.email, admin.password);

    const suffix = Date.now().toString(36);
    const sku = `XLSX-${suffix}`;
    const xlsxBuffer = buildXlsx([
      HEADERS,
      [`Battery 200Ah`, sku, "", "Batteries", "pcs", 22000, 27000, 8, 3],
    ]);
    const xlsxPath = writeTempFile("products.xlsx", xlsxBuffer);

    await page.goto("/inventory/import");
    await page.setInputFiles('input[type="file"]', xlsxPath);
    await expect(page.getByText("Match each field to a column")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Review before importing")).toBeVisible();
    await expect(page.getByText("1 valid")).toBeVisible();

    await page.getByRole("button", { name: /^Import 1 product/ }).click();
    await expect(page.getByText(/^Imported 1 product/).first()).toBeVisible();

    const product = await prisma.product.findFirstOrThrow({ where: { companyId: company.id, sku } });
    expect(product.stockQty).toBe(8);
    expect(Number(product.costPrice)).toBe(22000);
    expect(Number(product.salePrice)).toBe(27000);
  });

  test("CASHIER is rejected server-side even if they drive the upload UI directly", async ({ page }) => {
    const company = await createTestCompany({ name: "Import Role Co" });
    const cashier = await createTestUser(company.id, "CASHIER", "import-cashier");
    await loginAs(page, cashier.email, cashier.password);

    const csvPath = writeTempFile("role-check.csv", buildCsv([HEADERS, ["Role Check Product", `RC-${Date.now()}`, "", "", "pcs", "1000", "2000", "1", "5"]]));

    // The import route itself renders for a CASHIER (matches every other /inventory/* route's
    // existing security posture — see the Phase 9 report's Known issues), but the mutating
    // server action (validateProductImport -> requireRole("ADMIN","MANAGER")) rejects the
    // role regardless of what the UI shows. This is the CLAUDE.md AUTHZ rule in practice:
    // UI hiding is not security, so exercise the real server boundary, not just the button.
    await page.goto("/inventory/import");
    await page.setInputFiles('input[type="file"]', csvPath);
    await expect(page.getByText("Match each field to a column")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Forbidden")).toBeVisible();

    const count = await prisma.product.count({ where: { companyId: company.id } });
    expect(count).toBe(0);
  });
});

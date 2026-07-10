import { test, expect } from "@playwright/test";
import { prisma, createTestCompany, createTestUser } from "./helpers/db";
import { loginAs } from "./helpers/auth";

async function seedAuditRow(companyId: string, userId: string, action: string, entity: string) {
  return prisma.auditLog.create({
    data: { companyId, userId, action, entity, entityId: null, meta: { note: "test fixture" } },
  });
}

test.describe("Audit log (Settings)", () => {
  test("lists company-scoped actions and filters by action type", async ({ page }) => {
    const company = await createTestCompany({ name: "Audit Test Co" });
    const admin = await createTestUser(company.id, "ADMIN", "audit-admin");

    await seedAuditRow(company.id, admin.id, "product.create", "Product");
    await seedAuditRow(company.id, admin.id, "product.create", "Product");
    await seedAuditRow(company.id, admin.id, "expense.create", "Expense");
    await seedAuditRow(company.id, admin.id, "user.create", "User");

    await loginAs(page, admin.email, admin.password);
    await page.goto("/settings/audit");

    await expect(page.getByText("Latest 4 actions across your company.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "product.create", exact: true })).toHaveCount(2);
    await expect(page.getByRole("cell", { name: "expense.create", exact: true })).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "user.create", exact: true })).toHaveCount(1);

    await page.getByRole("combobox").selectOption("expense.create");
    await expect(page.getByRole("cell", { name: "expense.create", exact: true })).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "product.create", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "user.create", exact: true })).toHaveCount(0);

    await page.getByRole("combobox").selectOption("");
    await expect(page.getByRole("cell", { name: "product.create", exact: true })).toHaveCount(2);
  });

  test("tenant isolation: never shows another company's audit rows", async ({ page }) => {
    const companyA = await createTestCompany({ name: "Audit Iso Co A" });
    const adminA = await createTestUser(companyA.id, "ADMIN", "audit-iso-a");
    await seedAuditRow(companyA.id, adminA.id, "supplier.create", "Supplier");

    const companyB = await createTestCompany({ name: "Audit Iso Co B" });
    const adminB = await createTestUser(companyB.id, "ADMIN", "audit-iso-b");
    await seedAuditRow(companyB.id, adminB.id, "category.create", "Category");

    await loginAs(page, adminB.email, adminB.password);
    await page.goto("/settings/audit");

    await expect(page.getByText("Latest 1 actions across your company.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "category.create", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "supplier.create", exact: true })).toHaveCount(0);
  });

  test("MANAGER cannot reach the audit log tab", async ({ page }) => {
    const company = await createTestCompany({ name: "Audit Role Co" });
    const manager = await createTestUser(company.id, "MANAGER", "audit-manager");

    await loginAs(page, manager.email, manager.password);
    const response = await page.goto("/settings/audit");
    await page.waitForURL(/\/dashboard/);
    expect(response?.status()).toBeLessThan(400);
  });
});

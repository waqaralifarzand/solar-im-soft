import { test, expect } from "@playwright/test";
import { createTestCompany, createTestUser, createTestExpense } from "./helpers/db";
import { loginAs } from "./helpers/auth";

function monthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

test.describe("Expenses", () => {
  test("quick-add form creates an expense, and the month filter scopes the list", async ({ page }) => {
    const company = await createTestCompany({ name: "Expense Test Co" });
    const admin = await createTestUser(company.id, "ADMIN", "expense-admin");

    // Seed one expense last month and one two months ago, directly via Prisma, so the
    // filtering assertions don't depend on which day of the month the suite happens to run.
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 10));
    await createTestExpense(company.id, { createdBy: admin.id, category: "Utilities", amount: 3000, date: lastMonth, note: "Last month utilities" });
    await createTestExpense(company.id, { createdBy: admin.id, category: "Transport", amount: 1200, date: twoMonthsAgo, note: "Two months ago fuel" });

    await loginAs(page, admin.email, admin.password);
    await page.goto("/expenses");

    // default view is the current month: neither seeded expense (both in the past) is visible
    await expect(page.getByText("Last month utilities")).toHaveCount(0);
    await expect(page.getByText("Two months ago fuel")).toHaveCount(0);
    await expect(page.getByText("No expenses recorded.")).toBeVisible();

    // add a current-month expense through the real form
    await page.getByLabel("Category").selectOption("Rent");
    await page.getByLabel("Amount").fill("15000");
    await page.getByLabel("Note (optional)").fill("July office rent");
    await page.getByRole("button", { name: /add expense/i }).click();

    await expect(page.getByText("July office rent")).toBeVisible();
    // .first() disambiguates the table cell from the "Total: Rs 15,000.00" footer line.
    await expect(page.getByText("Rs 15,000.00").first()).toBeVisible();
    await expect(page.getByText("Last month utilities")).toHaveCount(0);

    // "All time" shows every expense regardless of month
    await page.getByRole("button", { name: /all time/i }).click();
    await expect(page.getByText("July office rent")).toBeVisible();
    await expect(page.getByText("Last month utilities")).toBeVisible();
    await expect(page.getByText("Two months ago fuel")).toBeVisible();

    // filtering to last month's specific month shows only that expense
    await page.locator('input[type="month"]').fill(monthString(lastMonth));
    await expect(page.getByText("Last month utilities")).toBeVisible();
    await expect(page.getByText("July office rent")).toHaveCount(0);
    await expect(page.getByText("Two months ago fuel")).toHaveCount(0);
  });
});

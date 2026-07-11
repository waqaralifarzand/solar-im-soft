import { test, expect } from "@playwright/test";
import { createTestCompany, createTestUser } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.describe("Sidebar (Phase 9 width + logo refinements)", () => {
  test("renders at 216px expanded and 64px collapsed, and the collapse toggle still works", async ({ page }) => {
    const company = await createTestCompany({ name: "Sidebar Test Co" });
    const admin = await createTestUser(company.id, "ADMIN", "sidebar-admin");

    await loginAs(page, admin.email, admin.password);

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveCSS("width", "216px");

    // Company name is visible in the enlarged logo area while expanded.
    await expect(sidebar.getByText(company.name, { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(sidebar).toHaveCSS("width", "64px");
    // Collapsed rail shows no company name text, only the logo mark.
    await expect(sidebar.getByText(company.name, { exact: false })).toHaveCount(0);

    // Nav still works while collapsed. Note: collapsed nav items render icon-only with no
    // visible label and no aria-label (pre-existing behavior from Phase 0, not introduced by
    // this phase's width/logo change) — that means they currently have no accessible name,
    // so this has to target by href rather than by accessible role name. Flagged as a known
    // issue in the Phase 9 report rather than silently fixed, since widening this test's own
    // scope to add aria-labels across the nav wasn't part of the requested sidebar change.
    await sidebar.locator('nav a[href="/inventory"]').click();
    await page.waitForURL(/\/inventory$/);

    // The width change is CSS-transitioned; clicking mid-transition can land on the layout's
    // <main> as the flex row reflows underneath the click point. Wait for the collapsed width
    // to be stable before the next click rather than fighting it with a forced click.
    await expect(sidebar).toHaveCSS("width", "64px");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar).toHaveCSS("width", "216px");
    await expect(sidebar.getByText(company.name, { exact: false })).toBeVisible();
  });
});

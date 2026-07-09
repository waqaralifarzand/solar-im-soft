import { test, expect } from "@playwright/test";
import { prisma, createTestCompany, createTestUser, createTestProduct } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test("invoice numbers stay sequential and unique under two rapid concurrent creations", async ({ browser }) => {
  const company = await createTestCompany({ name: "Concurrency Test Co" });
  const userA = await createTestUser(company.id, "ADMIN", "concurrent-a");
  const userB = await createTestUser(company.id, "MANAGER", "concurrent-b");
  const product = await createTestProduct(company.id, { name: "Mounting Rail", salePrice: 5000, stockQty: 50 });

  {
    const pageA = await (await browser.newContext()).newPage();
    const pageB = await (await browser.newContext()).newPage();

    // Log in and land on /pos sequentially — this only warms up Next.js dev-mode's
    // on-demand route compilation so it can't itself race; the actual concurrency
    // under test is the simultaneous "Complete sale" click below.
    await loginAs(pageA, userA.email, userA.password);
    await loginAs(pageB, userB.email, userB.password);
    await pageA.goto("/pos");
    await pageB.goto("/pos");

    await Promise.all([
      pageA.getByPlaceholder(/search product/i).fill(product.name),
      pageB.getByPlaceholder(/search product/i).fill(product.name),
    ]);
    await Promise.all([
      pageA.getByPlaceholder(/search product/i).press("Enter"),
      pageB.getByPlaceholder(/search product/i).press("Enter"),
    ]);
    await Promise.all([expect(pageA.getByText("Cart (1)")).toBeVisible(), expect(pageB.getByText("Cart (1)")).toBeVisible()]);

    // fire both sale submissions at (as close to) the same instant as possible
    await Promise.all([
      pageA.getByRole("button", { name: /complete sale/i }).click(),
      pageB.getByRole("button", { name: /complete sale/i }).click(),
    ]);

    // Phase 5B: a successful sale now lands on a "Sale complete — INV-000N" success panel
    // instead of redirecting — the invoice number is readable right there.
    const saleCompleteA = pageA.getByText(/Sale complete — /);
    const saleCompleteB = pageB.getByText(/Sale complete — /);
    await Promise.all([expect(saleCompleteA).toBeVisible(), expect(saleCompleteB).toBeVisible()]);

    const [textA, textB] = await Promise.all([saleCompleteA.textContent(), saleCompleteB.textContent()]);
    const noA = textA?.match(/INV-\d{4}/)?.[0];
    const noB = textB?.match(/INV-\d{4}/)?.[0];

    expect(noA).toMatch(/^INV-\d{4}$/);
    expect(noB).toMatch(/^INV-\d{4}$/);
    expect(noA).not.toBe(noB);

    const numbers = [noA, noB].map((n) => Number.parseInt(n!.slice(4), 10)).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2]);

    const invoiceCount = await prisma.invoice.count({ where: { companyId: company.id } });
    expect(invoiceCount).toBe(2);
  }
});

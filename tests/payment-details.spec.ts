import { test, expect } from "@playwright/test";
import { createTestCompany, createTestUser, createTestProduct, prisma } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.describe("Payment details (Settings + PDFs)", () => {
  test("saving payment details in Settings shows a Payment details block on the invoice PDF; absent when unset", async ({
    page,
  }) => {
    const company = await createTestCompany({ name: "Payment Details Co" });
    const admin = await createTestUser(company.id, "ADMIN", "payment-admin");
    const product = await createTestProduct(company.id, { name: "Payment Panel", salePrice: 5000, stockQty: 10 });

    await loginAs(page, admin.email, admin.password);

    // Invoice created before payment details are set — its PDF must render with no block.
    const invoiceBefore = await prisma.invoice.create({
      data: {
        companyId: company.id,
        invoiceNo: "INV-0001",
        type: "STANDARD",
        status: "PAID",
        subtotal: 5000,
        discount: 0,
        taxAmount: 0,
        total: 5000,
        paidAmount: 5000,
        createdBy: admin.id,
        items: {
          create: [{ productId: product.id, nameSnapshot: product.name, qty: 1, unitPrice: 5000, lineTotal: 5000, costSnapshot: 3000 }],
        },
      },
    });

    const pdfBeforeResp = await page.request.get(`/api/invoices/${invoiceBefore.id}/pdf`);
    expect(pdfBeforeResp.status()).toBe(200);
    const pdfBeforeSize = (await pdfBeforeResp.body()).length;

    await page.goto("/settings/payment");
    await page.getByLabel("Bank name").fill("Meezan Bank");
    await page.getByLabel("Account title").fill("Payment Details Co");
    await page.getByLabel("Account number").fill("01234567890123");
    await page.getByLabel("IBAN").fill("PK36MEZN0001234567890123");
    await page.getByLabel("JazzCash number").fill("03001234567");
    await page.getByLabel("EasyPaisa number").fill("03111234567");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    // A fresh invoice created after saving — its PDF must render the block.
    const invoiceAfter = await prisma.invoice.create({
      data: {
        companyId: company.id,
        invoiceNo: "INV-0002",
        type: "STANDARD",
        status: "PAID",
        subtotal: 5000,
        discount: 0,
        taxAmount: 0,
        total: 5000,
        paidAmount: 5000,
        createdBy: admin.id,
        items: {
          create: [{ productId: product.id, nameSnapshot: product.name, qty: 1, unitPrice: 5000, lineTotal: 5000, costSnapshot: 3000 }],
        },
      },
    });

    const pdfAfterResp = await page.request.get(`/api/invoices/${invoiceAfter.id}/pdf`);
    expect(pdfAfterResp.status()).toBe(200);
    const pdfAfterSize = (await pdfAfterResp.body()).length;

    // Structural proxy for "the payment details block rendered" (same technique the Phase 5B
    // logo/no-logo PDF comparison used) — a real byte-size difference, not a flaky pixel diff.
    expect(pdfAfterSize).toBeGreaterThan(pdfBeforeSize);

    // Quotation PDF gets the same block once payment details are set.
    const quotation = await prisma.quotation.create({
      data: {
        companyId: company.id,
        quoteNo: "QUO-0001",
        status: "DRAFT",
        subtotal: 5000,
        discount: 0,
        taxAmount: 0,
        total: 5000,
        createdBy: admin.id,
        items: {
          create: [{ productId: product.id, nameSnapshot: product.name, qty: 1, unitPrice: 5000, lineTotal: 5000 }],
        },
      },
    });
    const quotePdfResp = await page.request.get(`/api/quotations/${quotation.id}/pdf`);
    expect(quotePdfResp.status()).toBe(200);
    expect((await quotePdfResp.body()).length).toBeGreaterThan(0);
  });
});

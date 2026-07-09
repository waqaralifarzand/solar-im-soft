"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { formatMoney } from "@/lib/formatMoney";
import { signInvoiceShareToken } from "@/lib/pdfShareToken";

const SALE_ROLES = ["ADMIN", "MANAGER", "CASHIER"] as const;

function publicPdfBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
}

function whatsappPhoneDigits(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

export async function generateInvoiceShareLink(
  invoiceId: string,
): Promise<{ publicPdfUrl: string; whatsappUrl: string }> {
  const ctx = await requireRole(...SALE_ROLES);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: ctx.companyId, deletedAt: null },
    include: { customer: { select: { phone: true } } },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (ctx.role === "CASHIER" && invoice.createdBy !== ctx.userId) {
    throw new Error("Forbidden");
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: { currency: true, lakhCroreFormat: true },
  });
  const fmt = { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat };
  const remaining = invoice.total.minus(invoice.paidAmount);

  const token = await signInvoiceShareToken(invoice.id);
  const publicPdfUrl = `${publicPdfBaseUrl()}/api/public/invoices/${token}/pdf`;

  const messageLines = [
    `Invoice ${invoice.invoiceNo}`,
    `Total: ${formatMoney(invoice.total, fmt)}`,
    `Balance due: ${formatMoney(remaining, fmt)}`,
    publicPdfUrl,
  ];
  const whatsappUrl = `https://wa.me/${whatsappPhoneDigits(invoice.customer?.phone ?? null)}?text=${encodeURIComponent(messageLines.join("\n"))}`;

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "invoice.share_link_generate",
      entity: "Invoice",
      entityId: invoice.id,
      meta: { invoiceNo: invoice.invoiceNo },
    },
  });

  return { publicPdfUrl, whatsappUrl };
}

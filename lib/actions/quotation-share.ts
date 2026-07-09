"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { formatMoney } from "@/lib/formatMoney";
import { signShareToken } from "@/lib/pdfShareToken";

const QUOTE_ROLES = ["ADMIN", "MANAGER"] as const;

function publicPdfBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
}

function whatsappPhoneDigits(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

export async function generateQuotationShareLink(
  quotationId: string,
): Promise<{ publicPdfUrl: string; whatsappUrl: string }> {
  const ctx = await requireRole(...QUOTE_ROLES);

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, companyId: ctx.companyId },
    include: { customer: { select: { phone: true } } },
  });
  if (!quotation) throw new Error("Quotation not found");

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: { currency: true, lakhCroreFormat: true },
  });
  const fmt = { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat };

  const token = await signShareToken(quotation.id);
  const publicPdfUrl = `${publicPdfBaseUrl()}/api/public/quotations/${token}/pdf`;

  const messageLines = [
    `Quotation ${quotation.quoteNo}`,
    `Total: ${formatMoney(quotation.total, fmt)}`,
    quotation.validUntil ? `Valid until: ${quotation.validUntil.toLocaleDateString()}` : null,
    publicPdfUrl,
  ].filter((line): line is string => line !== null);
  const whatsappUrl = `https://wa.me/${whatsappPhoneDigits(quotation.customer?.phone ?? null)}?text=${encodeURIComponent(messageLines.join("\n"))}`;

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "quotation.share_link_generate",
      entity: "Quotation",
      entityId: quotation.id,
      meta: { quoteNo: quotation.quoteNo },
    },
  });

  return { publicPdfUrl, whatsappUrl };
}

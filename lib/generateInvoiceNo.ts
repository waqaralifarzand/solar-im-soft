import type { Prisma } from "@prisma/client";

const INVOICE_PREFIX = "INV-";

/**
 * Locks the Company row for the duration of the caller's transaction (SELECT ... FOR
 * UPDATE), so concurrent invoice-creation transactions for the same company serialize
 * on this call instead of racing to read the same "max existing number" and colliding
 * on @@unique([companyId, invoiceNo]). Different companies never block each other.
 */
export async function nextInvoiceNo(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;

  const existing = await tx.invoice.findMany({
    where: { companyId, invoiceNo: { startsWith: INVOICE_PREFIX } },
    select: { invoiceNo: true },
  });

  let maxNumber = 0;
  for (const { invoiceNo } of existing) {
    const num = Number.parseInt(invoiceNo.slice(INVOICE_PREFIX.length), 10);
    if (Number.isFinite(num) && num > maxNumber) maxNumber = num;
  }

  return `${INVOICE_PREFIX}${String(maxNumber + 1).padStart(4, "0")}`;
}

import type { Prisma } from "@prisma/client";

const QUOTE_PREFIX = "QUO-";

/**
 * Same per-company sequential-numbering pattern as lib/generateInvoiceNo.ts: locks the
 * Company row (SELECT ... FOR UPDATE) for the caller's transaction so concurrent
 * quotation-creation transactions for the same company serialize here instead of racing
 * to read the same "max existing number" and colliding on @@unique([companyId, quoteNo]).
 */
export async function nextQuoteNo(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;

  const existing = await tx.quotation.findMany({
    where: { companyId, quoteNo: { startsWith: QUOTE_PREFIX } },
    select: { quoteNo: true },
  });

  let maxNumber = 0;
  for (const { quoteNo } of existing) {
    const num = Number.parseInt(quoteNo.slice(QUOTE_PREFIX.length), 10);
    if (Number.isFinite(num) && num > maxNumber) maxNumber = num;
  }

  return `${QUOTE_PREFIX}${String(maxNumber + 1).padStart(4, "0")}`;
}

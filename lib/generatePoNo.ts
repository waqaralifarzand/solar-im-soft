import type { Prisma } from "@prisma/client";

const PO_PREFIX = "PO-";

/**
 * Same per-company sequential-numbering pattern as lib/generateInvoiceNo.ts and
 * lib/generateQuoteNo.ts: locks the Company row (SELECT ... FOR UPDATE) for the caller's
 * transaction so concurrent PO-creation transactions for the same company serialize here
 * instead of racing to read the same "max existing number" and colliding on
 * @@unique([companyId, poNo]).
 */
export async function nextPoNo(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;

  const existing = await tx.purchaseOrder.findMany({
    where: { companyId, poNo: { startsWith: PO_PREFIX } },
    select: { poNo: true },
  });

  let maxNumber = 0;
  for (const { poNo } of existing) {
    const num = Number.parseInt(poNo.slice(PO_PREFIX.length), 10);
    if (Number.isFinite(num) && num > maxNumber) maxNumber = num;
  }

  return `${PO_PREFIX}${String(maxNumber + 1).padStart(4, "0")}`;
}

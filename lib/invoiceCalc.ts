export interface InvoiceCalcItem {
  qty: number;
  unitPrice: number;
  lineDiscount: number;
}

export interface InvoiceTotals {
  lineTotals: number[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Client-preview and server-authoritative totals share this exact formula so the
 * amount shown at checkout always matches what the transaction persists. The
 * server still recomputes with Prisma.Decimal from the same parsed inputs — this
 * is never trusted as-is from the client.
 */
export function computeInvoiceTotals(
  items: InvoiceCalcItem[],
  billDiscount: number,
  taxRatePercent: number,
): InvoiceTotals {
  const lineTotals = items.map((item) => Math.max(0, round2(item.qty * item.unitPrice - item.lineDiscount)));
  const subtotal = round2(lineTotals.reduce((sum, t) => sum + t, 0));
  const afterDiscount = Math.max(0, round2(subtotal - billDiscount));
  const taxAmount = round2(afterDiscount * (taxRatePercent / 100));
  const total = round2(afterDiscount + taxAmount);
  return { lineTotals, subtotal, taxAmount, total };
}

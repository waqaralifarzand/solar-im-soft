import { forwardRef } from "react";
import { formatMoney } from "@/lib/formatMoney";

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
}

export interface ReceiptData {
  companyName: string;
  invoiceNo: string;
  createdAt: string | Date;
  customerName: string | null;
  items: ReceiptItem[];
  subtotal: string;
  discount: string;
  taxAmount: string;
  total: string;
  paidAmount: string;
  currency: string;
  lakhCroreFormat: boolean;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * Print-only, 80mm-wide receipt. Deliberately hardcoded black-on-white/monospace instead
 * of the app's design tokens (accent color, Inter) — thermal printers are monochrome and
 * this is the print stylesheet, not a themed screen.
 */
export const ThermalReceipt = forwardRef<HTMLDivElement, { data: ReceiptData }>(function ThermalReceipt(
  { data },
  ref,
) {
  const fmt = { currency: data.currency, lakhCroreFormat: data.lakhCroreFormat };
  const money = (v: string) => formatMoney(v, fmt);
  const remaining = (Number(data.total) - Number(data.paidAmount)).toFixed(2);

  return (
    <div
      ref={ref}
      data-testid="thermal-receipt"
      className="w-[80mm] bg-white p-3 font-mono text-[11px] leading-tight text-black"
    >
      <div className="text-center">
        <p className="text-sm font-bold">{data.companyName}</p>
        <p>{data.invoiceNo}</p>
        <p>{new Date(data.createdAt).toLocaleString()}</p>
      </div>
      <div className="my-2 border-t border-dashed border-black" />
      <p>{data.customerName ? `Customer: ${data.customerName}` : "Walk-in / cash sale"}</p>
      <div className="my-2 border-t border-dashed border-black" />
      {data.items.map((item, i) => (
        <div key={i} className="mb-1">
          <p>{item.name}</p>
          <div className="flex justify-between text-[10px]">
            <span>
              {item.qty} x {money(item.unitPrice)}
            </span>
            <span>{money(item.lineTotal)}</span>
          </div>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <Row label="Subtotal" value={money(data.subtotal)} />
      <Row label="Discount" value={`-${money(data.discount)}`} />
      <Row label="Tax" value={money(data.taxAmount)} />
      <div className="my-1 border-t border-dashed border-black" />
      <Row label="Total" value={money(data.total)} bold />
      <Row label="Paid" value={money(data.paidAmount)} />
      <Row label="Balance due" value={money(remaining)} bold />
      <div className="my-2 border-t border-dashed border-black" />
      <p className="text-center text-[10px]">Thank you!</p>
    </div>
  );
});

"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintReceiptButton } from "@/components/receipt/print-receipt-button";
import type { ReceiptData } from "@/components/receipt/thermal-receipt";
import { formatMoney } from "@/lib/formatMoney";

interface SaleCompletePanelProps {
  invoiceId: string;
  invoiceNo: string;
  receiptData: ReceiptData;
  onNewSale: () => void;
}

export function SaleCompletePanel({ invoiceId, invoiceNo, receiptData, onNewSale }: SaleCompletePanelProps) {
  const router = useRouter();
  const fmt = { currency: receiptData.currency, lakhCroreFormat: receiptData.lakhCroreFormat };
  const remaining = Number(receiptData.total) - Number(receiptData.paidAmount);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-border bg-card p-8 text-center">
      <CheckCircle2 size={40} className="text-success" />
      <div>
        <p className="text-lg font-semibold text-foreground">Sale complete — {invoiceNo}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Total {formatMoney(receiptData.total, fmt)} · Paid {formatMoney(receiptData.paidAmount, fmt)}
          {remaining > 0 && <> · Balance due {formatMoney(remaining.toFixed(2), fmt)}</>}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PrintReceiptButton data={receiptData} size="default" />
        <Button type="button" variant="secondary" onClick={() => router.push(`/invoices/${invoiceId}`)}>
          View invoice
        </Button>
        <Button type="button" onClick={onNewSale}>
          New sale
        </Button>
      </div>
    </div>
  );
}

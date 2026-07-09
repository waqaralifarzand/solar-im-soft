"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertQuotationToInvoice } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";

export function ConvertToInvoiceButton({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const { invoiceId } = await convertQuotationToInvoice(quotationId);
      router.push(`/invoices/${invoiceId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" onClick={handleClick} disabled={submitting}>
        {submitting ? "Converting…" : "Convert to invoice"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

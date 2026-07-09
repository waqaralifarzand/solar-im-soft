"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateQuotationStatus } from "@/lib/actions/quotations";
import { MANUAL_QUOTE_STATUSES } from "@/lib/validations/quotations";
import { Select } from "@/components/ui/select";

interface QuotationStatusSelectProps {
  quotationId: string;
  status: string;
}

export function QuotationStatusSelect({ quotationId, status }: QuotationStatusSelectProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof MANUAL_QUOTE_STATUSES)[number];
    setSubmitting(true);
    setError(null);
    try {
      await updateQuotationStatus(quotationId, { status: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={status} onChange={handleChange} disabled={submitting} className="h-9 w-36">
        {MANUAL_QUOTE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

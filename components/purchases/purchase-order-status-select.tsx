"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePurchaseOrderStatus } from "@/lib/actions/purchases";
import { MANUAL_PO_STATUSES } from "@/lib/validations/purchases";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface PurchaseOrderStatusSelectProps {
  poId: string;
  status: string;
}

export function PurchaseOrderStatusSelect({ poId, status }: PurchaseOrderStatusSelectProps) {
  const router = useRouter();
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof MANUAL_PO_STATUSES)[number];
    setSubmitting(true);
    setError(null);
    try {
      await updatePurchaseOrderStatus(poId, { status: next });
      showToast(`Status changed to ${next}`);
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
        {MANUAL_PO_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

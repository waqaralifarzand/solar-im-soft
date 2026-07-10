"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { stockAdjustmentSchema, MANUAL_ADJUST_REASONS } from "@/lib/validations/inventory";
import { createStockAdjustment } from "@/lib/actions/inventory";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface StockAdjustmentDialogProps {
  productId: string;
  currentStockQty: number;
}

export function StockAdjustmentDialog({ productId, currentStockQty }: StockAdjustmentDialogProps) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [qtyChange, setQtyChange] = useState("");
  const [reason, setReason] = useState<(typeof MANUAL_ADJUST_REASONS)[number]>("MANUAL");
  const [note, setNote] = useState("");
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(stockAdjustmentSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { productId, qtyChange, reason, note };

  function handleOpenChange(next: boolean) {
    if (next) {
      setQtyChange("");
      setReason("MANUAL");
      setNote("");
      clearErrors();
      setFormError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      await createStockAdjustment(data);
      showToast("Stock adjusted");
      router.refresh();
      setOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-sm text-muted-foreground">Current stock: {currentStockQty}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="qtyChange">Quantity change</Label>
            <Input
              id="qtyChange"
              inputMode="numeric"
              placeholder="e.g. 10 or -5"
              value={qtyChange}
              onChange={(e) => setQtyChange(e.target.value)}
              onBlur={() => validateField("qtyChange", values)}
              disabled={submitting}
            />
            {fieldErrors.qtyChange && <p className="text-xs text-destructive">{fieldErrors.qtyChange}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adjustReason">Reason</Label>
            <Select
              id="adjustReason"
              value={reason}
              onChange={(e) => setReason(e.target.value as (typeof MANUAL_ADJUST_REASONS)[number])}
              disabled={submitting}
            >
              <option value="MANUAL">Manual correction</option>
              <option value="DAMAGE">Damage / loss</option>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adjustNote">Note (optional)</Label>
            <Input id="adjustNote" value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save adjustment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

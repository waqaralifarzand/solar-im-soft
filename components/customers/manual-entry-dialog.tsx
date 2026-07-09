"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { manualLedgerEntrySchema, MANUAL_LEDGER_TYPES } from "@/lib/validations/customers";
import { createManualLedgerEntry } from "@/lib/actions/customers";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface ManualEntryDialogProps {
  customerId: string;
}

export function ManualEntryDialog({ customerId }: ManualEntryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof MANUAL_LEDGER_TYPES)[number]>("MANUAL_DEBIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(manualLedgerEntrySchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { customerId, type, amount, note };

  function handleOpenChange(next: boolean) {
    if (next) {
      setType("MANUAL_DEBIT");
      setAmount("");
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
      await createManualLedgerEntry(data);
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
          Add entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual ledger entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entryType">Type</Label>
            <Select
              id="entryType"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof MANUAL_LEDGER_TYPES)[number])}
              disabled={submitting}
            >
              <option value="MANUAL_DEBIT">Debit (customer owes more)</option>
              <option value="MANUAL_CREDIT">Credit (reduce balance)</option>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="entryAmount">Amount</Label>
            <Input
              id="entryAmount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => validateField("amount", values)}
              disabled={submitting}
            />
            {fieldErrors.amount && <p className="text-xs text-destructive">{fieldErrors.amount}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="entryNote">Note</Label>
            <Input
              id="entryNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => validateField("note", values)}
              disabled={submitting}
              placeholder="Reason for this entry"
            />
            {fieldErrors.note && <p className="text-xs text-destructive">{fieldErrors.note}</p>}
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Add entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

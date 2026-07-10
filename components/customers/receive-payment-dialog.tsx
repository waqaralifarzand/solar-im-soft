"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { receivePaymentSchema, PAYMENT_METHODS } from "@/lib/validations/customers";
import { receivePayment } from "@/lib/actions/customers";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

interface ReceivePaymentDialogProps {
  customerId: string;
  currentBalance: string;
}

export function ReceivePaymentDialog({ customerId, currentBalance }: ReceivePaymentDialogProps) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [note, setNote] = useState("");
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } =
    useZodFormErrors(receivePaymentSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { customerId, amount, method, note };

  function handleOpenChange(next: boolean) {
    if (next) {
      setAmount("");
      setMethod("CASH");
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
      await receivePayment(data);
      showToast("Payment recorded");
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
        <Button type="button" size="sm">
          Receive payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive payment</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-sm text-muted-foreground">Current balance: {currentBalance}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentAmount">Amount</Label>
            <Input
              id="paymentAmount"
              inputMode="decimal"
              placeholder="e.g. 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => validateField("amount", values)}
              disabled={submitting}
            />
            {fieldErrors.amount && <p className="text-xs text-destructive">{fieldErrors.amount}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <Select
              id="paymentMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
              disabled={submitting}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m] ?? m}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentNote">Note (optional)</Label>
            <Input
              id="paymentNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Record payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

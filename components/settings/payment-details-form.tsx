"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { paymentDetailsSchema } from "@/lib/validations/onboarding";
import { updatePaymentDetails } from "@/lib/actions/onboarding";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface PaymentDetailsFormProps {
  initialBankName: string;
  initialAccountTitle: string;
  initialAccountNumber: string;
  initialIban: string;
  initialJazzCashNumber: string;
  initialEasyPaisaNumber: string;
}

export function PaymentDetailsForm({
  initialBankName,
  initialAccountTitle,
  initialAccountNumber,
  initialIban,
  initialJazzCashNumber,
  initialEasyPaisaNumber,
}: PaymentDetailsFormProps) {
  const router = useRouter();
  const showToast = useToast();
  const [bankName, setBankName] = useState(initialBankName);
  const [accountTitle, setAccountTitle] = useState(initialAccountTitle);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [iban, setIban] = useState(initialIban);
  const [jazzCashNumber, setJazzCashNumber] = useState(initialJazzCashNumber);
  const [easyPaisaNumber, setEasyPaisaNumber] = useState(initialEasyPaisaNumber);
  const { fieldErrors, validateOnSubmit, validateField } = useZodFormErrors(paymentDetailsSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const values = { bankName, accountTitle, accountNumber, iban, jazzCashNumber, easyPaisaNumber };

  async function handleSave() {
    setSaved(false);
    setFormError(null);
    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);
    try {
      await updatePaymentDetails(data);
      setSaved(true);
      showToast("Payment details saved");
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex max-w-lg flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Payment details</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown on invoice and quotation PDFs so customers know where to send payment. All fields are optional —
          the block only appears on a PDF once at least one is filled in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentBankName">Bank name</Label>
          <Input
            id="paymentBankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            onBlur={() => validateField("bankName", values)}
            disabled={submitting}
          />
          {fieldErrors.bankName && <p className="text-xs text-destructive">{fieldErrors.bankName}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentAccountTitle">Account title</Label>
          <Input
            id="paymentAccountTitle"
            value={accountTitle}
            onChange={(e) => setAccountTitle(e.target.value)}
            onBlur={() => validateField("accountTitle", values)}
            disabled={submitting}
          />
          {fieldErrors.accountTitle && <p className="text-xs text-destructive">{fieldErrors.accountTitle}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentAccountNumber">Account number</Label>
          <Input
            id="paymentAccountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            onBlur={() => validateField("accountNumber", values)}
            disabled={submitting}
          />
          {fieldErrors.accountNumber && <p className="text-xs text-destructive">{fieldErrors.accountNumber}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentIban">IBAN</Label>
          <Input
            id="paymentIban"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            onBlur={() => validateField("iban", values)}
            disabled={submitting}
          />
          {fieldErrors.iban && <p className="text-xs text-destructive">{fieldErrors.iban}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentJazzCash">JazzCash number</Label>
          <Input
            id="paymentJazzCash"
            value={jazzCashNumber}
            onChange={(e) => setJazzCashNumber(e.target.value)}
            onBlur={() => validateField("jazzCashNumber", values)}
            disabled={submitting}
          />
          {fieldErrors.jazzCashNumber && <p className="text-xs text-destructive">{fieldErrors.jazzCashNumber}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentEasyPaisa">EasyPaisa number</Label>
          <Input
            id="paymentEasyPaisa"
            value={easyPaisaNumber}
            onChange={(e) => setEasyPaisaNumber(e.target.value)}
            onBlur={() => validateField("easyPaisaNumber", values)}
            disabled={submitting}
          />
          {fieldErrors.easyPaisaNumber && <p className="text-xs text-destructive">{fieldErrors.easyPaisaNumber}</p>}
        </div>
      </div>

      {formError && <p className="text-xs text-destructive">{formError}</p>}
      {saved && !formError && <p className="text-xs text-success">Saved.</p>}

      <Button onClick={handleSave} disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}

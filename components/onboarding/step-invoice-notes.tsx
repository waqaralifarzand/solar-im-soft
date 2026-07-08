"use client";

import { useState } from "react";
import { invoiceNotesSchema } from "@/lib/validations/onboarding";
import { updateInvoiceNotes, completeOnboarding } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { InvoiceNotesFields } from "@/components/branding/invoice-notes-fields";

interface StepInvoiceNotesProps {
  initialHeaderNote: string;
  initialFooterNote: string;
  onFinish: () => void;
}

export function StepInvoiceNotes({ initialHeaderNote, initialFooterNote, onFinish }: StepInvoiceNotesProps) {
  const [headerNote, setHeaderNote] = useState(initialHeaderNote);
  const [footerNote, setFooterNote] = useState(initialFooterNote);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSkip() {
    setSubmitting(true);
    try {
      await completeOnboarding();
      onFinish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    const result = invoiceNotesSchema.safeParse({ invoiceHeaderNote: headerNote, invoiceFooterNote: footerNote });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateInvoiceNotes(result.data);
      await completeOnboarding();
      onFinish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">Invoice notes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown at the top and bottom of every invoice. Optional.
        </p>
      </div>

      <InvoiceNotesFields
        headerNote={headerNote}
        footerNote={footerNote}
        onHeaderChange={setHeaderNote}
        onFooterChange={setFooterNote}
        disabled={submitting}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={handleSkip} disabled={submitting} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleFinish} disabled={submitting} className="flex-1">
          {submitting ? "Finishing…" : "Finish"}
        </Button>
      </div>
    </div>
  );
}

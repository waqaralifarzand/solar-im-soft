"use client";

import { useState } from "react";
import { CURRENCIES, taxCurrencySchema } from "@/lib/validations/onboarding";
import { updateTaxCurrency } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepTaxCurrencyProps {
  initialTaxRate: string;
  initialCurrency: string;
  initialLakhCroreFormat: boolean;
  onSkip: () => void;
  onContinue: () => void;
}

export function StepTaxCurrency({
  initialTaxRate,
  initialCurrency,
  initialLakhCroreFormat,
  onSkip,
  onContinue,
}: StepTaxCurrencyProps) {
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [currency, setCurrency] = useState(initialCurrency);
  const [lakhCroreFormat, setLakhCroreFormat] = useState(initialLakhCroreFormat);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    const result = taxCurrencySchema.safeParse({ taxRate, currency, lakhCroreFormat });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateTaxCurrency(result.data);
      onContinue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">Tax &amp; currency</h2>
        <p className="mt-1 text-sm text-muted-foreground">Used across invoices and reports. Optional.</p>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="taxRate">Tax rate (%)</Label>
          <Input
            id="taxRate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={submitting}
            className="flex h-10 w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={lakhCroreFormat}
          onChange={(e) => setLakhCroreFormat(e.target.checked)}
          disabled={submitting}
          className="h-4 w-4 rounded border-border accent-accent"
        />
        Use lakh/crore number formatting (1,23,456 instead of 123,456)
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onSkip} disabled={submitting} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleContinue} disabled={submitting} className="flex-1">
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES, taxCurrencySchema } from "@/lib/validations/onboarding";
import { updateTaxCurrency } from "@/lib/actions/onboarding";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaxCurrencyFormProps {
  initialTaxRate: string;
  initialCurrency: string;
  initialLakhCroreFormat: boolean;
}

export function TaxCurrencyForm({ initialTaxRate, initialCurrency, initialLakhCroreFormat }: TaxCurrencyFormProps) {
  const router = useRouter();
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [currency, setCurrency] = useState(initialCurrency);
  const [lakhCroreFormat, setLakhCroreFormat] = useState(initialLakhCroreFormat);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSaved(false);
    const result = taxCurrencySchema.safeParse({ taxRate, currency, lakhCroreFormat });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateTaxCurrency(result.data);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex max-w-lg flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="settingsTaxRate">Tax rate (%)</Label>
          <Input
            id="settingsTaxRate"
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
          <Label htmlFor="settingsCurrency">Currency</Label>
          <select
            id="settingsCurrency"
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
      {saved && !error && <p className="text-xs text-success">Saved.</p>}

      <Button onClick={handleSave} disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}

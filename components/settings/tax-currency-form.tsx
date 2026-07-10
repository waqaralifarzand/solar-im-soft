"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES, taxCurrencySchema } from "@/lib/validations/onboarding";
import { updateTaxCurrency } from "@/lib/actions/onboarding";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface TaxCurrencyFormProps {
  initialTaxRate: string;
  initialCurrency: string;
  initialLakhCroreFormat: boolean;
}

export function TaxCurrencyForm({ initialTaxRate, initialCurrency, initialLakhCroreFormat }: TaxCurrencyFormProps) {
  const router = useRouter();
  const showToast = useToast();
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [currency, setCurrency] = useState(initialCurrency);
  const [lakhCroreFormat, setLakhCroreFormat] = useState(initialLakhCroreFormat);
  const { fieldErrors, validateOnSubmit, validateField } = useZodFormErrors(taxCurrencySchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const values = { taxRate, currency, lakhCroreFormat };

  async function handleSave() {
    setSaved(false);
    setFormError(null);
    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);
    try {
      await updateTaxCurrency(data);
      setSaved(true);
      showToast("Settings saved");
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong");
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
            onBlur={() => validateField("taxRate", values)}
            disabled={submitting}
          />
          {fieldErrors.taxRate && <p className="text-xs text-destructive">{fieldErrors.taxRate}</p>}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="settingsCurrency">Currency</Label>
          <Select
            id="settingsCurrency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={submitting}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
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

      {formError && <p className="text-xs text-destructive">{formError}</p>}
      {saved && !formError && <p className="text-xs text-success">Saved.</p>}

      <Button onClick={handleSave} disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}

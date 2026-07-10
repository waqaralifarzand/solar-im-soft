"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseSchema, EXPENSE_CATEGORIES } from "@/lib/validations/expenses";
import { createExpense } from "@/lib/actions/expenses";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreateExpenseForm() {
  const router = useRouter();
  const showToast = useToast();
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(createExpenseSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { category, amount, date, note };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      await createExpense(data);
      setAmount("");
      setNote("");
      setDate(todayIsoDate());
      clearErrors();
      showToast("Expense added");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="expenseCategory">Category</Label>
          <Select
            id="expenseCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number])}
            disabled={submitting}
            className="w-40"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="expenseAmount">Amount</Label>
          <Input
            id="expenseAmount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => validateField("amount", values)}
            disabled={submitting}
            className="w-32"
          />
          {fieldErrors.amount && <p className="text-xs text-destructive">{fieldErrors.amount}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="expenseDate">Date</Label>
          <Input
            id="expenseDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            className="w-40"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="expenseNote">Note (optional)</Label>
          <Input id="expenseNote" value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add expense"}
        </Button>

        {formError && <p className="w-full text-xs text-destructive">{formError}</p>}
      </form>
    </Card>
  );
}

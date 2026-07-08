"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categorySchema } from "@/lib/validations/inventory";
import { createCategory } from "@/lib/actions/inventory";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(categorySchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { name };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      await createCategory(data);
      setName("");
      clearErrors();
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4" noValidate>
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="categoryName">Category name</Label>
          <Input
            id="categoryName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validateField("name", values)}
            disabled={submitting}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add category"}
        </Button>
        {formError && <p className="w-full text-xs text-destructive">{formError}</p>}
      </form>
    </Card>
  );
}

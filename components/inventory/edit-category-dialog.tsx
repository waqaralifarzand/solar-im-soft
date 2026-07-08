"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categorySchema } from "@/lib/validations/inventory";
import { updateCategory } from "@/lib/actions/inventory";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditCategoryDialogProps {
  categoryId: string;
  initialName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCategoryDialog({ categoryId, initialName, open, onOpenChange }: EditCategoryDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(categorySchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { name };

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initialName);
      clearErrors();
      setFormError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      await updateCategory(categoryId, data);
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editCategoryName">Category name</Label>
            <Input
              id="editCategoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name", values)}
              disabled={submitting}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

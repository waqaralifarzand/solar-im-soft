"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supplierSchema } from "@/lib/validations/suppliers";
import { updateSupplier } from "@/lib/actions/suppliers";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface EditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  initialValues: { name: string; phone: string; address: string };
}

export function EditSupplierDialog({
  open,
  onOpenChange,
  supplierId,
  initialValues,
}: EditSupplierDialogProps) {
  const router = useRouter();
  const showToast = useToast();
  const [name, setName] = useState(initialValues.name);
  const [phone, setPhone] = useState(initialValues.phone);
  const [address, setAddress] = useState(initialValues.address);
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } =
    useZodFormErrors(supplierSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { name, phone, address };

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initialValues.name);
      setPhone(initialValues.phone);
      setAddress(initialValues.address);
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
      await updateSupplier(supplierId, data);
      showToast("Supplier updated");
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
          <DialogTitle>Edit supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editSupplierName">Name</Label>
            <Input
              id="editSupplierName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name", values)}
              disabled={submitting}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="editSupplierPhone">Phone</Label>
            <Input
              id="editSupplierPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="editSupplierAddress">Address</Label>
            <Input
              id="editSupplierAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={submitting}
            />
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

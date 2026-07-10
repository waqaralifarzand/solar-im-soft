"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supplierSchema } from "@/lib/validations/suppliers";
import { createSupplier } from "@/lib/actions/suppliers";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export function CreateSupplierForm() {
  const router = useRouter();
  const showToast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } =
    useZodFormErrors(supplierSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values = { name, phone, address };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      await createSupplier(data);
      clearErrors();
      setName("");
      setPhone("");
      setAddress("");
      showToast("Supplier added");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-[16px] font-semibold text-foreground">Add supplier</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="supplierName">Name</Label>
            <Input
              id="supplierName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name", values)}
              disabled={submitting}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplierPhone">Phone</Label>
            <Input
              id="supplierPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplierAddress">Address</Label>
            <Input
              id="supplierAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add supplier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

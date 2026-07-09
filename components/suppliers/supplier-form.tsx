"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supplierSchema, type SupplierInput } from "@/lib/validations/customers";
import { createSupplier, updateSupplier } from "@/lib/actions/customers";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SupplierFormProps {
  mode: "create" | "edit";
  supplierId?: string;
  initialValues?: {
    name: string;
    phone: string;
    address: string;
  };
}

export function SupplierForm({ mode, supplierId, initialValues }: SupplierFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");

  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(supplierSchema);
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
      if (mode === "create") {
        await createSupplier(data as SupplierInput);
        clearErrors();
        router.push("/suppliers");
        router.refresh();
      } else if (supplierId) {
        await updateSupplier(supplierId, data as SupplierInput);
        clearErrors();
        router.refresh();
        router.push("/suppliers");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label htmlFor="supplierPhone">Phone (optional)</Label>
            <Input
              id="supplierPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="supplierAddress">Address (optional)</Label>
          <textarea
            id="supplierAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={submitting}
            rows={2}
            className={cn(
              "flex w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create supplier" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

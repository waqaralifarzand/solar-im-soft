"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  customerSchema,
  createCustomerSchema,
  type CustomerInput,
  type CreateCustomerInput,
} from "@/lib/validations/customers";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerFormProps {
  mode: "create" | "edit";
  customerId?: string;
  initialValues?: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
}

export function CustomerForm({ mode, customerId, initialValues }: CustomerFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [openingBalance, setOpeningBalance] = useState("0");

  const schema = mode === "create" ? createCustomerSchema : customerSchema;
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(schema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const values =
    mode === "create"
      ? { name, phone, email, address, openingBalance }
      : { name, phone, email, address };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      if (mode === "create") {
        const { id } = await createCustomer(data as CreateCustomerInput);
        clearErrors();
        router.push(`/customers/${id}`);
        router.refresh();
      } else if (customerId) {
        await updateCustomer(customerId, data as CustomerInput);
        clearErrors();
        router.refresh();
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
            <Label htmlFor="customerName">Name</Label>
            <Input
              id="customerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name", values)}
              disabled={submitting}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
            {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateField("email", values)}
              disabled={submitting}
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerOpeningBalance">Opening balance</Label>
              <Input
                id="customerOpeningBalance"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                onBlur={() => validateField("openingBalance", values)}
                disabled={submitting}
              />
              {fieldErrors.openingBalance && (
                <p className="text-xs text-destructive">{fieldErrors.openingBalance}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="customerAddress">Address</Label>
          <Input
            id="customerAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.address && <p className="text-xs text-destructive">{fieldErrors.address}</p>}
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

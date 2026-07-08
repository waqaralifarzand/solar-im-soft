"use client";

import { useState } from "react";
import Link from "next/link";
import { createCompanySchema } from "@/lib/validations/super-admin";
import { createCompany } from "@/lib/actions/super-admin";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RevealPasswordDialog } from "@/components/ui/reveal-password-dialog";

export function CreateCompanyForm() {
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const { fieldErrors, validateOnSubmit, validateField } = useZodFormErrors(createCompanySchema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const values = { companyName, adminName, adminEmail };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      const { tempPassword } = await createCompany(data);
      setCreated({ email: data.adminEmail, tempPassword });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={() => validateField("companyName", values)}
              disabled={submitting}
            />
            {fieldErrors.companyName && (
              <p className="text-xs text-destructive">{fieldErrors.companyName}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adminName">Admin name</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              onBlur={() => validateField("adminName", values)}
              disabled={submitting}
            />
            {fieldErrors.adminName && <p className="text-xs text-destructive">{fieldErrors.adminName}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adminEmail">Admin email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              onBlur={() => validateField("adminEmail", values)}
              disabled={submitting}
            />
            {fieldErrors.adminEmail && <p className="text-xs text-destructive">{fieldErrors.adminEmail}</p>}
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" size="page" disabled={submitting} className="mt-2">
            {submitting ? "Creating…" : "Create company"}
          </Button>
        </form>
      </Card>

      <RevealPasswordDialog
        open={!!created}
        onOpenChange={(open) => {
          if (!open && created) {
            window.location.href = "/super/companies";
          }
        }}
        email={created?.email ?? ""}
        tempPassword={created?.tempPassword ?? ""}
        title="Company created"
      />
      {created && (
        <p className="mt-4 max-w-lg text-sm text-muted-foreground">
          Close the dialog above (or{" "}
          <Link href="/super/companies" className="underline">
            go to companies
          </Link>
          ) once you&apos;ve saved the password — it won&apos;t be shown again.
        </p>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompanyUserSchema } from "@/lib/validations/settings-users";
import { createCompanyUser } from "@/lib/actions/settings-users";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RevealPasswordDialog } from "@/components/ui/reveal-password-dialog";

export function CreateUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MANAGER" | "CASHIER">("MANAGER");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = createCompanyUserSchema.safeParse({ name, email, role });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const { tempPassword } = await createCompanyUser(result.data);
      setCreated({ email: result.data.email, tempPassword });
      setName("");
      setEmail("");
      setRole("MANAGER");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4" noValidate>
          <div className="flex min-w-[160px] flex-1 flex-col gap-2">
            <Label htmlFor="userName">Name</Label>
            <Input id="userName" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <Label htmlFor="userEmail">Email</Label>
            <Input
              id="userEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="userRole">Role</Label>
            <select
              id="userRole"
              value={role}
              onChange={(e) => setRole(e.target.value as "MANAGER" | "CASHIER")}
              disabled={submitting}
              className="flex h-10 rounded-input border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier</option>
            </select>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create user"}
          </Button>
          {formError && <p className="w-full text-xs text-destructive">{formError}</p>}
        </form>
      </Card>

      <RevealPasswordDialog
        open={!!created}
        onOpenChange={(open) => !open && setCreated(null)}
        email={created?.email ?? ""}
        tempPassword={created?.tempPassword ?? ""}
        title="User created"
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { changePasswordSchema } from "@/lib/validations/account";
import { changePassword } from "@/lib/actions/account";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setFieldErrors({});
    setFormError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = changePasswordSchema.safeParse({ currentPassword, newPassword });
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
      await changePassword(result.data);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Update the password for your own account.</DialogDescription>
        </DialogHeader>

        {success ? (
          <p className="text-sm text-success">Password updated.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.currentPassword && (
                <p className="text-xs text-destructive">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.newPassword && <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>}
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

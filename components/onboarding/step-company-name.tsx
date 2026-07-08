"use client";

import { useState } from "react";
import { companyNameSchema } from "@/lib/validations/onboarding";
import { updateCompanyName } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StepCompanyName({
  initialName,
  onContinue,
}: {
  initialName: string;
  onContinue: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    const result = companyNameSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateCompanyName(result.data);
      onContinue(result.data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
          What&apos;s your company called?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">This appears on your invoices and in the sidebar.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="onboardingCompanyName">Company name</Label>
        <Input
          id="onboardingCompanyName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button onClick={handleContinue} disabled={submitting} size="page" className="mt-2">
        {submitting ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}

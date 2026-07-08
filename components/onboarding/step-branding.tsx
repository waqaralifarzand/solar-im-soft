"use client";

import { useState } from "react";
import { brandingSchema } from "@/lib/validations/onboarding";
import { updateBranding } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { LogoUploadField } from "@/components/branding/logo-upload-field";
import { AccentColorField } from "@/components/branding/accent-color-field";
import { BrandingPreviewCard } from "@/components/branding/branding-preview-card";

interface StepBrandingProps {
  companyName: string;
  initialLogoUrl: string | null;
  initialAccentColor: string;
  onSkip: () => void;
  onContinue: () => void;
}

export function StepBranding({
  companyName,
  initialLogoUrl,
  initialAccentColor,
  onSkip,
  onContinue,
}: StepBrandingProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    const result = brandingSchema.safeParse({ accentColor, logoUrl });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateBranding(result.data);
      onContinue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">Make it yours</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a logo and pick an accent color. Optional.</p>
      </div>

      <LogoUploadField
        value={logoUrl}
        onChange={setLogoUrl}
        companyInitial={companyName.charAt(0).toUpperCase() || "?"}
        disabled={submitting}
      />
      <AccentColorField value={accentColor} onChange={setAccentColor} disabled={submitting} />
      <BrandingPreviewCard companyName={companyName} logoDataUrl={logoUrl} accentColor={accentColor} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onSkip} disabled={submitting} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleContinue} disabled={submitting} className="flex-1">
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

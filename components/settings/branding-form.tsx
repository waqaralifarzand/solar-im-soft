"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brandingSchema, invoiceNotesSchema } from "@/lib/validations/onboarding";
import { updateBranding, updateInvoiceNotes } from "@/lib/actions/onboarding";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoUploadField } from "@/components/branding/logo-upload-field";
import { AccentColorField } from "@/components/branding/accent-color-field";
import { BrandingPreviewCard } from "@/components/branding/branding-preview-card";
import { InvoiceNotesFields } from "@/components/branding/invoice-notes-fields";

interface BrandingFormProps {
  companyName: string;
  initialLogoUrl: string | null;
  initialAccentColor: string;
  initialHeaderNote: string;
  initialFooterNote: string;
}

export function BrandingForm({
  companyName,
  initialLogoUrl,
  initialAccentColor,
  initialHeaderNote,
  initialFooterNote,
}: BrandingFormProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const [headerNote, setHeaderNote] = useState(initialHeaderNote);
  const [footerNote, setFooterNote] = useState(initialFooterNote);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSaved(false);
    const brandingResult = brandingSchema.safeParse({ accentColor, logoUrl });
    if (!brandingResult.success) {
      setError(brandingResult.error.issues[0].message);
      return;
    }
    const notesResult = invoiceNotesSchema.safeParse({
      invoiceHeaderNote: headerNote,
      invoiceFooterNote: footerNote,
    });
    if (!notesResult.success) {
      setError(notesResult.error.issues[0].message);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await Promise.all([updateBranding(brandingResult.data), updateInvoiceNotes(notesResult.data)]);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <Card className="flex flex-col gap-6">
        <LogoUploadField
          value={logoUrl}
          onChange={setLogoUrl}
          companyInitial={companyName.charAt(0).toUpperCase() || "?"}
          disabled={submitting}
        />
        <AccentColorField value={accentColor} onChange={setAccentColor} disabled={submitting} />
        <InvoiceNotesFields
          headerNote={headerNote}
          footerNote={footerNote}
          onHeaderChange={setHeaderNote}
          onFooterChange={setFooterNote}
          disabled={submitting}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}
        {saved && !error && <p className="text-xs text-success">Saved.</p>}

        <Button onClick={handleSave} disabled={submitting} className="self-start">
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </Card>

      <BrandingPreviewCard companyName={companyName} logoDataUrl={logoUrl} accentColor={accentColor} />
    </div>
  );
}

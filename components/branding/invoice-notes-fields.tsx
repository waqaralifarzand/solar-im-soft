"use client";

import { Label } from "@/components/ui/label";

interface InvoiceNotesFieldsProps {
  headerNote: string;
  footerNote: string;
  onHeaderChange: (value: string) => void;
  onFooterChange: (value: string) => void;
  headerError?: string;
  footerError?: string;
  disabled?: boolean;
}

export function InvoiceNotesFields({
  headerNote,
  footerNote,
  onHeaderChange,
  onFooterChange,
  headerError,
  footerError,
  disabled,
}: InvoiceNotesFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="invoiceHeaderNote">Invoice header note</Label>
        <textarea
          id="invoiceHeaderNote"
          value={headerNote}
          onChange={(e) => onHeaderChange(e.target.value)}
          disabled={disabled}
          rows={2}
          className="flex w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="e.g. Thank you for choosing us."
        />
        {headerError && <p className="text-xs text-destructive">{headerError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="invoiceFooterNote">Invoice footer note</Label>
        <textarea
          id="invoiceFooterNote"
          value={footerNote}
          onChange={(e) => onFooterChange(e.target.value)}
          disabled={disabled}
          rows={2}
          className="flex w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="e.g. Warranty terms apply per manufacturer policy."
        />
        {footerError && <p className="text-xs text-destructive">{footerError}</p>}
      </div>
    </div>
  );
}

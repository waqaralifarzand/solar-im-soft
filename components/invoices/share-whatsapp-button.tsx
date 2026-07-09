"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { generateInvoiceShareLink } from "@/lib/actions/invoice-share";
import { Button } from "@/components/ui/button";

export function ShareWhatsAppButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const { whatsappUrl } = await generateInvoiceShareLink(invoiceId);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" size="sm" onClick={handleClick} disabled={loading}>
        <Share2 size={14} className="mr-1.5" />
        {loading ? "Preparing…" : "Share on WhatsApp"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

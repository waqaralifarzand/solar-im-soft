"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReturn } from "@/lib/actions/returns";
import type { ReturnableLine } from "@/lib/queries/returns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateReturnDialogProps {
  invoiceId: string;
  returnableLines: ReturnableLine[];
}

export function CreateReturnDialog({ invoiceId, returnableLines }: CreateReturnDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const eligibleLines = returnableLines.filter((l) => l.returnableQty > 0);

  function handleOpenChange(next: boolean) {
    if (next) {
      setQtyByProduct({});
      setRestock(true);
      setNote("");
      setFormError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const items = eligibleLines
      .map((l) => ({ productId: l.productId, qty: Number(qtyByProduct[l.productId]) || 0 }))
      .filter((i) => i.qty > 0);

    if (items.length === 0) {
      setFormError("Enter a quantity to return for at least one item");
      return;
    }

    setSubmitting(true);
    try {
      await createReturn({ invoiceId, items, restock, note });
      router.refresh();
      setOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (eligibleLines.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          Return items
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return items</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-3">
            {eligibleLines.map((line) => (
              <div key={line.productId} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.sku} · sold {line.soldQty}, returned {line.returnedQty}, up to {line.returnableQty} left
                  </p>
                </div>
                <Input
                  inputMode="numeric"
                  value={qtyByProduct[line.productId] ?? ""}
                  onChange={(e) => setQtyByProduct((prev) => ({ ...prev, [line.productId]: e.target.value }))}
                  placeholder="0"
                  disabled={submitting}
                  className="h-9 w-20 text-right"
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Restock these items
          </label>

          <div className="flex flex-col gap-2">
            <Label htmlFor="returnNote">Note (optional)</Label>
            <Input id="returnNote" value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Record return"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

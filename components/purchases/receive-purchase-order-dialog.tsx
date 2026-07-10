"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { receivePurchaseOrder } from "@/lib/actions/purchases";
import type { PurchaseOrderDetail } from "@/lib/queries/purchases";
import { formatMoney } from "@/lib/formatMoney";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ReceivePurchaseOrderDialogProps {
  po: PurchaseOrderDetail;
  currency: string;
  lakhCroreFormat: boolean;
}

export function ReceivePurchaseOrderDialog({ po, currency, lakhCroreFormat }: ReceivePurchaseOrderDialogProps) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [updateCostFor, setUpdateCostFor] = useState<Set<string>>(new Set(po.items.map((i) => i.productId)));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(productId: string) {
    setUpdateCostFor((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await receivePurchaseOrder(po.id, { updateCostPriceProductIds: [...updateCostFor] });
      showToast(`${po.poNo} received`);
      router.refresh();
      setOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Receive</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive {po.poNo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Adds each item&apos;s quantity to stock. Check &ldquo;Update cost price&rdquo; to also set the
            product&apos;s cost price to this PO&apos;s unit cost.
          </p>
          <div className="flex flex-col gap-3">
            {po.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.productSku} · qty {item.qty} @ {formatMoney(item.unitCost, { currency, lakhCroreFormat })}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={updateCostFor.has(item.productId)}
                    onChange={() => toggle(item.productId)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  Update cost price
                </label>
              </div>
            ))}
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Receiving…" : "Confirm receive"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

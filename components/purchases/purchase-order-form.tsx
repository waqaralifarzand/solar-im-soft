"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createPurchaseOrderSchema } from "@/lib/validations/purchases";
import { createPurchaseOrder } from "@/lib/actions/purchases";
import { formatMoney } from "@/lib/formatMoney";
import type { ProductRow } from "@/lib/queries/inventory";
import type { SupplierRow } from "@/lib/queries/suppliers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  qty: string;
  unitCost: string;
}

interface PurchaseOrderFormProps {
  products: ProductRow[];
  suppliers: SupplierRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function PurchaseOrderForm({ products, suppliers, currency, lakhCroreFormat }: PurchaseOrderFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
      .slice(0, 6);
  }, [products, query]);

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0),
    [cart],
  );

  function addProduct(product: ProductRow) {
    setCart((prev) => {
      if (prev.some((l) => l.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, sku: product.sku, qty: "1", unitCost: product.costPrice }];
    });
    setQuery("");
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (cart.length === 0) {
      setFormError("Add at least one item");
      return;
    }

    const items = cart.map((l) => ({
      productId: l.productId,
      qty: Number(l.qty) || 0,
      unitCost: Number(l.unitCost) || 0,
    }));

    const parsed = createPurchaseOrderSchema.safeParse({ supplierId, items });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the form for errors");
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createPurchaseOrder(parsed.data);
      router.push(`/purchases/${id}`);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="poSupplier">Supplier</Label>
          <Select id="poSupplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.phone ? ` — ${s.phone}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="poProductSearch">Add product</Label>
          <div className="relative">
            <Input
              id="poProductSearch"
              placeholder="Search product name or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {matches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-input border border-border bg-card shadow-lg">
                {matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    <span>
                      {p.name} <span className="text-muted-foreground">({p.sku})</span>
                    </span>
                    <span className="text-muted-foreground">
                      Cost {formatMoney(p.costPrice, { currency, lakhCroreFormat })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Product</th>
                  <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Unit cost</th>
                  <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Line total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.productId} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{line.name}</div>
                      <div className="text-xs text-muted-foreground">{line.sku}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        inputMode="numeric"
                        value={line.qty}
                        onChange={(e) => updateLine(line.productId, { qty: e.target.value })}
                        className="h-8 w-16 px-2"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        inputMode="decimal"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.productId, { unitCost: e.target.value })}
                        className="h-8 w-24 px-2"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatMoney((Number(line.qty) || 0) * (Number(line.unitCost) || 0), { currency, lakhCroreFormat })}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(line.productId)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${line.name}`}
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
          <span>Total</span>
          <span>{formatMoney(total, { currency, lakhCroreFormat })}</span>
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <Button type="submit" size="page" disabled={submitting}>
          {submitting ? "Creating…" : "Create purchase order"}
        </Button>
      </Card>
    </form>
  );
}

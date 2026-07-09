"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShoppingCart } from "lucide-react";
import { createInvoiceSchema, PAYMENT_METHODS } from "@/lib/validations/invoices";
import { createInvoice } from "@/lib/actions/invoices";
import { computeInvoiceTotals } from "@/lib/invoiceCalc";
import { formatMoney } from "@/lib/formatMoney";
import type { PosProduct, CustomerOption } from "@/lib/queries/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  stockQty: number;
  qty: string;
  unitPrice: string;
  lineDiscount: string;
}

interface PosScreenProps {
  products: PosProduct[];
  customers: CustomerOption[];
  taxRate: string;
  currency: string;
  lakhCroreFormat: boolean;
}

export function PosScreen({ products, customers, taxRate, currency, lakhCroreFormat }: PosScreenProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [billDiscount, setBillDiscount] = useState("0");
  const [amountPaidNow, setAmountPaidNow] = useState("0");
  const [paidTouched, setPaidTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const taxRatePercent = Number(taxRate) || 0;

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.toLowerCase().includes(term)),
      )
      .slice(0, 12);
  }, [products, query]);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        cart.map((l) => ({ qty: Number(l.qty) || 0, unitPrice: Number(l.unitPrice) || 0, lineDiscount: Number(l.lineDiscount) || 0 })),
        Number(billDiscount) || 0,
        taxRatePercent,
      ),
    [cart, billDiscount, taxRatePercent],
  );

  useEffect(() => {
    if (!paidTouched) setAmountPaidNow(totals.total.toFixed(2));
  }, [totals.total, paidTouched]);

  function addToCart(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          stockQty: product.stockQty,
          qty: "1",
          unitPrice: product.salePrice,
          lineDiscount: "0",
        },
      ];
    });
    setQuery("");
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && filteredProducts.length > 0) {
      e.preventDefault();
      addToCart(filteredProducts[0]);
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (cart.length === 0) {
      setFormError("Add at least one item to the cart");
      return;
    }

    const items = cart.map((l) => ({
      productId: l.productId,
      qty: Number(l.qty) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      lineDiscount: Number(l.lineDiscount) || 0,
    }));
    const paidNow = Number(amountPaidNow) || 0;

    const parsed = createInvoiceSchema.safeParse({
      type: "POS",
      customerId,
      items,
      billDiscount: Number(billDiscount) || 0,
      amountPaidNow: paidNow,
      paymentMethod: paidNow > 0 ? paymentMethod : undefined,
      note,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the form for errors");
      return;
    }
    if (!customerId && paidNow < totals.total) {
      setFormError("Walk-in sales must be paid in full — attach a customer for credit/partial sales");
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createInvoice(parsed.data);
      router.push(`/invoices/${id}`);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      {/* Left: search-first product picker */}
      <div className="flex min-h-0 flex-col gap-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            placeholder="Search product name, SKU, or barcode… (Enter to add)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
        </div>
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addToCart(p)}
              disabled={p.stockQty <= 0}
              className={cn(
                "flex flex-col items-start gap-1 rounded-[12px] border border-border bg-card p-3 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <span className="text-sm font-medium text-foreground">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.sku}</span>
              <div className="mt-1 flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(p.salePrice, { currency, lakhCroreFormat })}
                </span>
                <span className={cn("text-xs", p.stockQty <= 0 ? "text-destructive" : "text-muted-foreground")}>
                  {p.stockQty} {p.unit}
                </span>
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-card border border-border bg-card py-10 text-sm text-muted-foreground">
              No matching products
            </div>
          )}
        </div>
      </div>

      {/* Right: cart + payment, sticky totals footer */}
      <div className="flex min-h-0 flex-col rounded-card border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShoppingCart size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Cart ({cart.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Search and add products to start a sale</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((line) => (
                <div key={line.productId} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{line.name}</p>
                      <p className="text-xs text-muted-foreground">{line.sku}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.productId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${line.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`qty-${line.productId}`} className="text-[11px]">Qty</Label>
                      <Input
                        id={`qty-${line.productId}`}
                        inputMode="numeric"
                        value={line.qty}
                        onChange={(e) => updateLine(line.productId, { qty: e.target.value })}
                        className="h-8 px-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`price-${line.productId}`} className="text-[11px]">Price</Label>
                      <Input
                        id={`price-${line.productId}`}
                        inputMode="decimal"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.productId, { unitPrice: e.target.value })}
                        className="h-8 px-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`discount-${line.productId}`} className="text-[11px]">Discount</Label>
                      <Input
                        id={`discount-${line.productId}`}
                        inputMode="decimal"
                        value={line.lineDiscount}
                        onChange={(e) => updateLine(line.productId, { lineDiscount: e.target.value })}
                        className="h-8 px-2 text-sm"
                      />
                    </div>
                  </div>
                  {Number(line.qty) > line.stockQty && (
                    <p className="text-xs text-destructive">Only {line.stockQty} {line.unit} in stock</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="posCustomer">Customer</Label>
            <Select id="posCustomer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in / cash sale</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="posBillDiscount" className="text-[11px]">Bill discount</Label>
              <Input
                id="posBillDiscount"
                inputMode="decimal"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
                className="h-8 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px]">Tax ({taxRatePercent}%)</Label>
              <div className="flex h-8 items-center px-2 text-sm text-muted-foreground">
                {formatMoney(totals.taxAmount, { currency, lakhCroreFormat })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatMoney(totals.total, { currency, lakhCroreFormat })}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="posAmountPaid" className="text-[11px]">Amount paid now</Label>
              <Input
                id="posAmountPaid"
                inputMode="decimal"
                value={amountPaidNow}
                onChange={(e) => {
                  setAmountPaidNow(e.target.value);
                  setPaidTouched(true);
                }}
                className="h-8 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px]">Method</Label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
                className="h-8 px-2 text-sm"
                disabled={Number(amountPaidNow) <= 0}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m] ?? m}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="posNote" className="text-[11px]">Note (optional)</Label>
            <Input id="posNote" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 px-2 text-sm" />
          </div>

          {Number(amountPaidNow) < totals.total && (
            <p className="text-xs text-muted-foreground">
              Remaining {formatMoney(totals.total - (Number(amountPaidNow) || 0), { currency, lakhCroreFormat })} will be added to the customer&apos;s ledger.
            </p>
          )}

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="button" size="page" className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Completing sale…" : `Complete sale — ${formatMoney(totals.total, { currency, lakhCroreFormat })}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

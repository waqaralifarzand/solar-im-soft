"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createInvoiceSchema, PAYMENT_METHODS } from "@/lib/validations/invoices";
import { createInvoice } from "@/lib/actions/invoices";
import { computeInvoiceTotals } from "@/lib/invoiceCalc";
import { formatMoney } from "@/lib/formatMoney";
import type { PosProduct, CustomerOption } from "@/lib/queries/invoices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
  qty: string;
  unitPrice: string;
  lineDiscount: string;
}

interface InvoiceFormProps {
  products: PosProduct[];
  customers: CustomerOption[];
  taxRate: string;
  currency: string;
  lakhCroreFormat: boolean;
}

export function InvoiceForm({ products, customers, taxRate, currency, lakhCroreFormat }: InvoiceFormProps) {
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

  const taxRatePercent = Number(taxRate) || 0;

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
      .slice(0, 6);
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

  function addProduct(product: PosProduct) {
    setCart((prev) => {
      if (prev.some((l) => l.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, sku: product.sku, qty: "1", unitPrice: product.salePrice, lineDiscount: "0" }];
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
      unitPrice: Number(l.unitPrice) || 0,
      lineDiscount: Number(l.lineDiscount) || 0,
    }));
    const paidNow = Number(amountPaidNow) || 0;

    const parsed = createInvoiceSchema.safeParse({
      type: "STANDARD",
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
      setFormError("Walk-in invoices must be paid in full — attach a customer for credit/partial sales");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invoiceCustomer">Customer</Label>
          <Select id="invoiceCustomer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in / cash sale</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` — ${c.phone}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invoiceProductSearch">Add product</Label>
          <div className="relative">
            <Input
              id="invoiceProductSearch"
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
                    <span className="text-muted-foreground">{formatMoney(p.salePrice, { currency, lakhCroreFormat })}</span>
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
                  <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Price</th>
                  <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Discount</th>
                  <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Line total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {cart.map((line, idx) => (
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
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.productId, { unitPrice: e.target.value })}
                        className="h-8 w-24 px-2"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        inputMode="decimal"
                        value={line.lineDiscount}
                        onChange={(e) => updateLine(line.productId, { lineDiscount: e.target.value })}
                        className="h-8 w-24 px-2"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatMoney(totals.lineTotals[idx] ?? 0, { currency, lakhCroreFormat })}
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
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoiceBillDiscount">Bill discount</Label>
            <Input id="invoiceBillDiscount" inputMode="decimal" value={billDiscount} onChange={(e) => setBillDiscount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tax ({taxRatePercent}%)</Label>
            <div className="flex h-10 items-center text-sm text-muted-foreground">
              {formatMoney(totals.taxAmount, { currency, lakhCroreFormat })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoiceAmountPaid">Amount paid now</Label>
            <Input
              id="invoiceAmountPaid"
              inputMode="decimal"
              value={amountPaidNow}
              onChange={(e) => {
                setAmountPaidNow(e.target.value);
                setPaidTouched(true);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoicePaymentMethod">Payment method</Label>
            <Select
              id="invoicePaymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="invoiceNote">Note (optional)</Label>
          <Input id="invoiceNote" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
          <span>Total</span>
          <span>{formatMoney(totals.total, { currency, lakhCroreFormat })}</span>
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <Button type="submit" size="page" disabled={submitting}>
          {submitting ? "Creating…" : "Create invoice"}
        </Button>
      </Card>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  productSchema,
  createProductSchema,
  type ProductInput,
  type CreateProductInput,
} from "@/lib/validations/inventory";
import { createProduct, updateProduct, suggestSkuAction } from "@/lib/actions/inventory";
import { useZodFormErrors } from "@/lib/useZodFormErrors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ProductFormProps {
  categories: { id: string; name: string }[];
  mode: "create" | "edit";
  productId?: string;
  initialValues?: {
    name: string;
    sku: string;
    barcode: string;
    categoryId: string;
    description: string;
    unit: string;
    costPrice: string;
    salePrice: string;
    reorderLevel: string;
  };
}

export function ProductForm({ categories, mode, productId, initialValues }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [sku, setSku] = useState(initialValues?.sku ?? "");
  const [skuTouched, setSkuTouched] = useState(mode === "edit");
  const [barcode, setBarcode] = useState(initialValues?.barcode ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [unit, setUnit] = useState(initialValues?.unit ?? "pcs");
  const [costPrice, setCostPrice] = useState(initialValues?.costPrice ?? "");
  const [salePrice, setSalePrice] = useState(initialValues?.salePrice ?? "");
  const [reorderLevel, setReorderLevel] = useState(initialValues?.reorderLevel ?? "5");
  const [openingStockQty, setOpeningStockQty] = useState("0");
  const [suggesting, setSuggesting] = useState(false);

  const schema = mode === "create" ? createProductSchema : productSchema;
  const { fieldErrors, validateOnSubmit, validateField, clearErrors } = useZodFormErrors(schema);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const skuRequestId = useRef(0);

  useEffect(() => {
    if (mode !== "create" || skuTouched) return;
    const requestId = ++skuRequestId.current;
    suggestSkuAction(categoryId || null)
      .then((suggested) => {
        if (skuRequestId.current === requestId) setSku(suggested);
      })
      .catch(() => {
        // best-effort suggestion only; leave the field as-is on failure
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, mode]);

  const values =
    mode === "create"
      ? { name, sku, barcode, categoryId, description, unit, costPrice, salePrice, reorderLevel, openingStockQty }
      : { name, sku, barcode, categoryId, description, unit, costPrice, salePrice, reorderLevel };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const data = validateOnSubmit(values);
    if (!data) return;
    setSubmitting(true);

    try {
      if (mode === "create") {
        const { id } = await createProduct(data as CreateProductInput);
        clearErrors();
        router.push(`/inventory/${id}`);
        router.refresh();
      } else if (productId) {
        await updateProduct(productId, data as ProductInput);
        clearErrors();
        router.refresh();
        router.push("/inventory");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="productName">Name</Label>
            <Input
              id="productName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name", values)}
              disabled={submitting}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productCategory">Category</Label>
            <Select
              id="productCategory"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={submitting}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productSku">SKU</Label>
            <div className="flex gap-2">
              <Input
                id="productSku"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setSkuTouched(true);
                }}
                onBlur={() => validateField("sku", values)}
                disabled={submitting}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={submitting || suggesting}
                onClick={async () => {
                  setSuggesting(true);
                  try {
                    setSku(await suggestSkuAction(categoryId || null));
                    setSkuTouched(false);
                  } finally {
                    setSuggesting(false);
                  }
                }}
                title="Suggest SKU"
              >
                <Sparkles size={14} />
              </Button>
            </div>
            {fieldErrors.sku && <p className="text-xs text-destructive">{fieldErrors.sku}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productBarcode">Barcode (optional)</Label>
            <Input
              id="productBarcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productUnit">Unit</Label>
            <Input
              id="productUnit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              onBlur={() => validateField("unit", values)}
              disabled={submitting}
              placeholder="pcs, set, meter, kW…"
            />
            {fieldErrors.unit && <p className="text-xs text-destructive">{fieldErrors.unit}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productCostPrice">Cost price</Label>
            <Input
              id="productCostPrice"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              onBlur={() => validateField("costPrice", values)}
              disabled={submitting}
            />
            {fieldErrors.costPrice && <p className="text-xs text-destructive">{fieldErrors.costPrice}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productSalePrice">Sale price</Label>
            <Input
              id="productSalePrice"
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              onBlur={() => validateField("salePrice", values)}
              disabled={submitting}
            />
            {fieldErrors.salePrice && <p className="text-xs text-destructive">{fieldErrors.salePrice}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productReorderLevel">Reorder level</Label>
            <Input
              id="productReorderLevel"
              inputMode="numeric"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              onBlur={() => validateField("reorderLevel", values)}
              disabled={submitting}
            />
            {fieldErrors.reorderLevel && <p className="text-xs text-destructive">{fieldErrors.reorderLevel}</p>}
          </div>

          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="productOpeningStock">Opening stock</Label>
              <Input
                id="productOpeningStock"
                inputMode="numeric"
                value={openingStockQty}
                onChange={(e) => setOpeningStockQty(e.target.value)}
                onBlur={() => validateField("openingStockQty", values)}
                disabled={submitting}
              />
              {fieldErrors.openingStockQty && (
                <p className="text-xs text-destructive">{fieldErrors.openingStockQty}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="productDescription">Description (optional)</Label>
          <textarea
            id="productDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
            className={cn(
              "flex w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { getProductDetail, listCategories } from "@/lib/queries/inventory";
import { ProductForm } from "@/components/inventory/product-form";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { ProductAdjustmentHistory } from "@/components/inventory/product-adjustment-history";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const [detail, categories] = await Promise.all([
    getProductDetail(ctx.companyId, params.id),
    listCategories(ctx.companyId),
  ]);

  if (!detail) notFound();
  const { product, adjustments } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SKU {product.sku} · Stock: {product.stockQty}
          </p>
        </div>
        <StockAdjustmentDialog productId={product.id} currentStockQty={product.stockQty} />
      </div>

      <ProductForm
        categories={categories}
        mode="edit"
        productId={product.id}
        initialValues={{
          name: product.name,
          sku: product.sku,
          barcode: product.barcode ?? "",
          categoryId: product.categoryId ?? "",
          description: product.description ?? "",
          unit: product.unit,
          costPrice: product.costPrice.toString(),
          salePrice: product.salePrice.toString(),
          reorderLevel: product.reorderLevel.toString(),
        }}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-foreground">Adjustment history</h2>
        <ProductAdjustmentHistory adjustments={adjustments} />
      </div>
    </div>
  );
}

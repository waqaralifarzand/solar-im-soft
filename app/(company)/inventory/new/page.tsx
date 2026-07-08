import { getTenantContext } from "@/lib/getTenantContext";
import { listCategories } from "@/lib/queries/inventory";
import { ProductForm } from "@/components/inventory/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const ctx = await getTenantContext();
  const categories = await listCategories(ctx.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a product to inventory.</p>
      </div>
      <ProductForm categories={categories} mode="create" />
    </div>
  );
}

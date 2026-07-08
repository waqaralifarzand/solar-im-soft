import { getTenantContext } from "@/lib/getTenantContext";
import { listCategories } from "@/lib/queries/inventory";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { CreateCategoryForm } from "@/components/inventory/create-category-form";
import { CategoriesTable } from "@/components/inventory/categories-table";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const ctx = await getTenantContext();
  const categories = await listCategories(ctx.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Categories, products, and stock adjustments.</p>
      </div>
      <InventoryTabs />
      <CreateCategoryForm />
      <CategoriesTable categories={categories} />
    </div>
  );
}
